import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTimerSettings } from './useTimerSettings'
import { TimerSessionContext } from './TimerSessionContext'
import { useToast } from './useToast'
import {
  getActiveSession,
  recordActiveSession,
  clearActiveSession,
  recordPomodoroSession,
} from '../services/timerService'
import { getServerNowMs } from '../lib/timer'
import { db } from '../db/db'
import { markPlanBlockCompleted } from '../services/plannerPersistenceService'
import { notifyTimerFiveMinuteWarning, notifyTimerEnded } from '../services/notificationService'
import { mapTaskToRow } from '../lib/tasks'
import { enqueueMutation } from '../services/syncQueue'

export function TimerSessionProvider({ children }) {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { settings, updateTimerState, updateSettings } = useTimerSettings()

  const [mode, setMode] = useState('focus') // 'focus' | 'shortBreak' | 'longBreak'
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentSession, setCurrentSession] = useState(1)
  const [taskName, setTaskName] = useState('')

  // Track if 5-minute warning was already notified for current session
  const hasWarned5mRef = useRef(false)

  // Plan My Day block highlight after completion
  const [justCompletedBlockId, setJustCompletedBlockId] = useState(() => {
    try {
      return sessionStorage.getItem('nocturn_just_completed_block') || null
    } catch {
      return null
    }
  })

  // Canonical timing anchor: virtual start timestamp in ms where elapsed = 0
  const [canonicalStartTime, setCanonicalStartTime] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Track latest actionId to detect and adopt remote realtime updates
  const lastActionIdRef = useRef(null)
  const isAdvancingRef = useRef(false)

  // Active session object state & references for local Dexie caching
  const [activeSession, setActiveSession] = useState(null)
  const activeSessionRef = useRef(null)

  const updateActiveSession = (session) => {
    activeSessionRef.current = session
    setActiveSession(session)
  }

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

  // Render-phase state adjustment when mode changes or settings change
  if (mode !== prevMode) {
    setPrevMode(mode)
    setPrevTargetDuration(targetDurationForMode)
    if (!isRunning && !isPaused && !activeSession) {
      setTotalSeconds(targetDurationForMode)
      setRemainingSeconds(targetDurationForMode)
    }
  } else if (targetDurationForMode !== prevTargetDuration) {
    setPrevTargetDuration(targetDurationForMode)
    if (!isRunning && !isPaused && !activeSession) {
      setTotalSeconds(targetDurationForMode)
      setRemainingSeconds(targetDurationForMode)
    } else {
      // Dynamic duration adjustment while running or paused (Part 13):
      // newRemaining = newTotal - elapsed
      const newTotal = targetDurationForMode
      const elapsed = elapsedSeconds
      const newRemaining = Math.max(0, newTotal - elapsed)
      setTotalSeconds(newTotal)
      setRemainingSeconds(newRemaining)
    }
  }

  // Synchronize duration adjustments while running or paused across instances
  const prevRunningTotalRef = useRef(totalSeconds)
  useEffect(() => {
    if (prevRunningTotalRef.current !== totalSeconds) {
      prevRunningTotalRef.current = totalSeconds
      if ((isRunning || isPaused) && updateTimerState) {
        const actionId = crypto.randomUUID()
        lastActionIdRef.current = actionId
        updateTimerState({
          actionId,
          totalSeconds,
          configuredDuration: totalSeconds,
          remainingSecondsWhenPaused: isPaused ? remainingSeconds : undefined,
          lastActionAt: new Date().toISOString(),
        }).catch(() => {})
      }
    }
  }, [totalSeconds, isRunning, isPaused, remainingSeconds, updateTimerState])



  // 1. Initial Mount: Restore active session from cloud timerState or Dexie persistence
  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      // Prioritize cloud timerState if available
      const cloudTimerState = settings?.timerState
      if (cloudTimerState && cloudTimerState.actionId) {
        lastActionIdRef.current = cloudTimerState.actionId
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

  // 2. React to Remote Realtime changes in settings.timerState
  useEffect(() => {
    let isCurrent = true
    const remoteState = settings?.timerState
    if (!remoteState?.actionId || remoteState.actionId === lastActionIdRef.current) {
      return
    }

    queueMicrotask(() => {
      if (!isCurrent) return
      if (!remoteState?.actionId || remoteState.actionId === lastActionIdRef.current) return

      lastActionIdRef.current = remoteState.actionId

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
        // 'idle' / stopped
        setCanonicalStartTime(null)
        setElapsedSeconds(0)
        setRemainingSeconds(targetConfigured)
        setIsRunning(false)
        setIsPaused(false)
        clearActiveSession().catch(() => {})
        updateActiveSession(null)
      }
    })

    return () => {
      isCurrent = false
    }
  }, [settings?.timerState, getModeDurationSeconds])

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
      setCanonicalStartTime(null)

      const actionId = crypto.randomUUID()
      lastActionIdRef.current = actionId

      const currentTotal = totalSeconds
      const currentMode = mode
      const currentSess = currentSession
      const currentTask = taskName
      const currentTaskId = activeSessionRef.current?.taskId || null
      const currentPlanBlockId = activeSessionRef.current?.planBlockId || null
      const totalCycles = Number(settings?.sessions) || 4

      if (currentMode === 'focus') {
        const focusMins = Math.round(currentTotal / 60) || 25
        const sessionStartedAt =
          activeSessionRef.current?.startedAt ||
          new Date(getServerNowMs() - currentTotal * 1000).toISOString()
        const sessionId = `focus-${sessionStartedAt}`

        // 1. Record completed focus session in Dexie with completed: true & actual duration
        await recordPomodoroSession({
          taskId: currentTaskId,
          duration: focusMins,
          durationSeconds: currentTotal,
          sessionType: 'focus',
          startedAt: sessionStartedAt,
          taskTitle: currentTask,
          sessionId,
          completed: true,
        })

        // 2. Automatically mark associated Task completed in Dexie and queue Supabase sync
        if (currentTaskId) {
          try {
            const taskObj = await db.tasks.get(currentTaskId)
            if (taskObj && !taskObj.completed) {
              const updatedTask = {
                ...taskObj,
                completed: true,
                completedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
              await db.tasks.update(currentTaskId, {
                completed: true,
                completedAt: updatedTask.completedAt,
                updatedAt: updatedTask.updatedAt,
              })
              const row = mapTaskToRow(updatedTask, taskObj.userId)
              if (row) enqueueMutation('upsert', 'tasks', row)
            }
          } catch (tErr) {
            console.warn('[TimerSessionProvider] Auto-complete task error:', tErr)
          }
        }

        // 3. Automatically mark associated Plan My Day block completed in Dexie
        if (currentPlanBlockId) {
          try {
            await markPlanBlockCompleted(currentPlanBlockId)
            setJustCompletedBlockId(currentPlanBlockId)
            try {
              sessionStorage.setItem('nocturn_just_completed_block', currentPlanBlockId)
            } catch { /* ignore */ }
          } catch (pErr) {
            console.warn('[TimerSessionProvider] Auto-complete plan block error:', pErr)
          }
        }

        // 4. Clear active session in Dexie
        await clearActiveSession()
        updateActiveSession(null)

        // 5. Fire native OS notification
        notifyTimerEnded(currentTask, sessionId)

        // 6. Show tasteful toast
        const taskTitleDisplay = currentTask ? currentTask : 'Focus Session'
        addToast(`Session ended: ${taskTitleDisplay} — ${focusMins} min completed`, {
          type: 'success',
          duration: 5000,
        })

        // 7. Reset timer to clean IDLE state (NEVER auto-restart or loop!)
        const nextResetSecs = getModeDurationSeconds('focus')
        setMode('focus')
        setTotalSeconds(nextResetSecs)
        setRemainingSeconds(nextResetSecs)
        setElapsedSeconds(0)

        if (updateTimerState) {
          await updateTimerState({
            actionId,
            status: 'idle',
            mode: 'focus',
            currentSession: currentSess,
            totalSessions: totalCycles,
            canonicalStartTime: null,
            elapsedSeconds: 0,
            configuredDuration: nextResetSecs,
            totalSeconds: nextResetSecs,
            remainingSecondsWhenPaused: nextResetSecs,
            taskName: '',
            taskId: null,
            planBlockId: null,
            startedAt: null,
            lastActionAt: new Date().toISOString(),
          })
        }

        // 8. Auto-navigate to Plan My Day
        try {
          navigate('/plan-my-day')
        } catch {
          if (typeof window !== 'undefined') {
            window.location.href = '/plan-my-day'
          }
        }
      } else {
        // Break session completed: do NOT silently start next focus session!
        await clearActiveSession()
        updateActiveSession(null)

        notifyTimerEnded('Break', `break-${Date.now()}`)
        addToast('Break ended. Ready for your next focus session when you are.', {
          type: 'info',
          duration: 4000,
        })

        const focusSecs = getModeDurationSeconds('focus')
        setMode('focus')
        setTotalSeconds(focusSecs)
        setRemainingSeconds(focusSecs)
        setCanonicalStartTime(null)
        setElapsedSeconds(0)

        if (updateTimerState) {
          await updateTimerState({
            actionId,
            status: 'idle',
            mode: 'focus',
            currentSession: currentSess < totalCycles ? currentSess + 1 : 1,
            totalSessions: totalCycles,
            canonicalStartTime: null,
            elapsedSeconds: 0,
            configuredDuration: focusSecs,
            totalSeconds: focusSecs,
            remainingSecondsWhenPaused: focusSecs,
            taskName: '',
            taskId: null,
            planBlockId: null,
            startedAt: null,
            lastActionAt: new Date().toISOString(),
          })
        }
      }
    } finally {
      setTimeout(() => {
        isAdvancingRef.current = false
      }, 500)
    }
  }, [
    settings,
    mode,
    currentSession,
    totalSeconds,
    taskName,
    getModeDurationSeconds,
    updateTimerState,
    addToast,
    navigate,
  ])

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

        // 5-minute warning notification
        if (remaining <= 300 && remaining > 0 && !hasWarned5mRef.current && mode === 'focus') {
          hasWarned5mRef.current = true
          notifyTimerFiveMinuteWarning(taskName, activeSessionRef.current?.sessionId)
        }

        if (remaining <= 0) {
          handleSessionCompletion()
        }
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, canonicalStartTime, totalSeconds, mode, taskName, handleSessionCompletion])

  // 5. Start Session Action
  const startTimer = async (
    overrideTaskName,
    overrideTaskId,
    overrideMode,
    overrideDurationMinutes,
    overrideCurrentSession,
    overrideTotalSessions
  ) => {
    // If a session was already active, terminate previous cleanly
    const currentElapsed = canonicalStartTime
      ? Math.max(0, Math.floor((getServerNowMs() - canonicalStartTime) / 1000))
      : elapsedSeconds

    if (mode === 'focus' && currentElapsed >= 60) {
      const prevStartedAt =
        activeSessionRef.current?.startedAt ||
        new Date(getServerNowMs() - currentElapsed * 1000).toISOString()
      recordPomodoroSession({
        taskId: activeSessionRef.current?.taskId || null,
        duration: Math.round((currentElapsed / 60) * 10) / 10,
        durationSeconds: currentElapsed,
        sessionType: 'focus',
        startedAt: prevStartedAt,
        taskTitle: taskName || '',
        sessionId: `focus-${prevStartedAt}`,
        completed: false,
      }).catch(console.warn)
    }

    await clearActiveSession()

    const targetMode = overrideMode || mode
    const targetDurationMinutes =
      Number(overrideDurationMinutes) || getModeDurationSeconds(targetMode) / 60
    const targetTaskName = overrideTaskName !== undefined ? overrideTaskName : taskName
    const targetTaskId =
      overrideTaskId !== undefined ? overrideTaskId : activeSessionRef.current?.taskId || null
    const targetCurrentSession =
      Number(overrideCurrentSession) > 0 ? Number(overrideCurrentSession) : currentSession
    const targetTotalSessions =
      Number(overrideTotalSessions) > 0 ? Number(overrideTotalSessions) : Number(settings?.sessions) || 4

    const nowMs = getServerNowMs()
    const durationSeconds = Math.round(targetDurationMinutes * 60)
    const endMs = nowMs + durationSeconds * 1000

    const actionId = crypto.randomUUID()
    lastActionIdRef.current = actionId

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
      elapsedSeconds: 0,
      canonicalStartTime: nowMs,
      status: 'active',
      currentSession: targetCurrentSession,
    }

    updateActiveSession(sessionObj)
    await recordActiveSession(sessionObj)

    setMode(targetMode)
    setTaskName(targetTaskName)
    setCurrentSession(targetCurrentSession)
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
        currentSession: targetCurrentSession,
        totalSessions: targetTotalSessions,
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

  // 5b. Plan My Day -> Start Session with custom block duration, adjacent break, and cycle tracking
  const startPlanSession = async ({
    durationMinutes,
    breakDurationMinutes,
    sessionIndex = 1,
    totalSessions = 4,
    taskName: planTaskName = '',
    taskId = null,
    mode: planMode = 'focus',
    planBlockId = null,
    planId = null,
    blockTimeRange = null,
  }) => {
    hasWarned5mRef.current = false
    const nowMs = getServerNowMs()
    const currentElapsed = canonicalStartTime
      ? Math.max(0, Math.floor((nowMs - canonicalStartTime) / 1000))
      : elapsedSeconds

    // Terminate any previous focus session cleanly if >= 60s
    if (mode === 'focus' && currentElapsed >= 60) {
      const prevStartedAt =
        activeSessionRef.current?.startedAt ||
        new Date(nowMs - currentElapsed * 1000).toISOString()
      recordPomodoroSession({
        taskId: activeSessionRef.current?.taskId || null,
        duration: Math.round((currentElapsed / 60) * 10) / 10,
        durationSeconds: currentElapsed,
        sessionType: 'focus',
        startedAt: prevStartedAt,
        taskTitle: taskName || '',
        sessionId: `focus-${prevStartedAt}`,
        completed: false,
      }).catch(console.warn)
    }

    await clearActiveSession()

    const targetMode = planMode || 'focus'
    const targetDurationMinutes =
      Number(durationMinutes) > 0 ? Number(durationMinutes) : getModeDurationSeconds(targetMode) / 60
    const targetBreakDuration =
      Number(breakDurationMinutes) > 0 ? Number(breakDurationMinutes) : Number(settings?.shortBreakDuration) || 5
    const targetSession = Number(sessionIndex) > 0 ? Number(sessionIndex) : 1
    const targetTotal =
      Number(totalSessions) > 0 ? Number(totalSessions) : Number(settings?.sessions) || 4

    const durationSeconds = Math.round(targetDurationMinutes * 60)
    const endMs = nowMs + durationSeconds * 1000

    const actionId = crypto.randomUUID()
    lastActionIdRef.current = actionId

    const sessionType =
      targetMode === 'shortBreak'
        ? 'short_break'
        : targetMode === 'longBreak'
        ? 'long_break'
        : 'focus'

    const sessionObj = {
      sessionId: `session-${Date.now()}`,
      taskId: taskId || null,
      taskName: planTaskName || '',
      sessionType,
      configuredDuration: targetDurationMinutes,
      startedAt: new Date(nowMs).toISOString(),
      expectedEndAt: new Date(endMs).toISOString(),
      pausedAt: null,
      remainingSecondsWhenPaused: null,
      elapsedSeconds: 0,
      canonicalStartTime: nowMs,
      status: 'active',
      currentSession: targetSession,
      planBlockId: planBlockId || null,
      planId: planId || null,
      blockTimeRange: blockTimeRange || null,
    }

    updateActiveSession(sessionObj)
    await recordActiveSession(sessionObj)

    setMode(targetMode)
    setTaskName(planTaskName || '')
    setCurrentSession(targetSession)
    setTotalSeconds(durationSeconds)
    setRemainingSeconds(durationSeconds)
    setCanonicalStartTime(nowMs)
    setElapsedSeconds(0)
    setIsRunning(true)
    setIsPaused(false)

    const newTimerState = {
      actionId,
      status: 'running',
      mode: targetMode,
      currentSession: targetSession,
      totalSessions: targetTotal,
      canonicalStartTime: nowMs,
      elapsedSeconds: 0,
      configuredDuration: durationSeconds,
      totalSeconds: durationSeconds,
      remainingSecondsWhenPaused: null,
      taskName: planTaskName || '',
      taskId: taskId || null,
      planBlockId: planBlockId || null,
      planId: planId || null,
      blockTimeRange: blockTimeRange || null,
      startedAt: new Date(nowMs).toISOString(),
      lastActionAt: new Date().toISOString(),
    }

    if (updateSettings) {
      await updateSettings({
        focusDuration: targetMode === 'focus' ? targetDurationMinutes : Number(settings?.focusDuration) || 25,
        shortBreakDuration: targetBreakDuration,
        sessions: targetTotal,
        timerState: newTimerState,
      })
    } else if (updateTimerState) {
      await updateTimerState(newTimerState)
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
    const nowMs = getServerNowMs()
    const currentElapsed = canonicalStartTime
      ? Math.max(0, Math.floor((nowMs - canonicalStartTime) / 1000))
      : elapsedSeconds

    // If resetting after active focus work (>= 60 seconds), save the actual focus session so progress is preserved
    if (mode === 'focus' && currentElapsed >= 60) {
      const sessionStartedAt =
        activeSessionRef.current?.startedAt ||
        new Date(nowMs - currentElapsed * 1000).toISOString()
      recordPomodoroSession({
        taskId: activeSessionRef.current?.taskId || null,
        duration: Math.round((currentElapsed / 60) * 10) / 10,
        durationSeconds: currentElapsed,
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

  // 10. Dedicated Terminate Focus Session Action (clearly distinct from Reset, stopped/idle, does NOT start next session)
  const terminateTimer = async () => {
    const nowMs = getServerNowMs()
    const currentElapsed = canonicalStartTime
      ? Math.max(0, Math.floor((nowMs - canonicalStartTime) / 1000))
      : elapsedSeconds

    // Accurately record actual runtime (>= 60s) for partial/terminated focus sessions without counting planned minutes
    if (mode === 'focus' && currentElapsed >= 60) {
      const sessionStartedAt =
        activeSessionRef.current?.startedAt ||
        new Date(nowMs - currentElapsed * 1000).toISOString()
      recordPomodoroSession({
        taskId: activeSessionRef.current?.taskId || null,
        duration: Math.round((currentElapsed / 60) * 10) / 10,
        durationSeconds: currentElapsed,
        sessionType: 'focus',
        startedAt: sessionStartedAt,
        taskTitle: taskName || '',
        sessionId: `focus-${sessionStartedAt}`,
        completed: false,
      }).catch((err) =>
        console.warn('[TimerSessionProvider] Failed to record partial focus session on terminate:', err)
      )
    }

    await clearActiveSession()
    updateActiveSession(null)

    setIsRunning(false)
    setIsPaused(false)
    setCanonicalStartTime(null)
    setElapsedSeconds(0)

    const actionId = crypto.randomUUID()
    lastActionIdRef.current = actionId

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

  // 11. Skip / Next Session Action
  const skipTimer = async () => {
    const nowMs = getServerNowMs()
    const currentElapsed = canonicalStartTime
      ? Math.max(0, Math.floor((nowMs - canonicalStartTime) / 1000))
      : elapsedSeconds

    if (mode === 'focus' && currentElapsed >= 60) {
      const sessionStartedAt =
        activeSessionRef.current?.startedAt ||
        new Date(nowMs - currentElapsed * 1000).toISOString()
      recordPomodoroSession({
        taskId: activeSessionRef.current?.taskId || null,
        duration: Math.round((currentElapsed / 60) * 10) / 10,
        durationSeconds: currentElapsed,
        sessionType: 'focus',
        startedAt: sessionStartedAt,
        taskTitle: taskName || '',
        sessionId: `focus-${sessionStartedAt}`,
        completed: false,
      }).catch(console.warn)
    }

    setIsRunning(false)
    setIsPaused(false)
    setCanonicalStartTime(null)
    setElapsedSeconds(0)

    const actionId = crypto.randomUUID()
    lastActionIdRef.current = actionId

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
        terminateTimer,
        startPlanSession,
        activeSession,
        planBlockId: activeSession?.planBlockId || null,
        planId: activeSession?.planId || null,
        blockTimeRange: activeSession?.blockTimeRange || null,
        justCompletedBlockId,
        setJustCompletedBlockId,
      }}
    >
      {children}
    </TimerSessionContext.Provider>
  )
}

