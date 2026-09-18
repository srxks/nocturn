/**
 * syncService.js
 *
 * Deterministic, Two-Way Offline-First Reconciliation Engine.
 *
 * Guarantees:
 * 1. Supabase is the shared cloud source of truth between devices.
 * 2. Dexie is the local source of truth for immediate UI/offline operation.
 * 3. Reconciles using Last-Write-Wins (LWW) via explicit updatedAt timestamps.
 * 4. Processes tombstones so deleted records never resurrect across devices.
 * 5. Prevents infinite sync loops using withRealtimeGuard and timestamp checks.
 * 6. Clean accounts start with zero fake data.
 */

import { db } from '../db/db.js'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js'
import { fetchUserProfileRemote, updateUserProfileRemote } from '../lib/profile.js'
import { fetchUserSettings, upsertUserSettings, fetchUserThemes, upsertUserThemeRemote } from '../lib/themes.js'
import { fetchUserLists, upsertListRemote, deleteListRemote } from '../lib/lists.js'
import { fetchUserTasks, upsertTaskRemote, deleteTaskRemote, upsertSubtaskRemote } from '../lib/tasks.js'
import { fetchTimerSettingsRemote, upsertTimerSettingsRemote, fetchUserFocusSessions } from '../lib/timer.js'
import { fetchUserVocabWords, upsertVocabWordsRemote, deleteVocabWordRemote, deleteAllVocabWordsRemote } from '../lib/vocab.js'
import { toUuid } from '../lib/idUtils.js'
import { resolveConflict, getTombstones, clearTombstone, isTombstoned } from './conflictService.js'
import { setSyncingState, reportNetworkSuccess, classifyAndReportError } from './networkStateService.js'

