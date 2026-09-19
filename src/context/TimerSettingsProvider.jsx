import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ensureSeedData } from '../db/db'
import { TimerSettingsContext } from './TimerSettingsContext'
import { useAuth } from './useAuth'
import { upsertTimerSettingsRemote } from '../lib/timer'
import { isRealtimeWrite } from '../services/realtimeService'

const DEFAULT_SETTINGS = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessions: 4,
  autoStartBreaks: false,
  autoStartPomo: false,
  timerState: null,
}

export function TimerSettingsProvider({ children }) {
  const { user } = useAuth()

  useEffect(() => {
    ensureSeedData()
  }, [])

  // NOTE: Timer settings are synchronized centrally via syncCoordinator
  // and AuthProvider, and received via realtimeService. Dexie is the local reactive
  // source of truth, watched below via useLiveQuery. No duplicate REST calls needed here.

  const dbSettings = useLiveQuery(async () => {
    const record = await db.timerSettings.get('default')
    return record || DEFAULT_SETTINGS
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

    const updated = {
      ...settings,
      ...newConfig,
      timerState: newTimerState,
      id: 'default',
      updatedAt: now,
    }
    await db.timerSettings.put(updated)

    if (user?.id && !isRealtimeWrite()) {
      await upsertTimerSettingsRemote(updated, user.id)
    }
  }

  // Update live timer state (running, paused, expectedEndAt, etc.) without clobbering configuration
  const updateTimerState = async (timerState) => {
    const now = new Date().toISOString()
    const updated = {
      ...settings,
      timerState,
      id: 'default',
      updatedAt: now,
    }
    await db.timerSettings.put(updated)

    if (user?.id && !isRealtimeWrite()) {
      await upsertTimerSettingsRemote(updated, user.id)
    }
  }

  return (
    <TimerSettingsContext.Provider value={{ settings, updateSettings, updateTimerState }}>
      {children}
    </TimerSettingsContext.Provider>
  )
}
