import { useState, useEffect, useCallback, useRef } from 'react'
import { useTimerSettings } from './useTimerSettings'
import { TimerSessionContext } from './TimerSessionContext'
import {
  getActiveSession,
  recordActiveSession,
  clearActiveSession,
  recordPomodoroSession,
} from '../services/timerService'
import { getServerNowMs } from '../lib/timer'

export function TimerSessionProvider({ children }) {
  const { settings, updateTimerState } = useTimerSettings()

  const [mode, setMode] = useState('focus') // 'focus' | 'shortBreak' | 'longBreak'
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentSession, setCurrentSession] = useState(1)
  const [taskName, setTaskName] = useState('')

  // Canonical timing anchor: virtual start timestamp in ms where elapsed = 0
  const [canonicalStartTime, setCanonicalStartTime] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Track latest actionId to detect and adopt remote realtime updates
  const [lastActionId, setLastActionId] = useState(null)
  const lastActionIdRef = useRef(null)
  const isAdvancingRef = useRef(false)

  // Active session object state & references for local Dexie caching
  const [activeSession, setActiveSession] = useState(null)
  const activeSessionRef = useRef(null)

  const updateActiveSession = (session) => {
    activeSessionRef.current = session
    setActiveSession(session)
  }

  // Keep lastActionIdRef in sync with state in effect (React 19 safe)
  useEffect(() => {
    lastActionIdRef.current = lastActionId
  }, [lastActionId])

  // Safe helper to calculate total duration seconds for a mode from settings
  const getModeDurationSeconds = useCallback(
    (currentMode) => {
      const focusMins = Number(settings?.focusDuration)
      const shortMins = Number(settings?.shortBreakDuration)
      const longMins = Number(settings?.longBreakDuration)

      const safeFocus = Number.isFinite(focusMins) && focusMins > 0 ? focusMins : 25
      const safeShort = Number.isFinite(shortMins) && shortMins > 0 ? shortMins : 5
      const safeLong = Number.isFinite(longMins) && longMins > 0 ? longMins : 15

      if (currentMode === 'focus') return Math.round(safeFocus * 60)
      if (currentMode === 'shortBreak') return Math.round(safeShort * 60)
      return Math.round(safeLong * 60)
    },
    [settings]
  )

  const targetDurationForMode = getModeDurationSeconds(mode)
  const [prevMode, setPrevMode] = useState(mode)
  const [prevTargetDuration, setPrevTargetDuration] = useState(targetDurationForMode)

  const [remainingSeconds, setRemainingSeconds] = useState(() => targetDurationForMode)
  const [totalSeconds, setTotalSeconds] = useState(() => targetDurationForMode)

  // Render-phase state adjustment when mode or settings change
  if (targetDurationForMode !== prevTargetDuration || mode !== prevMode) {
    setPrevTargetDuration(targetDurationForMode)
    setPrevMode(mode)

    if (!isRunning && !isPaused && !activeSession) {
      setTotalSeconds(targetDurationForMode)
      setRemainingSeconds(targetDurationForMode)
    } else if (isRunning && canonicalStartTime) {
      const nowMs = getServerNowMs()
      const elapsed = Math.max(0, Math.floor((nowMs - canonicalStartTime) / 1000))
      setTotalSeconds(targetDurationForMode)
      setRemainingSeconds(Math.max(0, targetDurationForMode - elapsed))
    } else if (isPaused) {
      setTotalSeconds(targetDurationForMode)
      setRemainingSeconds(Math.max(0, targetDurationForMode - elapsedSeconds))
    }
  }

  // Effect to synchronize updated active session and cloud state when totalSeconds changes while active
  useEffect(() => {
    if (!isRunning && !isPaused) return

    if (isRunning && canonicalStartTime) {
      const newExpectedEnd = new Date(canonicalStartTime + totalSeconds * 1000).toISOString()
      if (activeSessionRef.current) {
        const updatedActive = {
          ...activeSessionRef.current,
          duration: Math.round(totalSeconds / 60),
          durationSeconds: totalSeconds,
          expectedEndAt: newExpectedEnd,
        }
        recordActiveSession(updatedActive).catch(() => {})
        updateActiveSession(updatedActive)
      }

      if (updateTimerState) {
        const actionId = crypto.randomUUID()
        lastActionIdRef.current = actionId
        setLastActionId(actionId)
        updateTimerState({
          actionId,
          status: 'running',
          mode,
          currentSession,
          totalSessions: Number(settings?.sessions) || 4,
          canonicalStartTime,
          elapsedSeconds,
          configuredDuration: totalSeconds,
          totalSeconds,
          expectedEndAt: newExpectedEnd,
          taskName,
        }).catch(() => {})
      }
    } else if (isPaused) {
      if (activeSessionRef.current) {
        const updatedActive = {
          ...activeSessionRef.current,
          duration: Math.round(totalSeconds / 60),
          durationSeconds: totalSeconds,
          elapsedSeconds,
        }
        recordActiveSession(updatedActive).catch(() => {})
        updateActiveSession(updatedActive)
      }

      if (updateTimerState) {
        const actionId = crypto.randomUUID()
        lastActionIdRef.current = actionId
        setLastActionId(actionId)
        updateTimerState({
          actionId,
          status: 'paused',
          mode,
          currentSession,
          totalSessions: Number(settings?.sessions) || 4,
          canonicalStartTime: null,
          elapsedSeconds,
          remainingSecondsWhenPaused: remainingSeconds,
          configuredDuration: totalSeconds,
          totalSeconds,
          taskName,
        }).catch(() => {})
      }
    }
  }, [
    totalSeconds,
    isRunning,
    isPaused,
    canonicalStartTime,
    elapsedSeconds,
    remainingSeconds,
    mode,
    currentSession,
    settings?.sessions,
    taskName,
    updateTimerState,
  ])

  // 1. Initial Mount: Restore active session from cloud timerState or Dexie persistence
  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      // Prioritize cloud timerState if available
      const cloudTimerState = settings?.timerState
      if (cloudTimerState && cloudTimerState.actionId) {
        setLastActionId(cloudTimerState.actionId)
        const cloudMode = cloudTimerState.mode || 'focus'
        const cloudTotal =
          Number(cloudTimerState.configuredDuration) ||
          Number(cloudTimerState.totalSeconds) ||
          getModeDurationSeconds(cloudMode)

        setMode(cloudMode)
        setTotalSeconds(cloudTotal)
        setCurrentSession(Number(cloudTimerState.currentSession) || 1)
        if (cloudTimerState.taskName) setTaskName(cloudTimerState.taskName)

        if (cloudTimerState.status === 'running') {
          const nowMs = getServerNowMs()
          let canonStart = cloudTimerState.canonicalStartTime
          if (!canonStart && cloudTimerState.expectedEndAt) {
            const endMs = new Date(cloudTimerState.expectedEndAt).getTime()
            if (!isNaN(endMs)) {
              canonStart = endMs - cloudTotal * 1000
            }
          }
          if (!canonStart) {
            canonStart = nowMs - (Number(cloudTimerState.elapsedSeconds) || 0) * 1000
          }

          const elapsed = Math.max(0, Math.floor((nowMs - canonStart) / 1000))
          const remaining = Math.max(0, cloudTotal - elapsed)

          if (remaining > 0) {
            setCanonicalStartTime(canonStart)
            setElapsedSeconds(elapsed)
            setRemainingSeconds(remaining)
            setIsRunning(true)
            setIsPaused(false)
            return
          }
        } else if (cloudTimerState.status === 'paused') {
          const elapsed = Number(cloudTimerState.elapsedSeconds) || 0
          const remaining =
            cloudTimerState.remainingSecondsWhenPaused !== undefined &&
            cloudTimerState.remainingSecondsWhenPaused !== null
              ? Number(cloudTimerState.remainingSecondsWhenPaused)
              : Math.max(0, cloudTotal - elapsed)

          setCanonicalStartTime(null)
          setElapsedSeconds(elapsed)
          setRemainingSeconds(remaining)
          setIsRunning(false)
          setIsPaused(true)
          return
        }
      }

      // Fall back to local Dexie active session
      const persisted = await getActiveSession()
      if (!isMounted || !persisted) return

      const modeKey =
        persisted.sessionType === 'short_break'
          ? 'shortBreak'
          : persisted.sessionType === 'long_break'
          ? 'longBreak'
          : 'focus'

      const configuredMins = Number(persisted.configuredDuration)
      const safeConfiguredMins =
        Number.isFinite(configuredMins) && configuredMins > 0 ? configuredMins : 25
      const configuredTotal = safeConfiguredMins * 60

      setMode(modeKey)
      setTotalSeconds(configuredTotal)
      setCurrentSession(Number(persisted.currentSession) || 1)
      if (persisted.taskName) setTaskName(persisted.taskName)

      updateActiveSession(persisted)

      if (persisted.status === 'paused') {
        const remaining =
          Number.isFinite(Number(persisted.remainingSecondsWhenPaused)) &&
          persisted.remainingSecondsWhenPaused >= 0
            ? Number(persisted.remainingSecondsWhenPaused)
            : configuredTotal
        const elapsed = Math.max(0, configuredTotal - remaining)
        setCanonicalStartTime(null)
        setElapsedSeconds(elapsed)
        setRemainingSeconds(remaining)
        setIsRunning(false)
        setIsPaused(true)
      } else if (persisted.status === 'active' && persisted.expectedEndAt) {
        const endMs = new Date(persisted.expectedEndAt).getTime()
        const nowMs = getServerNowMs()
        const diffSeconds = !isNaN(endMs) ? Math.max(0, Math.round((endMs - nowMs) / 1000)) : 0

        if (diffSeconds > 0) {
          const canonStart = endMs - configuredTotal * 1000
          const elapsed = Math.max(0, configuredTotal - diffSeconds)
          setCanonicalStartTime(canonStart)
          setElapsedSeconds(elapsed)
          setRemainingSeconds(diffSeconds)
          setIsRunning(true)
          setIsPaused(false)
        } else {
          // Session completed while tab was closed
          if (modeKey === 'focus') {
            await recordPomodoroSession({
              taskId: persisted.taskId,
              duration: safeConfiguredMins,
              sessionType: 'focus',
            })
          }
          await clearActiveSession()
          updateActiveSession(null)
          setIsRunning(false)
          setIsPaused(false)
          const resetDuration = getModeDurationSeconds(modeKey)
          setRemainingSeconds(resetDuration)
          setTotalSeconds(resetDuration)
          setCanonicalStartTime(null)
          setElapsedSeconds(0)
        }
      }
    }

    restoreSession()

    return () => {
      isMounted = false
    }
  }, [getModeDurationSeconds]) // eslint-disable-line react-hooks/exhaustive-deps

  // 2. React to Remote Realtime changes in settings.timerState during render phase
  const remoteState = settings?.timerState
  if (remoteState && remoteState.actionId && remoteState.actionId !== lastActionId) {
    setLastActionId(remoteState.actionId)

    const targetMode = remoteState.mode || 'focus'
    const targetConfigured =
      Number(remoteState.configuredDuration) ||
      Number(remoteState.totalSeconds) ||
      getModeDurationSeconds(targetMode)
    const targetSession = Number(remoteState.currentSession) || 1

    setMode(targetMode)
    setTotalSeconds(targetConfigured)
    setCurrentSession(targetSession)
    if (remoteState.taskName !== undefined) setTaskName(remoteState.taskName)

    if (remoteState.status === 'running') {
      const nowMs = getServerNowMs()
      let canonStart = remoteState.canonicalStartTime
      if (!canonStart && remoteState.expectedEndAt) {
        const endMs = new Date(remoteState.expectedEndAt).getTime()
        if (!isNaN(endMs)) {
          canonStart = endMs - targetConfigured * 1000
        }
      }
      if (!canonStart) {
        canonStart = nowMs - (Number(remoteState.elapsedSeconds) || 0) * 1000
      }

      const elapsed = Math.max(0, Math.floor((nowMs - canonStart) / 1000))
      const remaining = Math.max(0, targetConfigured - elapsed)

      setCanonicalStartTime(canonStart)
      setElapsedSeconds(elapsed)
      setRemainingSeconds(remaining)
      setIsRunning(remaining > 0)
      setIsPaused(false)
    } else if (remoteState.status === 'paused') {
      const elapsed = Number(remoteState.elapsedSeconds) || 0
      const remaining =
        remoteState.remainingSecondsWhenPaused !== undefined &&
        remoteState.remainingSecondsWhenPaused !== null
          ? Number(remoteState.remainingSecondsWhenPaused)
          : Math.max(0, targetConfigured - elapsed)

      setCanonicalStartTime(null)
      setElapsedSeconds(elapsed)
      setRemainingSeconds(remaining)
      setIsRunning(false)
      setIsPaused(true)
    } else {
      // 'idle'
      setCanonicalStartTime(null)
      setElapsedSeconds(0)
      setRemainingSeconds(targetConfigured)
      setIsRunning(false)
      setIsPaused(false)
    }
  }

  // 3. Natural Session Completion (00:00 reached) with optimistic deduplication
  const handleSessionCompletion = useCallback(async () => {
    if (isAdvancingRef.current) return
    isAdvancingRef.current = true

    try {
      // Optimistic check: if remote state already advanced, do not advance again
      const currentCloudState = settings?.timerState
      if (
        currentCloudState &&
        currentCloudState.actionId &&
        currentCloudState.actionId !== lastActionIdRef.current
      ) {
        return
      }

      setIsRunning(false)
      setIsPaused(false)

      const actionId = crypto.randomUUID()
      lastActionIdRef.current = actionId
      setLastActionId(actionId)

      const currentTotal = totalSeconds
      const currentMode = mode
      const currentSess = currentSession
      const currentTask = taskName
      const currentTaskId = activeSessionRef.current?.taskId || null
      const totalCycles = Number(settings?.sessions) || 4

      if (currentMode === 'focus') {
        const focusMins = Math.round(currentTotal / 60) || 25
        const sessionStartedAt =
          activeSessionRef.current?.startedAt ||
          new Date(getServerNowMs() - currentTotal * 1000).toISOString()
        const sessionId = `focus-${sessionStartedAt}`

        // Record completed focus session with deterministic ID (deduplicated across instances)
        await recordPomodoroSession({
          taskId: currentTaskId,
          duration: focusMins,
          sessionType: 'focus',
          startedAt: sessionStartedAt,
          taskTitle: currentTask,
          sessionId,
        })

        await clearActiveSession()
        updateActiveSession(null)

        const nextMode = currentSess < totalCycles ? 'shortBreak' : 'longBreak'
        const breakSecs = getModeDurationSeconds(nextMode)

        setMode(nextMode)
        setTotalSeconds(breakSecs)
        setRemainingSeconds(breakSecs)
        setCanonicalStartTime(null)
        setElapsedSeconds(0)

        const autoStart = Boolean(settings?.autoStartBreaks)
        const nextStatus = autoStart ? 'running' : 'idle'
        const nextStartTime = autoStart ? getServerNowMs() : null

        if (autoStart) {
          setIsRunning(true)
          setCanonicalStartTime(nextStartTime)
        }

        if (updateTimerState) {
          await updateTimerState({
            actionId,
            status: nextStatus,
            mode: nextMode,
            currentSession: currentSess,
            totalSessions: totalCycles,
            canonicalStartTime: nextStartTime,
            elapsedSeconds: 0,
            configuredDuration: breakSecs,
            totalSeconds: breakSecs,
            remainingSecondsWhenPaused: breakSecs,
            taskName: '',
            taskId: null,
            startedAt: autoStart ? new Date(nextStartTime).toISOString() : null,
            lastActionAt: new Date().toISOString(),
          })
        }
      } else {
        // Break session completed
        await clearActiveSession()
        updateActiveSession(null)

        const nextSession =
          currentMode === 'shortBreak'
            ? currentSess < totalCycles
              ? currentSess + 1
              : 1
            : 1
        const focusSecs = getModeDurationSeconds('focus')

        setCurrentSession(nextSession)
        setMode('focus')
        setTotalSeconds(focusSecs)
        setRemainingSeconds(focusSecs)
        setCanonicalStartTime(null)
        setElapsedSeconds(0)

        const autoStart = Boolean(settings?.autoStartPomo)
        const nextStatus = autoStart ? 'running' : 'idle'
        const nextStartTime = autoStart ? getServerNowMs() : null

        if (autoStart) {
          setIsRunning(true)
          setCanonicalStartTime(nextStartTime)
        }

        if (updateTimerState) {
          await updateTimerState({
            actionId,
            status: nextStatus,
            mode: 'focus',
            currentSession: nextSession,
            totalSessions: totalCycles,
            canonicalStartTime: nextStartTime,
            elapsedSeconds: 0,
            configuredDuration: focusSecs,
            totalSeconds: focusSecs,
            remainingSecondsWhenPaused: focusSecs,
            taskName: '',
            taskId: null,
            startedAt: autoStart ? new Date(nextStartTime).toISOString() : null,
            lastActionAt: new Date().toISOString(),
          })
        }
      }
    } finally {
      setTimeout(() => {
        isAdvancingRef.current = false
      }, 500)
    }
  }, [settings, mode, currentSession, totalSeconds, taskName, getModeDurationSeconds, updateTimerState])

  // 4. Timestamp-based Countdown Effect (Ticks locally every 1s in memory, ZERO continuous DB calls)
  useEffect(() => {
    let interval = null

    if (isRunning && canonicalStartTime) {
      interval = setInterval(() => {
        const nowMs = getServerNowMs()
        const elapsed = Math.max(0, Math.floor((nowMs - canonicalStartTime) / 1000))
        const remaining = Math.max(0, totalSeconds - elapsed)

        setRemainingSeconds(remaining)
        setElapsedSeconds(elapsed)

        if (remaining <= 0) {
          handleSessionCompletion()
        }
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, canonicalStartTime, totalSeconds, handleSessionCompletion])

  // 5. Start Session Action
  const startTimer = async (
    overrideTaskName,
    overrideTaskId,
    overrideMode,
    overrideDurationMinutes
  ) => {
    const targetMode = overrideMode || mode
    const targetDurationMinutes =
      Number(overrideDurationMinutes) || getModeDurationSeconds(targetMode) / 60
    const targetTaskName = overrideTaskName !== undefined ? overrideTaskName : taskName
    const targetTaskId =
      overrideTaskId !== undefined ? overrideTaskId : activeSessionRef.current?.taskId || null

    const nowMs = getServerNowMs()
    const durationSeconds = Math.round(targetDurationMinutes * 60)
    const endMs = nowMs + durationSeconds * 1000

    const actionId = crypto.randomUUID()
    lastActionIdRef.current = actionId
    setLastActionId(actionId)

    const sessionType =
      targetMode === 'shortBreak'
        ? 'short_break'
        : targetMode === 'longBreak'
        ? 'long_break'
        : 'focus'

    const sessionObj = {
      sessionId: `session-${Date.now()}`,
      taskId: targetTaskId,
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
    setCanonicalStartTime(nowMs)
    setElapsedSeconds(0)
    setIsRunning(true)
    setIsPaused(false)

    if (updateTimerState) {
      await updateTimerState({
        actionId,
        status: 'running',
        mode: targetMode,
        currentSession,
        totalSessions: Number(settings?.sessions) || 4,
        canonicalStartTime: nowMs,
        elapsedSeconds: 0,
        configuredDuration: durationSeconds,
        totalSeconds: durationSeconds,
        remainingSecondsWhenPaused: null,
        taskName: targetTaskName,
        taskId: targetTaskId,
        startedAt: new Date(nowMs).toISOString(),
        lastActionAt: new Date().toISOString(),
      })
    }
  }

  // 6. Pause Timer Action
  const pauseTimer = async () => {
    if (!isRunning) return

    const nowMs = getServerNowMs()
    const currentElapsed = canonicalStartTime
      ? Math.max(0, Math.floor((nowMs - canonicalStartTime) / 1000))
      : elapsedSeconds
    const safeRemaining = Math.max(0, totalSeconds - currentElapsed)

    const actionId = crypto.randomUUID()
    lastActionIdRef.current = actionId
    setLastActionId(actionId)

    const sessionType =
      mode === 'shortBreak' ? 'short_break' : mode === 'longBreak' ? 'long_break' : 'focus'

    const sessionObj = {
      ...(activeSessionRef.current || {}),
      taskName,
      sessionType,
      configuredDuration: Math.round(totalSeconds / 60) || 25,
      pausedAt: new Date(nowMs).toISOString(),
      remainingSecondsWhenPaused: safeRemaining,
      elapsedSeconds: currentElapsed,
      canonicalStartTime: null,
      status: 'paused',
      currentSession,
    }

    updateActiveSession(sessionObj)
    await recordActiveSession(sessionObj)

    setIsRunning(false)
    setIsPaused(true)
    setCanonicalStartTime(null)
    setElapsedSeconds(currentElapsed)
    setRemainingSeconds(safeRemaining)

    if (updateTimerState) {
      await updateTimerState({
        actionId,
        status: 'paused',
        mode,
        currentSession,
        totalSessions: Number(settings?.sessions) || 4,
        canonicalStartTime: null,
        elapsedSeconds: currentElapsed,
        configuredDuration: totalSeconds,
        totalSeconds,
        remainingSecondsWhenPaused: safeRemaining,
        taskName,
        taskId: activeSessionRef.current?.taskId || null,
        startedAt: activeSessionRef.current?.startedAt || null,
        lastActionAt: new Date().toISOString(),
      })
    }
  }

  // 7. Resume Timer Action
  const resumeTimer = async () => {
    const nowMs = getServerNowMs()
    const currentElapsed = elapsedSeconds
    const virtualStartTime = nowMs - currentElapsed * 1000
    const safeRemaining = Math.max(0, totalSeconds - currentElapsed)
    const endMs = nowMs + safeRemaining * 1000

    const actionId = crypto.randomUUID()
    lastActionIdRef.current = actionId
    setLastActionId(actionId)

    const sessionType =
      mode === 'shortBreak' ? 'short_break' : mode === 'longBreak' ? 'long_break' : 'focus'

    const sessionObj = {
      ...(activeSessionRef.current || {}),
      taskName,
      sessionType,
      configuredDuration: Math.round(totalSeconds / 60) || 25,
      expectedEndAt: new Date(endMs).toISOString(),
      pausedAt: null,
      remainingSecondsWhenPaused: null,
      elapsedSeconds: currentElapsed,
      canonicalStartTime: virtualStartTime,
      status: 'active',
      currentSession,
    }

    updateActiveSession(sessionObj)
    await recordActiveSession(sessionObj)

    setCanonicalStartTime(virtualStartTime)
    setIsRunning(true)
    setIsPaused(false)
    setRemainingSeconds(safeRemaining)

    if (updateTimerState) {
      await updateTimerState({
        actionId,
        status: 'running',
        mode,
        currentSession,
        totalSessions: Number(settings?.sessions) || 4,
        canonicalStartTime: virtualStartTime,
        elapsedSeconds: currentElapsed,
        configuredDuration: totalSeconds,
        totalSeconds,
        remainingSecondsWhenPaused: null,
        taskName,
        taskId: activeSessionRef.current?.taskId || null,
        startedAt: activeSessionRef.current?.startedAt || new Date(virtualStartTime).toISOString(),
        lastActionAt: new Date().toISOString(),
      })
    }
  }

  // 8. Toggle Play/Pause
  const togglePlayPause = () => {
    if (isRunning) {
      pauseTimer()
    } else if (isPaused) {
      resumeTimer()
    } else {
      startTimer()
    }
  }

  // 9. Reset Timer Action
  const resetTimer = async () => {
    // If resetting after active focus work (>= 60 seconds), save the actual focus session so progress is preserved
    if (mode === 'focus' && elapsedSeconds >= 60) {
      const sessionStartedAt =
        activeSessionRef.current?.startedAt ||
        new Date(getServerNowMs() - elapsedSeconds * 1000).toISOString()
      recordPomodoroSession({
        taskId: activeSessionRef.current?.taskId || null,
        duration: Math.round((elapsedSeconds / 60) * 10) / 10,
        durationSeconds: elapsedSeconds,
        sessionType: 'focus',
        startedAt: sessionStartedAt,
        taskTitle: taskName || '',
        sessionId: `focus-${sessionStartedAt}`,
        completed: false,
      }).catch((err) =>
        console.warn('[TimerSessionProvider] Failed to record partial focus session on reset:', err)
      )
    }

    setIsRunning(false)
    setIsPaused(false)
    setCanonicalStartTime(null)
    setElapsedSeconds(0)

    const actionId = crypto.randomUUID()
    lastActionIdRef.current = actionId
    setLastActionId(actionId)

    await clearActiveSession()
    updateActiveSession(null)

    const durationSecs = getModeDurationSeconds(mode)
    setRemainingSeconds(durationSecs)
    setTotalSeconds(durationSecs)

    if (updateTimerState) {
      await updateTimerState({
        actionId,
        status: 'idle',
        mode,
        currentSession,
        totalSessions: Number(settings?.sessions) || 4,
        canonicalStartTime: null,
        elapsedSeconds: 0,
        configuredDuration: durationSecs,
        totalSeconds: durationSecs,
        remainingSecondsWhenPaused: durationSecs,
        taskName: '',
        taskId: null,
        startedAt: null,
        lastActionAt: new Date().toISOString(),
      })
    }
  }

  // 10. Skip / Next Session Action
  const skipTimer = async () => {
    setIsRunning(false)
    setIsPaused(false)
    setCanonicalStartTime(null)
    setElapsedSeconds(0)

    const actionId = crypto.randomUUID()
    lastActionIdRef.current = actionId
    setLastActionId(actionId)

    await clearActiveSession()
    updateActiveSession(null)

    const totalCycles = Number(settings?.sessions) || 4

    let nextMode
    let nextSession

    if (mode === 'focus') {
      nextMode = currentSession < totalCycles ? 'shortBreak' : 'longBreak'
      nextSession = currentSession
    } else if (mode === 'shortBreak') {
      nextMode = 'focus'
      nextSession = currentSession < totalCycles ? currentSession + 1 : 1
    } else {
      nextMode = 'focus'
      nextSession = 1
    }

    const nextDuration = getModeDurationSeconds(nextMode)

    setMode(nextMode)
    setCurrentSession(nextSession)
    setTotalSeconds(nextDuration)
    setRemainingSeconds(nextDuration)

    if (updateTimerState) {
      await updateTimerState({
        actionId,
        status: 'idle',
        mode: nextMode,
        currentSession: nextSession,
        totalSessions: totalCycles,
        canonicalStartTime: null,
        elapsedSeconds: 0,
        configuredDuration: nextDuration,
        totalSeconds: nextDuration,
        remainingSecondsWhenPaused: nextDuration,
        taskName: '',
        taskId: null,
        startedAt: null,
        lastActionAt: new Date().toISOString(),
      })
    }
  }

  // 11. Attached Task Name Change handler
  const handleSetTaskName = useCallback(
    (newTaskName) => {
      setTaskName(newTaskName)
      const durationSecs = getModeDurationSeconds(mode)
      const stateToUpdate = settings?.timerState || {
        actionId: crypto.randomUUID(),
        status: isRunning ? 'running' : isPaused ? 'paused' : 'idle',
        mode,
        currentSession,
        totalSessions: Number(settings?.sessions) || 4,
        canonicalStartTime,
        elapsedSeconds,
        configuredDuration: totalSeconds || durationSecs,
        totalSeconds: totalSeconds || durationSecs,
        remainingSecondsWhenPaused: remainingSeconds,
        taskId: null,
      }

      if (updateTimerState) {
        updateTimerState({
          ...stateToUpdate,
          taskName: newTaskName,
          lastActionAt: new Date().toISOString(),
        })
      }
    },
    [
      settings?.timerState,
      settings?.sessions,
      mode,
      currentSession,
      canonicalStartTime,
      elapsedSeconds,
      totalSeconds,
      remainingSeconds,
      isRunning,
      isPaused,
      getModeDurationSeconds,
      updateTimerState,
    ]
  )

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
        setTaskName: handleSetTaskName,
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