export async function syncWithCloud(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return { success: false, synced: 0, reason: 'Unconfigured or unauthenticated' }
  }

  // Silent offline check: if user is offline, skip cloud network calls safely
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: true, synced: 0, offline: true }
  }

  setSyncingState(true)
  let totalSynced = 0
  try {

  // ─── 0. Process Tombstones (Apply local deletions to cloud) ─────────────────
  try {
    const tombstones = await getTombstones(userId)
    for (const ts of tombstones) {
      if (ts.table === 'tasks') {
        await deleteTaskRemote(ts.entityId, userId)
        await clearTombstone(ts.table, ts.entityId)
      } else if (ts.table === 'task_lists') {
        await deleteListRemote(ts.entityId, userId)
        await clearTombstone(ts.table, ts.entityId)
      } else if (ts.table === 'vocab_words') {
        if (ts.entityId === `all-${userId}`) {
          await deleteAllVocabWordsRemote(userId)
        } else {
          await deleteVocabWordRemote(ts.entityId, userId)
        }
        await clearTombstone(ts.table, ts.entityId)
      }
    }
  } catch (tsErr) {
    console.warn('[syncService] Tombstone reconciliation notice:', tsErr.message)
  }

  // ─── 1. User Profile Sync ───────────────────────────────────────────────────
  try {
    const remoteProfile = await fetchUserProfileRemote(userId)
    if (!remoteProfile) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await updateUserProfileRemote(userId, {
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        totalSynced++
      }
    }
  } catch (profileErr) {
    console.warn('[syncService] Profile sync notice:', profileErr.message)
  }

  // ─── 2. Task Lists Sync (Precedes tasks to satisfy FK constraints) ───────────
  const confirmedRemoteListIds = new Set()
  try {
    const [localLists, remoteLists] = await Promise.all([
      db.lists.toArray(),
      fetchUserLists(userId),
    ])

    const remoteListsMap = new Map(remoteLists.map((l) => [l.id, l]))
    for (const rList of remoteLists) {
      confirmedRemoteListIds.add(rList.id)
    }

    for (const localList of localLists) {
      if (
        localList &&
        !localList.system &&
        localList.id !== 'tasks' &&
        localList.id !== 'my-day' &&
        localList.id !== 'all' &&
        localList.id !== 'completed' &&
        localList.id !== userId &&
        localList.name &&
        typeof localList.name === 'string' &&
        localList.name.trim()
      ) {
        const mappedListId = toUuid(localList.id)
        if (await isTombstoned('task_lists', mappedListId)) {
          continue
        }

        const remoteMatch = remoteListsMap.get(mappedListId) || remoteListsMap.get(localList.id)
        if (!remoteMatch) {
          // Local list only created if it belongs to this user
          if (localList.userId === userId || !localList.userId) {
            const res = await upsertListRemote({ ...localList, userId }, userId)
            if (res) {
              confirmedRemoteListIds.add(res.id)
              totalSynced++
            }
          }
        } else {
          confirmedRemoteListIds.add(remoteMatch.id)
          const conflict = resolveConflict(localList, remoteMatch)
          if (conflict === 'local') {
            const res = await upsertListRemote({ ...localList, userId }, userId)
            if (res) totalSynced++
          } else if (conflict === 'remote') {
            await db.lists.put(remoteMatch)
          }
        }
      }
    }

    for (const remoteList of remoteLists) {
      const localMatch = localLists.find(
        (l) => l.id === remoteList.id || toUuid(l.id) === remoteList.id
      )
      if (!localMatch) {
        if (!(await isTombstoned('task_lists', remoteList.id, remoteList.updated_at))) {
          await db.lists.put(remoteList)
          totalSynced++
        }
      }
    }
  } catch (listErr) {
    console.error('[syncService] Task lists sync failed:', listErr.message)
  }

  // ─── 3. Tasks Sync (Dependency-aware & LWW) ─────────────────────────────────
  const confirmedTaskIds = new Set()
  try {
    const [localTasks, remoteTasks] = await Promise.all([
      db.tasks.toArray(),
      fetchUserTasks(userId),
    ])

    const remoteTasksMap = new Map(remoteTasks.map((t) => [t.id, t]))
    for (const rTask of remoteTasks) {
      confirmedTaskIds.add(rTask.id)
    }

    for (const localTask of localTasks) {
      const mappedId = toUuid(localTask.id)
      if (await isTombstoned('tasks', mappedId)) {
        continue
      }

      const isCustomList =
        localTask.listId &&
        localTask.listId !== 'tasks' &&
        localTask.listId !== 'my-day' &&
        localTask.listId !== 'all' &&
        localTask.listId !== 'completed'

      if (isCustomList) {
        const parentId = toUuid(localTask.listId)
        if (!confirmedRemoteListIds.has(parentId) && !confirmedRemoteListIds.has(localTask.listId)) {
          continue
        }
      }

      const remoteMatch = remoteTasksMap.get(mappedId) || remoteTasksMap.get(localTask.id)
      if (!remoteMatch) {
        if (localTask.userId === userId || !localTask.userId) {
          const res = await upsertTaskRemote({ ...localTask, userId }, userId)
          if (res) {
            confirmedTaskIds.add(res.id)
            totalSynced++
          }
        }
      } else {
        confirmedTaskIds.add(remoteMatch.id)
        const conflict = resolveConflict(localTask, remoteMatch)
        if (conflict === 'local') {
          const res = await upsertTaskRemote({ ...localTask, userId }, userId)
          if (res) totalSynced++
        } else if (conflict === 'remote') {
          await db.tasks.put({ ...remoteMatch, id: localTask.id })
        }
      }
    }

    for (const remoteTask of remoteTasks) {
      const localMatch = localTasks.find(
        (t) => toUuid(t.id) === remoteTask.id || t.id === remoteTask.id
      )
      if (!localMatch) {
        if (!(await isTombstoned('tasks', remoteTask.id, remoteTask.updated_at))) {
          await db.tasks.put(remoteTask)
          totalSynced++
        }
      }
    }

    // 4. Subtasks Sync
    for (const localTask of localTasks) {
      const mappedTaskId = toUuid(localTask.id)
      if (
        (confirmedTaskIds.has(mappedTaskId) || confirmedTaskIds.has(localTask.id)) &&
        Array.isArray(localTask.subtasks) &&
        localTask.subtasks.length > 0
      ) {
        for (let i = 0; i < localTask.subtasks.length; i++) {
          const st = localTask.subtasks[i]
          await upsertSubtaskRemote(st, localTask.id, userId, i)
        }
      }
    }
  } catch (taskErr) {
    console.error('[syncService] Tasks sync failed:', taskErr.message)
  }

  // ─── 5. Timer Settings Sync (LWW) ───────────────────────────────────────────
  try {
    const localTimer = await db.timerSettings.get('default')
    const remoteTimer = await fetchTimerSettingsRemote(userId)

    if (remoteTimer && localTimer) {
      const conflict = resolveConflict(localTimer, remoteTimer)
      if (conflict === 'local') {
        await upsertTimerSettingsRemote(localTimer, userId)
        totalSynced++
      } else {
        await db.timerSettings.put({ id: 'default', userId, ...remoteTimer })
      }
    } else if (remoteTimer) {
      await db.timerSettings.put({ id: 'default', userId, ...remoteTimer })
    } else if (localTimer) {
      await upsertTimerSettingsRemote(localTimer, userId)
      totalSynced++
    } else {
      const defaultTimerSettings = {
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        sessions: 4,
        autoStartBreaks: false,
        autoStartPomo: false,
      }
      await upsertTimerSettingsRemote(defaultTimerSettings, userId)
      await db.timerSettings.put({ id: 'default', userId, ...defaultTimerSettings })
    }
  } catch (timerErr) {
    console.warn('[syncService] Timer settings sync notice:', timerErr.message)
  }

  // ─── 6. Themes & User Settings Sync ─────────────────────────────────────────
  try {
    const [localThemes, remoteThemes, remoteSettings] = await Promise.all([
      db.themes.toArray(),
      fetchUserThemes(userId),
      fetchUserSettings(userId),
    ])

    const customLocalThemes = localThemes.filter((t) => !t.isPreset)
    for (const theme of customLocalThemes) {
      if (theme.userId === userId || !theme.userId) {
        await upsertUserThemeRemote({ ...theme, userId }, userId)
      }
    }
    for (const remoteTheme of remoteThemes) {
      await db.themes.put(remoteTheme)
    }

    if (remoteSettings?.activeThemeId) {
      const existing = await db.themeSettings.get('active')
      await db.themeSettings.put({
        id: 'active',
        activeThemeId: remoteSettings.activeThemeId,
        customColors: existing?.customColors || null,
      })
    } else {
      const localThemeSettings = await db.themeSettings.get('active')
      if (localThemeSettings?.activeThemeId) {
        await upsertUserSettings(userId, { activeThemeId: localThemeSettings.activeThemeId })
      }
    }

    // Reconcile dailyVocabLimit
    const localPrefs = await db.userSettings.get('preferences')
    if (remoteSettings?.dailyVocabLimit) {
      await db.userSettings.put({
        id: 'preferences',
        userId,
        dailyVocabLimit: Number(remoteSettings.dailyVocabLimit) || 5,
        updatedAt: new Date().toISOString(),
      })
    } else if (localPrefs?.dailyVocabLimit) {
      await upsertUserSettings(userId, { dailyVocabLimit: Number(localPrefs.dailyVocabLimit) })
    }
  } catch (themeErr) {
    console.warn('[syncService] Themes/settings sync notice:', themeErr.message)
  }

  // ─── 7. Vocab Words Sync (Reconciled with LWW & Tombstones) ─────────────────
  try {
    const [localVocab, remoteVocab] = await Promise.all([
      db.vocab.toArray(),
      fetchUserVocabWords(userId),
    ])

    const remoteVocabMap = new Map(remoteVocab.map((w) => [w.word.trim().toLowerCase(), w]))

    for (const localW of localVocab) {
      if (!localW?.word) continue
      const wordKey = localW.word.trim().toLowerCase()

      // Skip if locally deleted
      if (
        (await isTombstoned('vocab_words', localW.id)) ||
        (await isTombstoned('vocab_words', wordKey)) ||
        (await isTombstoned('vocab_words', `all-${userId}`))
      ) {
        continue
      }

      const remoteMatch = remoteVocabMap.get(wordKey)
      if (!remoteMatch) {
        // Only upload local word if it belongs to this user session
        if (localW.userId === userId) {
          await upsertVocabWordsRemote([localW], userId)
          totalSynced++
        }
      } else {
        const conflict = resolveConflict(localW, remoteMatch)
        if (conflict === 'local') {
          await upsertVocabWordsRemote([localW], userId)
          totalSynced++
        } else if (conflict === 'remote') {
          await db.vocab.put(remoteMatch)
        }
      }
    }

    // Populate remote words into local Dexie (guarded against deleted words/all-cleared state)
    const isAllVocabDeleted = await isTombstoned('vocab_words', `all-${userId}`)
    if (!isAllVocabDeleted) {
      for (const remoteW of remoteVocab) {
        const wordKey = remoteW.word?.trim().toLowerCase()
        if (
          (await isTombstoned('vocab_words', remoteW.id, remoteW.updated_at)) ||
          (wordKey && (await isTombstoned('vocab_words', wordKey, remoteW.updated_at)))
        ) {
          continue
        }
        const localMatch = localVocab.find((w) => w.word?.trim().toLowerCase() === wordKey)
        if (!localMatch) {
          await db.vocab.put(remoteW)
          totalSynced++
        }
      }
    }
  } catch (vocabErr) {
    console.warn('[syncService] Vocab words sync notice:', vocabErr.message)
  }

  // ─── 8. Focus Sessions Sync ─────────────────────────────────────────────────
  try {
    const remoteFocusSessions = await fetchUserFocusSessions(userId)
    if (Array.isArray(remoteFocusSessions)) {
      for (const rSession of remoteFocusSessions) {
        await db.pomodoroSessions.put({
          id: rSession.id,
          userId: rSession.user_id,
          taskId: rSession.task_id || null,
          startedAt: rSession.start_time,
          completedAt: rSession.end_time,
          duration: Math.round((rSession.duration_seconds || 1500) / 60),
          sessionType: 'focus',
          completed: rSession.completed,
          updatedAt: rSession.updated_at || rSession.created_at,
        })
      }
    }
  } catch (focusErr) {
    console.warn('[syncService] Focus sessions sync notice:', focusErr.message)
  }

    reportNetworkSuccess()
    return { success: true, synced: totalSynced }
  } catch (syncErr) {
    classifyAndReportError(syncErr)
    return { success: false, synced: totalSynced, error: syncErr }
  } finally {
    setSyncingState(false)
  }
}

export async function syncLocalDataToSupabase(userId) {
  return syncWithCloud(userId)
}
