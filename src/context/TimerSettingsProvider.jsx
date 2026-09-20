import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ensureSeedData } from '../db/db'
import { TimerSettingsContext } from './TimerSettingsContext'
import { useAuth } from './useAuth'
import { fetchTimerSettingsRemote, upsertTimerSettingsRemote, DEFAULT_TIMER_SETTINGS as DEFAULT_SETTINGS, sanitizeTimerSettings } from '../lib/timer'
import { isRealtimeWrite } from '../services/realtimeService'

export function TimerSettingsProvider({ children }) {
  const { user } = useAuth()

  useEffect(() => {
    ensureSeedData()
  }, [])

  // Proactive cloud hydration on user session start if local settings haven't synced yet
  useEffect(() => {
    if (!user?.id) return
    let isMounted = true

    async function hydrateRemoteTimerSettings() {
      try {
        const local = await db.timerSettings.get('default')
        if (!local || !local.updatedAt) {
          const remote = await fetchTimerSettingsRemote(user.id)
          if (remote && isMounted) {
            const sanitized = sanitizeTimerSettings(remote)
            await db.timerSettings.put({
              ...sanitized,
              userId: user.id,
              updatedAt: remote.updatedAt || new Date().toISOString(),
            })
          }
        }
      } catch (err) {
        console.warn('[TimerSettingsProvider] Remote hydration notice:', err?.message || err)
      }
    }

    hydrateRemoteTimerSettings()
    return () => {
      isMounted = false
    }
  }, [user?.id])

  const dbSettings = useLiveQuery(async () => {
    try {
      const record = await db.timerSettings.get('default')
      return sanitizeTimerSettings(record)
    } catch (err) {
      console.warn('[TimerSettingsProvider] Error reading local timer settings:', err)
      return DEFAULT_SETTINGS
    }
  }, [])

  const settings = dbSettings || DEFAULT_SETTINGS

  // Immediate local update + cloud sync for configuration (preserves live timerState & adapts active duration)
  const updateSettings = async (newConfig) => {
    const now = new Date().toISOString()
    let newTimerState =
      newConfig.timerState !== undefined
        ? newConfig.timerState
        : settings.timerState
        ? { ...settings.timerState }
        : null

    if (newTimerState && newConfig.timerState === undefined) {
      const mode = newTimerState.mode || 'focus'
      const newDurationMins =
        mode === 'focus'
          ? (newConfig.focusDuration ?? settings.focusDuration)
          : mode === 'shortBreak'
          ? (newConfig.shortBreakDuration ?? settings.shortBreakDuration)
          : (newConfig.longBreakDuration ?? settings.longBreakDuration)

      const safeDurationMins = Number(newDurationMins)
      if (Number.isFinite(safeDurationMins) && safeDurationMins > 0) {
        const newConfiguredDuration = Math.round(safeDurationMins * 60)
        if (newTimerState.configuredDuration !== newConfiguredDuration) {
          newTimerState.configuredDuration = newConfiguredDuration
          newTimerState.totalSeconds = newConfiguredDuration
          newTimerState.actionId = crypto.randomUUID()
          newTimerState.lastActionAt = now

          if (newTimerState.status === 'paused') {
            const elapsed = Number(newTimerState.elapsedSeconds) || 0
            newTimerState.remainingSecondsWhenPaused = Math.max(0, newConfiguredDuration - elapsed)
          } else if (newTimerState.status === 'idle') {
            newTimerState.elapsedSeconds = 0
            newTimerState.remainingSecondsWhenPaused = newConfiguredDuration
          }
        }
      }

      if (newConfig.sessions) {
        newTimerState.totalSessions = Number(newConfig.sessions) || 4
      }
    }

    const updated = sanitizeTimerSettings({
      ...settings,
      ...newConfig,
      timerState: newTimerState,
      id: 'default',
      updatedAt: now,
    })
    await db.timerSettings.put(updated)

    if (user?.id && !isRealtimeWrite()) {
      try {
        await upsertTimerSettingsRemote(updated, user.id)
      } catch (err) {
        console.warn('[TimerSettingsProvider] Remote upsert error:', err?.message || err)
      }
    }
    return updated
  }

  // Update live timer state (running, paused, expectedEndAt, etc.) without clobbering configuration
  const updateTimerState = async (timerState) => {
    const now = new Date().toISOString()
    const updated = sanitizeTimerSettings({
      ...settings,
      timerState,
      id: 'default',
      updatedAt: now,
    })
    await db.timerSettings.put(updated)

    if (user?.id && !isRealtimeWrite()) {
      try {
        await upsertTimerSettingsRemote(updated, user.id)
      } catch (err) {
        console.warn('[TimerSettingsProvider] Remote timerState upsert error:', err?.message || err)
      }
    }
    return updated
  }

  return (
    <TimerSettingsContext.Provider value={{ settings, updateSettings, updateTimerState }}>
      {children}
    </TimerSettingsContext.Provider>
  )
}
