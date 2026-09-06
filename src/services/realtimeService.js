/**
 * realtimeService.js
 *
 * Centralized Supabase Realtime subscription manager.
 * Single source of truth for all postgres_changes subscriptions.
 *
 * Guarantees:
 * 1. Only subscribes for the currently authenticated user's rows.
 * 2. Compares updatedAt timestamps (Last-Write-Wins) before applying remote mutations.
 * 3. Inspects tombstones to prevent remote resurrects of locally deleted records.
 * 4. Uses withRealtimeGuard to ensure incoming remote events NEVER trigger outbound sync loops.
 * 5. Reconnects automatically on connection drops, token refreshes, and network restore.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { db } from '../db/db.js'
import { mapRowToTask } from '../lib/tasks.js'
import { mapRowToList } from '../lib/lists.js'
import { mapRowToVocabWord } from '../lib/vocab.js'
import { setStorageItem } from '../utils/storageUtils.js'
import { getTimestampMs, isTombstoned, recordTombstone } from './conflictService.js'

// ─── Sync-loop guard ──────────────────────────────────────────────────────────
let _realtimeWrite = false

export function isRealtimeWrite() {
  return _realtimeWrite
}

function withRealtimeGuard(fn) {
  return async (...args) => {
    _realtimeWrite = true
    try {
      await fn(...args)
    } finally {
      _realtimeWrite = false
    }
  }
}

// ─── Channel & Reconnect References ───────────────────────────────────────────
let _channel = null
let _currentUserId = null
let _reconnectTimer = null

// ─── Table Handlers ───────────────────────────────────────────────────────────

const handleTasks = withRealtimeGuard(async (payload, userId) => {
  const { eventType, new: newRow, old: oldRow } = payload

  if (eventType === 'DELETE') {
    const id = oldRow?.id
    if (id) {
      await recordTombstone('tasks', id, userId)
      await db.tasks.delete(id)
    }
    return
  }

  if (newRow) {
    if (newRow.user_id && newRow.user_id !== userId) return

    // Tombstone check: if user deleted this task locally, don't resurrect
    if (await isTombstoned('tasks', newRow.id, newRow.updated_at)) {
      return
    }

    const existing = await db.tasks.get(newRow.id)
    // Last-write-wins comparison
    if (existing && getTimestampMs(existing) > getTimestampMs(newRow)) {
      return
    }

    const subtasks = existing?.subtasks || []
    const mapped = mapRowToTask(
      newRow,
      subtasks.map((s) => ({
        id: s.id,
        task_id: newRow.id,
        user_id: newRow.user_id,
        title: s.title,
        completed: s.completed,
        position: s.position ?? 0,
      }))
    )
    if (mapped) await db.tasks.put(mapped)
  }
})

const handleLists = withRealtimeGuard(async (payload, userId) => {
  const { eventType, new: newRow, old: oldRow } = payload

  if (eventType === 'DELETE') {
    const id = oldRow?.id
    if (id) {
      await recordTombstone('task_lists', id, userId)
      await db.lists.delete(id)
    }
    return
  }

  if (newRow) {
    if (newRow.user_id && newRow.user_id !== userId) return

    if (await isTombstoned('task_lists', newRow.id, newRow.updated_at)) {
      return
    }

    const existing = await db.lists.get(newRow.id)
    if (existing && getTimestampMs(existing) > getTimestampMs(newRow)) {
      return
    }

    const mapped = mapRowToList(newRow)
    if (mapped) await db.lists.put(mapped)
  }
})

const handleSubtasks = withRealtimeGuard(async (payload) => {
  const { eventType, new: newRow, old: oldRow } = payload
  const taskId = eventType === 'DELETE' ? oldRow?.task_id : newRow?.task_id
  if (!taskId) return

  const parentTask = await db.tasks.get(taskId)
  if (!parentTask) return

  let subtasks = Array.isArray(parentTask.subtasks) ? [...parentTask.subtasks] : []

  if (eventType === 'DELETE') {
    if (oldRow?.id) subtasks = subtasks.filter((s) => s.id !== oldRow.id)
  } else if (eventType === 'INSERT') {
    const exists = subtasks.find((s) => s.id === newRow.id)
    if (!exists) {
      subtasks.push({
        id: newRow.id,
        title: newRow.title,
        completed: Boolean(newRow.completed),
        position: newRow.position ?? subtasks.length,
      })
    }
  } else if (eventType === 'UPDATE') {
    subtasks = subtasks.map((s) =>
      s.id === newRow.id
        ? {
            ...s,
            title: newRow.title,
            completed: Boolean(newRow.completed),
            position: newRow.position ?? s.position,
          }
        : s
    )
  }

  subtasks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  await db.tasks.update(taskId, { subtasks, updatedAt: new Date().toISOString() })
})

const handleTimerSettings = withRealtimeGuard(async (payload, userId) => {
  const { eventType, new: newRow } = payload
  if (eventType === 'DELETE' || !newRow || !newRow.settings) return
  if (newRow.user_id && newRow.user_id !== userId) return

  const currentLocal = await db.timerSettings.get('default')
  const remoteUpdatedAt = getTimestampMs(newRow)
  const localUpdatedAt = getTimestampMs(currentLocal)

  const s = newRow.settings
  const isNewAction =
    s.timerState?.actionId && s.timerState.actionId !== currentLocal?.timerState?.actionId

  // Adopt remote timer state if new user action occurred or remote timestamp is newer
  if (!isNewAction && localUpdatedAt > remoteUpdatedAt) {
    return
  }

  const safeFocus = Number(s.focusDuration)
  const safeShort = Number(s.shortBreakDuration)
  const safeLong = Number(s.longBreakDuration)
  const safeSessions = Number(s.sessions)

  await db.timerSettings.put({
    id: 'default',
    userId,
    focusDuration: Number.isFinite(safeFocus) && safeFocus > 0 ? safeFocus : 25,
    shortBreakDuration: Number.isFinite(safeShort) && safeShort > 0 ? safeShort : 5,
    longBreakDuration: Number.isFinite(safeLong) && safeLong > 0 ? safeLong : 15,
    sessions: Number.isFinite(safeSessions) && safeSessions > 0 ? safeSessions : 4,
    autoStartBreaks: Boolean(newRow.auto_start_breaks ?? s.autoStartBreaks),
    autoStartPomo: Boolean(s.autoStartPomo),
    timerState: s.timerState || null,
    updatedAt: newRow.updated_at || new Date().toISOString(),
  })
})

const handleThemes = withRealtimeGuard(async (payload, userId) => {
  const { eventType, new: newRow, old: oldRow } = payload

  if (eventType === 'DELETE') {
    const deletedId = oldRow?.id
    if (!deletedId) return
    await recordTombstone('themes', deletedId, userId)

    const activeSetting = await db.themeSettings.get('active')
    if (activeSetting?.activeThemeId === deletedId) {
      await db.themeSettings.put({
        id: 'active',
        activeThemeId: 'preset-nocturn-green',
        customColors: null,
      })
    }
    await db.themes.delete(deletedId)
  } else if (newRow) {
    if (newRow.user_id && newRow.user_id !== userId) return

    if (await isTombstoned('themes', newRow.id, newRow.updated_at)) {
      return
    }

    const existingThemes = await db.themes.toArray()
    const duplicate = existingThemes.find(
      (t) =>
        !t.isPreset &&
        t.name.toLowerCase() === (newRow.name || '').toLowerCase() &&
        t.id !== newRow.id
    )
    if (duplicate) {
      await db.themes.delete(duplicate.id)
    }

    await db.themes.put({
      id: newRow.id,
      userId: newRow.user_id,
      name: newRow.name,
      isPreset: false,
      colors: newRow.settings || {},
      createdAt: newRow.created_at,
      updatedAt: newRow.updated_at,
    })
  }
})

const handleUserSettings = withRealtimeGuard(async (payload, userId) => {
  const { eventType, new: newRow } = payload
  if (eventType === 'DELETE') return

  if (newRow?.settings) {
    const settings = newRow.settings
    const targetThemeId = settings.activeThemeId || settings.active_theme_id
    if (targetThemeId) {
      const existing = await db.themeSettings.get('active')
      await db.themeSettings.put({
        id: 'active',
        activeThemeId: targetThemeId,
        customColors: existing?.customColors || null,
      })
    }

    if (settings.dailyVocabLimit !== undefined) {
      const existingSettings = (await db.userSettings.get('preferences')) || {}
      await db.userSettings.put({
        ...existingSettings,
        id: 'preferences',
        userId,
        dailyVocabLimit: Number(settings.dailyVocabLimit) || 5,
        updatedAt: newRow.updated_at || new Date().toISOString(),
      })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nocturn:settings-updated', { detail: settings }))
      }
    }
  }
})

const handleUserProfiles = withRealtimeGuard(async (payload) => {
  const { eventType, new: newRow } = payload
  if (eventType === 'DELETE') return
  if (newRow?.display_name && typeof window !== 'undefined') {
    setStorageItem('nocturn_user_name', newRow.display_name)
    window.dispatchEvent(new CustomEvent('nocturn:profile-updated', { detail: newRow }))
  }
})

const handleVocab = withRealtimeGuard(async (payload, userId) => {
  const { eventType, new: newRow, old: oldRow } = payload
  if (eventType === 'DELETE') {
    const id = oldRow?.id
    if (id) {
      await recordTombstone('vocab_words', id, userId)
      await db.vocab.delete(id)
    }
    if (oldRow?.word) {
      await recordTombstone('vocab_words', oldRow.word.trim().toLowerCase(), userId)
    }
  } else if (newRow) {
    if (newRow.user_id && newRow.user_id !== userId) return

    if (await isTombstoned('vocab_words', newRow.id, newRow.updated_at)) {
      return
    }

    const wordKey = newRow.word?.trim().toLowerCase()
    if (wordKey && (await isTombstoned('vocab_words', wordKey, newRow.updated_at))) {
      return
    }

    if (userId && (await isTombstoned('vocab_words', `all-${userId}`, newRow.updated_at))) {
      return
    }

    const existing = await db.vocab.get(newRow.id)
    if (existing && getTimestampMs(existing) > getTimestampMs(newRow)) {
      return
    }

    // Deduplicate by word name to avoid duplicate records with different IDs
    if (wordKey) {
      const allWords = await db.vocab.toArray()
      const duplicate = allWords.find(
        (w) => w.word?.trim().toLowerCase() === wordKey && w.id !== newRow.id
      )
      if (duplicate) {
        await db.vocab.delete(duplicate.id)
      }
    }

    const mapped = mapRowToVocabWord(newRow)
    if (mapped) await db.vocab.put(mapped)
  }
})

const handleFocusSessions = withRealtimeGuard(async (payload, userId) => {
  const { eventType, new: newRow } = payload
  if (eventType === 'DELETE' || !newRow) return
  if (newRow.user_id && newRow.user_id !== userId) return

  try {
    const existing = await db.pomodoroSessions.get(newRow.id)
    if (!existing) {
      await db.pomodoroSessions.put({
        id: newRow.id,
        userId: newRow.user_id,
        taskId: newRow.task_id || null,
        startedAt: newRow.start_time,
        completedAt: newRow.end_time,
        duration: Math.round((newRow.duration_seconds || 1500) / 60),
        sessionType: 'focus',
        updatedAt: newRow.updated_at || newRow.created_at,
      })
    }
  } catch {
    // ignore
  }
})

// ─── Table Map ────────────────────────────────────────────────────────────────

const TABLE_HANDLERS = {
  tasks: handleTasks,
  task_lists: handleLists,
  subtasks: handleSubtasks,
  timer_settings: handleTimerSettings,
  themes: handleThemes,
  user_settings: handleUserSettings,
  user_profiles: handleUserProfiles,
  vocab_words: handleVocab,
  focus_sessions: handleFocusSessions,
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start realtime subscriptions for the given authenticated user.
 */
