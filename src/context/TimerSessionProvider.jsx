import { useState, useEffect, useCallback, useRef } from 'react'
import { useTimerSettings } from './useTimerSettings'
import { TimerSessionContext } from './TimerSessionContext'
import {
  getActiveSession,
  recordActiveSession,
  clearActiveSession,
  recordPomodoroSession,
} from '../services/timerService'

export function TimerSessionProvider({ children }) {
  const { settings } = useTimerSettings()

  const [mode, setMode] = useState('focus') // 'focus' | 'shortBreak' | 'longBreak'
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentSession, setCurrentSession] = useState(1)
  const [taskName, setTaskName] = useState('')

  // Active session object state & reference
  const [activeSession, setActiveSession] = useState(null)
  const activeSessionRef = useRef(null)
  const expectedEndMsRef = useRef(null)

  const updateActiveSession = (session) => {
    activeSessionRef.current = session
    setActiveSession(session)
  }

  // Helper to calculate total duration seconds for a mode from settings
  const getModeDurationSeconds = useCallback(
    (currentMode) => {
      if (currentMode === 'focus') return settings.focusDuration * 60
      if (currentMode === 'shortBreak') return settings.shortBreakDuration * 60
      return settings.longBreakDuration * 60
    },
    [settings]
  )

  const [remainingSeconds, setRemainingSeconds] = useState(() => getModeDurationSeconds('focus'))
  const [totalSeconds, setTotalSeconds] = useState(() => getModeDurationSeconds('focus'))

  // 1. Initial Mount: Restore active session from Supabase / Dexie persistence
  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      const persisted = await getActiveSession()
      if (!isMounted || !persisted) return

      const modeKey =
        persisted.sessionType === 'short_break'
          ? 'shortBreak'
          : persisted.sessionType === 'long_break'
          ? 'longBreak'
          : 'focus'

      const configuredTotal = (persisted.configuredDuration || 25) * 60
      setMode(modeKey)
      setTotalSeconds(configuredTotal)
      setCurrentSession(persisted.currentSession || 1)
      if (persisted.taskName) setTaskName(persisted.taskName)

      updateActiveSession(persisted)

      if (persisted.status === 'paused') {
        const remaining = persisted.remainingSecondsWhenPaused !== null ? persisted.remainingSecondsWhenPaused : configuredTotal
        setRemainingSeconds(remaining)
        setIsRunning(false)
        setIsPaused(true)
      } else if (persisted.status === 'active' && persisted.expectedEndAt) {
        const endMs = new Date(persisted.expectedEndAt).getTime()
        const nowMs = Date.now()
        const diffSeconds = Math.max(0, Math.round((endMs - nowMs) / 1000))

        expectedEndMsRef.current = endMs

        if (diffSeconds > 0) {
          setRemainingSeconds(diffSeconds)
          setIsRunning(true)
          setIsPaused(false)
        } else {
          // Session completed while away
          if (modeKey === 'focus') {
            await recordPomodoroSession({
              taskId: persisted.taskId,
              duration: persisted.configuredDuration || settings.focusDuration,
              sessionType: 'focus',
            })
          }
          await clearActiveSession()
          updateActiveSession(null)
          setIsRunning(false)
          setIsPaused(false)
          setRemainingSeconds(0)
        }
      }
    }

    restoreSession()

    return () => {
      isMounted = false
    }
  }, [settings.focusDuration])

  // 2. Advance to Next Session Stage
  const advanceSession = useCallback(async () => {
    setIsRunning(false)
    setIsPaused(false)

    if (mode === 'focus') {
      await recordPomodoroSession({
        taskId: activeSessionRef.current?.taskId || null,
        duration: settings.focusDuration,
        sessionType: 'focus',
      })
      await clearActiveSession()
      updateActiveSession(null)

      if (currentSession < settings.sessions) {
        const breakSecs = settings.shortBreakDuration * 60
        setMode('shortBreak')
        setTotalSeconds(breakSecs)
        setRemainingSeconds(breakSecs)
      } else {
        const longBreakSecs = settings.longBreakDuration * 60
        setMode('longBreak')
        setTotalSeconds(longBreakSecs)
        setRemainingSeconds(longBreakSecs)
      }
    } else if (mode === 'shortBreak') {
      await clearActiveSession()
      updateActiveSession(null)
      const focusSecs = settings.focusDuration * 60
      setCurrentSession((prev) => prev + 1)
      setMode('focus')
      setTotalSeconds(focusSecs)
      setRemainingSeconds(focusSecs)
    } else if (mode === 'longBreak') {
      await clearActiveSession()
      updateActiveSession(null)
      const focusSecs = settings.focusDuration * 60
      setCurrentSession(1)
      setMode('focus')
      setTotalSeconds(focusSecs)
      setRemainingSeconds(focusSecs)
    }
  }, [mode, currentSession, settings])

  // 3. Timestamp-based Countdown Effect (updates display every second from expectedEndMsRef)
  useEffect(() => {
    let interval = null

    if (isRunning && expectedEndMsRef.current) {
      interval = setInterval(() => {
        const nowMs = Date.now()
        const diffSeconds = Math.max(0, Math.round((expectedEndMsRef.current - nowMs) / 1000))

        setRemainingSeconds(diffSeconds)

        if (diffSeconds <= 0) {
          advanceSession()
        }
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, advanceSession])

  // 4. Start / Resume Session Action
  const startTimer = async (overrideTaskName, overrideTaskId, overrideMode, overrideDurationMinutes) => {
    const targetMode = overrideMode || mode
    const targetDurationMinutes = overrideDurationMinutes || (getModeDurationSeconds(targetMode) / 60)
    const targetTaskName = overrideTaskName !== undefined ? overrideTaskName : taskName

    const nowMs = Date.now()
    const durationSeconds = targetDurationMinutes * 60
    const endMs = nowMs + durationSeconds * 1000

    expectedEndMsRef.current = endMs

    const sessionType = targetMode === 'shortBreak' ? 'short_break' : targetMode === 'longBreak' ? 'long_break' : 'focus'

    const sessionObj = {
      sessionId: `session-${Date.now()}`,
      taskId: overrideTaskId || null,
      taskName: targetTaskName,
      sessionType,
      configuredDuration: targetDurationMinutes,
      startedAt: new Date(nowMs).toISOString(),
      expectedEndAt: new Date(endMs).toISOString(),
      pausedAt: null,
      remainingSecondsWhenPaused: null,
      status: 'active',
      currentSession,
    }

    updateActiveSession(sessionObj)
    await recordActiveSession(sessionObj)

    setMode(targetMode)
    setTaskName(targetTaskName)
    setTotalSeconds(durationSeconds)
    setRemainingSeconds(durationSeconds)
    setIsRunning(true)
    setIsPaused(false)
  }

  // 5. Pause Timer Action
  const pauseTimer = async () => {
    if (!isRunning) return

    const nowMs = Date.now()
    const currentRemaining = expectedEndMsRef.current
      ? Math.max(0, Math.round((expectedEndMsRef.current - nowMs) / 1000))
      : remainingSeconds

    const sessionType = mode === 'shortBreak' ? 'short_break' : mode === 'longBreak' ? 'long_break' : 'focus'

    const sessionObj = {
      ...(activeSessionRef.current || {}),
      taskName,
      sessionType,
      configuredDuration: totalSeconds / 60,
      pausedAt: new Date(nowMs).toISOString(),
      remainingSecondsWhenPaused: currentRemaining,
      status: 'paused',
      currentSession,
    }

    updateActiveSession(sessionObj)
    await recordActiveSession(sessionObj)

    setIsRunning(false)
    setIsPaused(true)
    setRemainingSeconds(currentRemaining)
  }

  // 6. Resume Timer Action
  const resumeTimer = async () => {
    const currentRemaining = remainingSeconds
    const nowMs = Date.now()
    const endMs = nowMs + currentRemaining * 1000

    expectedEndMsRef.current = endMs

    const sessionType = mode === 'shortBreak' ? 'short_break' : mode === 'longBreak' ? 'long_break' : 'focus'

    const sessionObj = {
      ...(activeSessionRef.current || {}),
      taskName,
      sessionType,
      configuredDuration: totalSeconds / 60,
      expectedEndAt: new Date(endMs).toISOString(),
      pausedAt: null,
      remainingSecondsWhenPaused: null,
      status: 'active',
      currentSession,
    }

    updateActiveSession(sessionObj)
    await recordActiveSession(sessionObj)

    setIsRunning(true)
    setIsPaused(false)
  }

  // 7. Toggle Play/Pause
  const togglePlayPause = () => {
    if (isRunning) {
      pauseTimer()
    } else if (isPaused) {
      resumeTimer()
    } else {
      startTimer()
    }
  }

  // 8. Reset Timer Action
  const resetTimer = async () => {
    setIsRunning(false)
    setIsPaused(false)

    await clearActiveSession()
    updateActiveSession(null)

    const durationSecs = getModeDurationSeconds(mode)
    setRemainingSeconds(durationSecs)
    setTotalSeconds(durationSecs)
  }

  // 9. Skip Stage Action
  const skipTimer = () => {
    advanceSession()
  }

  return (
    <TimerSessionContext.Provider
      value={{
        mode,
        setMode,
        isRunning,
        isPaused,
        remainingSeconds,
        totalSeconds,
        currentSession,
        taskName,
        setTaskName,
        startTimer,
        togglePlayPause,
        pauseTimer,
        resumeTimer,
        resetTimer,
        skipTimer,
        activeSession,
      }}
    >
      {children}
    </TimerSessionContext.Provider>
  )
}
