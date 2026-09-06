import { db } from '../db/db'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { recordPomodoroHistoryRemote } from '../lib/timer'

/**
 * Retrieves timer settings from local Dexie IndexedDB
 */
export async function getTimerSettings() {
  try {
    const settings = await db.timerSettings.get('default')
    return (
      settings || {
        id: 'default',
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        sessions: 4,
      }
    )
  } catch (err) {
    console.error('timerService.getTimerSettings failed:', err)
    return {
      id: 'default',
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessions: 4,
    }
  }
}

export async function saveTimerSettings(newSettings) {
  try {
    await db.timerSettings.put({
      id: 'default',
      ...newSettings,
    })
  } catch (err) {
    console.error('timerService.saveTimerSettings failed:', err)
    throw err
  }
}

/**
 * Persist or update active focus session to Dexie local cache.
 */
export async function recordActiveSession(sessionObj) {
  try {
    const now = new Date().toISOString()
    const activeData = {
      id: 'active',
      session_id: sessionObj.sessionId || sessionObj.id || `session-${Date.now()}`,
      userId: sessionObj.userId || null,
      taskId: sessionObj.taskId || null,
      taskName: sessionObj.taskName || '',
      sessionType: sessionObj.sessionType || 'focus',
      configuredDuration: Number.isFinite(Number(sessionObj.configuredDuration)) && Number(sessionObj.configuredDuration) > 0
        ? Number(sessionObj.configuredDuration)
        : 25,
      startedAt: sessionObj.startedAt || now,
      expectedEndAt: sessionObj.expectedEndAt || now,
      pausedAt: sessionObj.pausedAt || null,
      remainingSecondsWhenPaused:
        Number.isFinite(Number(sessionObj.remainingSecondsWhenPaused)) && Number(sessionObj.remainingSecondsWhenPaused) >= 0
          ? Number(sessionObj.remainingSecondsWhenPaused)
          : null,
      elapsedSeconds:
        Number.isFinite(Number(sessionObj.elapsedSeconds)) && Number(sessionObj.elapsedSeconds) >= 0
          ? Number(sessionObj.elapsedSeconds)
          : 0,
      canonicalStartTime: sessionObj.canonicalStartTime || null,
      status: sessionObj.status || 'active',
      currentSession: Number.isFinite(Number(sessionObj.currentSession)) && Number(sessionObj.currentSession) > 0
        ? Number(sessionObj.currentSession)
        : 1,
      createdAt: sessionObj.createdAt || now,
      updatedAt: now,
    }

    await db.activeSessions.put(activeData)
    return activeData
  } catch (err) {
    console.error('timerService.recordActiveSession failed:', err)
    return null
  }
}

/**
 * Retrieve active session from local Dexie.
 */
export async function getActiveSession() {
  try {
    const active = await db.activeSessions.get('active')
    if (!active) return null

    return {
      ...active,
      configuredDuration: Number.isFinite(Number(active.configuredDuration)) && Number(active.configuredDuration) > 0
        ? Number(active.configuredDuration)
        : 25,
      currentSession: Number.isFinite(Number(active.currentSession)) && Number(active.currentSession) > 0
        ? Number(active.currentSession)
        : 1,
      remainingSecondsWhenPaused:
        Number.isFinite(Number(active.remainingSecondsWhenPaused)) && Number(active.remainingSecondsWhenPaused) >= 0
          ? Number(active.remainingSecondsWhenPaused)
          : null,
      elapsedSeconds:
        Number.isFinite(Number(active.elapsedSeconds)) && Number(active.elapsedSeconds) >= 0
          ? Number(active.elapsedSeconds)
          : 0,
    }
  } catch (err) {
    console.error('timerService.getActiveSession failed:', err)
    return null
  }
}

/**
 * Clear active session in Dexie.
 */
export async function clearActiveSession() {
  try {
    await db.activeSessions.delete('active')
  } catch (err) {
    console.error('timerService.clearActiveSession failed:', err)
  }
}

/**
 * Record a completed focus session in Dexie and Supabase.
 */
export async function recordPomodoroSession({
  taskId = null,
  duration = 25,
  durationSeconds = null,
  sessionType = 'focus',
  startedAt = null,
  taskTitle = '',
  sessionId = null,
  completed = true,
}) {
  try {
    const now = new Date()
    const validDurationSeconds =
      Number.isFinite(Number(durationSeconds)) && Number(durationSeconds) > 0
        ? Math.round(Number(durationSeconds))
        : Math.round((Number(duration) || 25) * 60)
    const validDurationMinutes = Math.round((validDurationSeconds / 60) * 10) / 10

    let sessionUserId = null
    if (isSupabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      sessionUserId = session?.user?.id || null
    }

    const sessionRecordId = sessionId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()))

    const sessionObj = {
      id: sessionRecordId,
      userId: sessionUserId,
      taskId,
      startedAt: startedAt || new Date(now.getTime() - validDurationSeconds * 1000).toISOString(),
      completedAt: now.toISOString(),
      duration: validDurationMinutes,
      durationSeconds: validDurationSeconds,
      sessionType,
      completed,
    }

    await db.pomodoroSessions.put(sessionObj)

    if (sessionUserId) {
      await recordPomodoroHistoryRemote(validDurationMinutes, sessionType, taskId, taskTitle, sessionUserId, sessionId)
    }

    return sessionObj
  } catch (err) {
    console.error('timerService.recordPomodoroSession failed:', err)
    return null
  }
}

export async function getPomodoroSessions() {
  try {
    return await db.pomodoroSessions.toArray()
  } catch (err) {
    console.error('timerService.getPomodoroSessions failed:', err)
    return []
  }
}