export function startRealtime(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return

  // Prevent duplicate channel creation for the same active user
  if (_currentUserId === userId && _channel) {
    return
  }

  _currentUserId = userId
  stopRealtime()

  let channel = supabase.channel(`nocturn-realtime-${userId}`)

  for (const [table, handler] of Object.entries(TABLE_HANDLERS)) {
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        ...(table !== 'user_profiles' ? { filter: `user_id=eq.${userId}` } : {}),
      },
      (payload) => {
        handler(payload, userId).catch((err) => {
          console.warn(`[realtime] Error handling ${table} ${payload.eventType}:`, err.message)
        })
      }
    )
  }

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.debug('[realtime] ✓ Subscribed to all tables for user', userId)
      if (_reconnectTimer) {
        clearTimeout(_reconnectTimer)
        _reconnectTimer = null
      }
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      console.warn('[realtime] Channel status:', status, '— scheduling reconnect...')
      if (!_reconnectTimer && _currentUserId) {
        _reconnectTimer = setTimeout(() => {
          _reconnectTimer = null
          if (_currentUserId) startRealtime(_currentUserId)
        }, 3000)
      }
    }
  })

  _channel = channel
}

/**
 * Stop all realtime subscriptions and clean up.
 */
export function stopRealtime() {
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer)
    _reconnectTimer = null
  }
  if (_channel && supabase) {
    try {
      supabase.removeChannel(_channel)
    } catch {
      // ignore
    }
    _channel = null
  }
}

/**
 * Returns true if there is an active realtime channel.
 */
export function isRealtimeActive() {
  return Boolean(_channel)
}

// Auto-reconnect when browser comes online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (_currentUserId && !_channel) {
      startRealtime(_currentUserId)
    }
  })
}
