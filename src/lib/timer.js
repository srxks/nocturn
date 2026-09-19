import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { toUuid } from './idUtils.js'
import { dedupeRequest } from '../services/syncCoordinator.js'
import { classifyAndReportError } from '../services/networkStateService.js'

// ─── Clock Drift Management ──────────────────────────────────────────────────
// Offsets local client clock against Supabase server timestamp to ensure multiple
// devices count down in exact synchrony without temporal drift.
let _serverClockOffsetMs = 0

export function setServerClockOffset(offsetMs) {
  if (Number.isFinite(offsetMs)) {
    _serverClockOffsetMs = offsetMs
  }
}

export function getServerClockOffset() {
  return _serverClockOffsetMs
}

export function getServerNowMs() {
  return Date.now() + _serverClockOffsetMs
}

export function mapRowToTimerSettings(data) {
  if (!data) return null
  const s = data.settings || {}

  const focusDuration = Number(s.focusDuration)
  const shortBreak = Number(s.shortBreakDuration)
  const longBreak = Number(s.longBreakDuration)
  const sessions = Number(s.sessions)

  return {
    focusDuration: Number.isFinite(focusDuration) && focusDuration > 0 ? focusDuration : 25,
    shortBreakDuration: Number.isFinite(shortBreak) && shortBreak > 0 ? shortBreak : 5,
    longBreakDuration: Number.isFinite(longBreak) && longBreak > 0 ? longBreak : 15,
    sessions: Number.isFinite(sessions) && sessions > 0 ? sessions : 4,
    autoStartBreaks: Boolean(data.auto_start_breaks ?? s.autoStartBreaks),
    autoStartPomo: Boolean(s.autoStartPomo),
    timerState: s.timerState || null,
    updatedAt: data.updated_at || data.created_at || null,
  }
}

/**
 * Fetches timer settings from Supabase timer_settings table.
 * Schema: id (uuid), user_id (uuid, unique), settings (jsonb), auto_start_breaks (boolean), created_at, updated_at.
 */
export async function fetchTimerSettingsRemote(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null

  return dedupeRequest(`timer_settings:${userId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('timer_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        classifyAndReportError(error)
        throw new Error(`[timer_settings] SELECT failed: ${error.message}`)
      }

      if (!data) return null

      // Calibrate server clock offset from server updated_at timestamp
      if (data.updated_at) {
        const serverMs = new Date(data.updated_at).getTime()
        if (!isNaN(serverMs)) {
          setServerClockOffset(serverMs - Date.now())
        }
      }

      return mapRowToTimerSettings(data)
    } catch (err) {
      classifyAndReportError(err)
      throw err
    }
  })
}

/**
 * Upserts timer settings into Supabase timer_settings table.
 * Uses onConflict: 'user_id' based on the timer_settings_user_id_key UNIQUE constraint.
 * Uses a deterministic UUID for id based on userId to guarantee single-row idempotency.
 * Persists both configuration and live timerState inside the settings JSONB field.
 */
export async function upsertTimerSettingsRemote(settings, userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null

  try {
    const focusDuration = Number(settings.focusDuration)
    const shortBreak = Number(settings.shortBreakDuration)
    const longBreak = Number(settings.longBreakDuration)
    const sessions = Number(settings.sessions)

    const configObj = {
      focusDuration: Number.isFinite(focusDuration) && focusDuration > 0 ? focusDuration : 25,
      shortBreakDuration: Number.isFinite(shortBreak) && shortBreak > 0 ? shortBreak : 5,
      longBreakDuration: Number.isFinite(longBreak) && longBreak > 0 ? longBreak : 15,
      sessions: Number.isFinite(sessions) && sessions > 0 ? sessions : 4,
      autoStartBreaks: Boolean(settings.autoStartBreaks),
      autoStartPomo: Boolean(settings.autoStartPomo),
    }

    // Persist live timerState if present
    const settingsPayload = settings.timerState
      ? { ...configObj, timerState: settings.timerState }
      : configObj

    const now = new Date().toISOString()
    const row = {
      id: toUuid(`timer-settings-${userId}`),
      user_id: userId,
      settings: settingsPayload,
      auto_start_breaks: Boolean(settings.autoStartBreaks),
      updated_at: now,
    }

    const { data, error } = await supabase
      .from('timer_settings')
      .upsert(row, { onConflict: 'user_id' })
      .select()

    if (error) {
      console.error('[timer_settings] UPSERT failed:', {
        table: 'timer_settings',
        operation: 'UPSERT',
        userId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return null
    }

    const saved = data?.[0]
    if (saved) {
      if (saved.updated_at) {
        const serverMs = new Date(saved.updated_at).getTime()
        if (!isNaN(serverMs)) {
          setServerClockOffset(serverMs - Date.now())
        }
      }
      return mapRowToTimerSettings(saved)
    }
    return null
  } catch (err) {
    console.error('[timer_settings] UPSERT exception:', err)
    return null
  }
}

/**
 * Records a completed Pomodoro session in focus_sessions table.
 * Schema: id, user_id, task_id, start_time, end_time, duration_seconds, completed, created_at, updated_at.
 * Uses deterministic UUID and onConflict: 'id' to prevent duplicate records across multiple tabs.
 */
export async function recordPomodoroHistoryRemote(
  durationMinutes,
  _sessionType,
  taskId,
  _taskTitle,
  userId,
  sessionId = null,
  completed = true
) {
  if (!isSupabaseConfigured || !supabase || !userId) return null

  try {
    const validTaskId = taskId && taskId !== 'none' ? toUuid(taskId) : null
    const safeDurationMinutes = Number(durationMinutes) || 25
    const durationSeconds = Math.round(safeDurationMinutes * 60)
    const nowMs = getServerNowMs()
    const startTime = new Date(nowMs - durationSeconds * 1000).toISOString()
    const endTime = new Date(nowMs).toISOString()

    const recordId = sessionId
      ? toUuid(`focus-${userId}-${sessionId}`)
      : crypto.randomUUID()

    const row = {
      id: recordId,
      user_id: userId,
      task_id: validTaskId,
      start_time: startTime,
      end_time: endTime,
      duration_seconds: durationSeconds,
      completed: Boolean(completed),
      created_at: endTime,
      updated_at: endTime,
    }

    const { data, error } = await supabase
      .from('focus_sessions')
      .upsert(row, { onConflict: 'id' })
      .select()

    if (error) {
      console.error('[focus_sessions] UPSERT failed:', {
        table: 'focus_sessions',
        operation: 'UPSERT',
        userId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return null
    }

    return data?.[0] || null
  } catch (err) {
    console.error('[focus_sessions] UPSERT exception:', err)
    return null
  }
}

/**
 * Fetches focus sessions for the authenticated user from Supabase.
 * Schema: id, user_id, task_id, start_time, end_time, duration_seconds, completed, created_at, updated_at.
 */
export async function fetchUserFocusSessions(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return []

  return dedupeRequest(`focus_sessions:${userId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('end_time', { ascending: false })

      if (error) {
        classifyAndReportError(error)
        throw new Error(`[focus_sessions] SELECT failed: ${error.message}`)
      }

      return data || []
    } catch (err) {
      classifyAndReportError(err)
      throw err
    }
  })
}
