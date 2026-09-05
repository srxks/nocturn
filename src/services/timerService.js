import { db } from '../db/db'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Timer & Pomodoro Session Service
 * Manages timer settings, timestamp-based active session persistence (cross-device ready via Supabase + local Dexie cache),
 * and completed Pomodoro session statistics logging.
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
 * Persist or update an active focus/break session to both local Dexie cache and Supabase (when configured).
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
      sessionType: sessionObj.sessionType || 'focus', // 'focus' | 'short_break' | 'long_break'
      configuredDuration: Number(sessionObj.configuredDuration) || 25,
      startedAt: sessionObj.startedAt || now,
      expectedEndAt: sessionObj.expectedEndAt || now,
      pausedAt: sessionObj.pausedAt || null,
      remainingSecondsWhenPaused: sessionObj.remainingSecondsWhenPaused !== undefined ? sessionObj.remainingSecondsWhenPaused : null,
      status: sessionObj.status || 'active', // 'active' | 'paused' | 'completed' | 'cancelled'
      currentSession: Number(sessionObj.currentSession) || 1,
      createdAt: sessionObj.createdAt || now,
      updatedAt: now,
    }

    // 1. Save to local Dexie cache
    await db.activeSessions.put(activeData)

    // 2. Sync to Supabase if configured and online
    if (isSupabaseConfigured) {
      try {
        await supabase.from('active_sessions').upsert({
          id: activeData.id,
          session_id: activeData.session_id,
          user_id: activeData.userId,
          task_id: activeData.taskId,
          task_name: activeData.taskName,
          session_type: activeData.sessionType,
          configured_duration: activeData.configuredDuration,
          started_at: activeData.startedAt,
          expected_end_at: activeData.expectedEndAt,
          paused_at: activeData.pausedAt,
          remaining_seconds_when_paused: activeData.remainingSecondsWhenPaused,
          status: activeData.status,
          current_session: activeData.currentSession,
          updated_at: activeData.updatedAt,
        })
      } catch (sbErr) {
        console.warn('Supabase active_session sync failed (using local cache):', sbErr)
      }
    }

    return activeData
  } catch (err) {
    console.error('timerService.recordActiveSession failed:', err)
    return null
  }
}

/**
 * Retrieve active session from Supabase (or local Dexie fallback).
 */
export async function getActiveSession() {
  try {
    // 1. Try fetching from Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('active_sessions')
          .select('*')
          .eq('id', 'active')
          .maybeSingle()

        if (data && !error) {
          return {
            id: data.id,
            sessionId: data.session_id,
            userId: data.user_id,
            taskId: data.task_id,
            taskName: data.task_name,
            sessionType: data.session_type,
            configuredDuration: data.configured_duration,
            startedAt: data.started_at,
            expectedEndAt: data.expected_end_at,
            pausedAt: data.paused_at,
            remainingSecondsWhenPaused: data.remaining_seconds_when_paused,
            status: data.status,
            currentSession: data.current_session,
            updatedAt: data.updated_at,
          }
        }
      } catch (sbErr) {
        console.warn('Supabase fetch active_session failed (falling back to Dexie):', sbErr)
      }
    }

    // 2. Fallback to local Dexie database
    return await db.activeSessions.get('active')
  } catch (err) {
    console.error('timerService.getActiveSession failed:', err)
    return null
  }
}

/**
 * Clear/complete active session in Dexie and Supabase.
 */
export async function clearActiveSession() {
  try {
    await db.activeSessions.delete('active')

    if (isSupabaseConfigured) {
      try {
        await supabase.from('active_sessions').delete().eq('id', 'active')
      } catch (sbErr) {
        console.warn('Supabase clear active_session failed:', sbErr)
      }
    }
  } catch (err) {
    console.error('timerService.clearActiveSession failed:', err)
  }
}

/**
 * Record a completed focus session into persistent history database.
 */
export async function recordPomodoroSession({
  taskId = null,
  duration = 25,
  sessionType = 'focus',
  startedAt = null,
}) {
  try {
    const now = new Date()
    const session = {
      id: `pomo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      taskId,
      userId: null, // Ready for future backend auth
      startedAt: startedAt || new Date(now.getTime() - duration * 60 * 1000).toISOString(),
      completedAt: now.toISOString(),
      duration: Number(duration) || 25,
      sessionType,
    }

    // Save to local Dexie table
    await db.pomodoroSessions.add(session)

    // Sync to Supabase if configured
    if (isSupabaseConfigured) {
      try {
        await supabase.from('pomodoro_sessions').insert({
          id: session.id,
          task_id: session.taskId,
          user_id: session.userId,
          started_at: session.startedAt,
          completed_at: session.completedAt,
          duration: session.duration,
          session_type: session.sessionType,
        })
      } catch (sbErr) {
        console.warn('Supabase record pomodoro_session failed (saved to Dexie):', sbErr)
      }
    }

    return session
  } catch (err) {
    console.error('timerService.recordPomodoroSession failed:', err)
    return null
  }
}

export async function getPomodoroSessions() {
  try {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('pomodoro_sessions').select('*')
        if (data && !error && data.length > 0) {
          return data.map((d) => ({
            id: d.id,
            taskId: d.task_id,
            userId: d.user_id,
            startedAt: d.started_at,
            completedAt: d.completed_at,
            duration: d.duration,
            sessionType: d.session_type,
          }))
        }
      } catch (sbErr) {
        console.warn('Supabase fetch pomodoro_sessions failed (using Dexie):', sbErr)
      }
    }

    return await db.pomodoroSessions.toArray()
  } catch (err) {
    console.error('timerService.getPomodoroSessions failed:', err)
    return []
  }
}
