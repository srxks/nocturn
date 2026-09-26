import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTimerSettings } from './useTimerSettings'
import { TimerSessionContext } from './TimerSessionContext'
import { useToast } from './useToast'
import {
  recordActiveSession,
  clearActiveSession,
  recordPomodoroSession,
  getActiveSession,
} from '../services/timerService'
import { db } from '../db/db'
import { markPlanBlockCompleted } from '../services/plannerPersistenceService'
import { notifyTimerFiveMinuteWarning, notifyTimerEnded, hasNotificationPermission } from '../services/notificationService'
import { mapTaskToRow } from '../lib/tasks'
import { enqueueMutation } from '../services/syncQueue'
import {
  playTimerStartSound,
  playTimerPauseSound,
  playTimerResumeSound,
  playBell,
  playBreakEndSound,
  playPomodoroStartSound,
  isTimerSoundsEnabled,
} from '../services/soundService'
import SessionCompletionModal from '../components/timer/SessionCompletionModal'
import { setFaviconActive } from '../utils/faviconUtils'

export function TimerSessionProvider({ children }) {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { settings, updateTimerState, updateSettings } = useTimerSettings()

  // ── EXPLICIT TIMER STATE MACHINE ──
  // phase: 'focus' | 'shortBreak' | 'longBreak'
  const [mode, setMode] = useState('focus')
  // status: 'idle' | 'running' | 'paused' | 'complete'
  const [status, setStatus] = useState('idle')
  // endAt: absolute epoch timestamp in ms when running
  const [endAt, setEndAt] = useState(null)

  const [completedFocusCount, setCompletedFocusCount] = useState(() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('nocturn_timer_cycles') : null
      return saved !== null && !isNaN(parseInt(saved, 10)) ? parseInt(saved, 10) : 0
    } catch {
      return 0
    }
  })
  const [pendingPreset, setPendingPreset] = useState(null)
  const pendingPresetRef = useRef(null)

  const updateCompletedFocusCount = useCallback((newCount) => {
    setCompletedFocusCount(newCount)
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('nocturn_timer_cycles', String(newCount))
      }
    } catch {
      // ignore
    }
  }, [])

  const queuePendingPreset = useCallback((preset) => {
    pendingPresetRef.current = preset
    setPendingPreset(preset)
  }, [])

  const [taskName, setTaskName] = useState('')
  const [taskId, setTaskId] = useState(null)
  const [planBlockId, setPlanBlockId] = useState(null)
  const [completionModalData, setCompletionModalData] = useState(null)

  const statusRef = useRef(status)
  const endAtRef = useRef(endAt)
  const isAdvancingRef = useRef(false)
  const hasWarned5mRef = useRef(false)
  const activeSessionRef = useRef(null)

  useEffect(() => {
    statusRef.current = status
    endAtRef.current = endAt
  }, [status, endAt])

  const isRunning = status === 'running'
  const isPaused = status === 'paused'

  const updateActiveSession = (session) => {
    activeSessionRef.current = session
  }

  // Duration Helper from Settings
  const getModeDurationSeconds = useCallback(
    (targetMode) => {
      const focusMins = Number(settings?.focusDuration) || 25
      const shortMins = Number(settings?.shortBreakDuration) || 5
      const longMins = Number(settings?.longBreakDuration) || 15

      if (targetMode === 'focus') return Math.round(focusMins * 60)
      if (targetMode === 'shortBreak') return Math.round(shortMins * 60)
      return Math.round(longMins * 60)
    },
    [settings]
  )

  const targetDuration = getModeDurationSeconds(mode)
  const [totalSeconds, setTotalSeconds] = useState(targetDuration)
  const [remainingSeconds, setRemainingSeconds] = useState(targetDuration)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const effectiveTotalSeconds = status === 'idle' ? targetDuration : totalSeconds
  const effectiveRemainingSeconds = status === 'idle' ? targetDuration : remainingSeconds
  const effectiveElapsedSeconds = status === 'idle' ? 0 : elapsedSeconds

  // ── NATURAL COMPLETION: STOPS AND WAITS AT 0:00 (NO AUTO-CHAINING) ──
  const handleNaturalCompletion = useCallback(async () => {
    if (isAdvancingRef.current) return
    isAdvancingRef.current = true

    try {
      const nowMs = Date.now()
      const currentMode = mode
      const currentCount = completedFocusCount
      const currentTask = taskName
      const currentTaskId = taskId
      const currentTotal = totalSeconds

      // 1. Immediately STOP the timer and hold at 0:00
      setStatus('completed')
      setEndAt(null)
      setRemainingSeconds(0)
      setElapsedSeconds(currentTotal)
      hasWarned5mRef.current = false

      await clearActiveSession()
      updateActiveSession(null)

      if (currentMode === 'focus') {
        const focusMins = Math.round(currentTotal / 60) || 25
        const sessionStartedAt =
          activeSessionRef.current?.startedAt ||
          new Date(nowMs - currentTotal * 1000).toISOString()
        const sessionId = `focus-${sessionStartedAt}`

        // Record completed focus session in Dexie
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

        const newCount = currentCount + 1
        updateCompletedFocusCount(newCount)

        // Play warm bell sound
        if (isTimerSoundsEnabled()) {
          playBell()
        }

        // Native OS Notification
        if (hasNotificationPermission()) {
          notifyTimerEnded(currentTask || 'Focus Session', sessionId)
        }

        // Toast feedback
        addToast(`Focus session complete! (${focusMins} min logged)`, {
          type: 'success',
          duration: 4000,
        })

        // Summary Modal check (ONLY on focus completion & if setting enabled)
        const longBreakInterval = Number(settings?.sessions) || 4
        const isLongBreak = newCount > 0 && newCount % longBreakInterval === 0
        if (settings?.showSessionSummary) {
          setCompletionModalData({
            sessionId,
            taskTitle: currentTask,
            taskId: currentTaskId,
            durationMins: focusMins,
            isLongBreak,
            planBlockId,
          })
        }
      } else {
        // Break completed
        if (isTimerSoundsEnabled()) {
          playBreakEndSound()
        }
        if (hasNotificationPermission()) {
          notifyTimerEnded('Break Over — Ready to Focus')
        }
        addToast('Break completed. Ready to focus!', { type: 'info', duration: 4000 })
      }

      if (updateTimerState) {
        await updateTimerState({
          actionId: crypto.randomUUID(),
          status: 'completed',
          mode: currentMode,
          currentSession: currentCount + 1,
          endAt: null,
          totalSeconds: currentTotal,
          lastActionAt: new Date(nowMs).toISOString(),
        })
      }
    } finally {
      setTimeout(() => {
        isAdvancingRef.current = false
      }, 400)
    }
  }, [
    mode,
    completedFocusCount,
    taskName,
    taskId,
    totalSeconds,
    planBlockId,
    settings,
    updateTimerState,
    addToast,
    updateCompletedFocusCount,
  ])

  // ── START NEXT PHASE (EXPLICIT USER CLICK REQUIRED) ──
  const startNextPhase = useCallback(async () => {
    const nowMs = Date.now()
    hasWarned5mRef.current = false

    if (mode === 'focus') {
      const longBreakInterval = Number(settings?.sessions) || 4
      const isLongBreak = completedFocusCount > 0 && completedFocusCount % longBreakInterval === 0
      const nextMode = isLongBreak ? 'longBreak' : 'shortBreak'
      const breakSecs = getModeDurationSeconds(nextMode)
      const nextEndAt = nowMs + breakSecs * 1000

      setMode(nextMode)
      setTotalSeconds(breakSecs)
      setRemainingSeconds(breakSecs)
      setElapsedSeconds(0)
      setStatus('running')
      setEndAt(nextEndAt)

      if (isTimerSoundsEnabled()) {
        playTimerStartSound()
      }

      const sessionObj = {
        sessionId: `session-${nowMs}`,
        taskName,
        sessionType: isLongBreak ? 'long_break' : 'short_break',
        configuredDuration: Math.round(breakSecs / 60),
        startedAt: new Date(nowMs).toISOString(),
        expectedEndAt: new Date(nextEndAt).toISOString(),
        status: 'active',
        currentSession: completedFocusCount + 1,
      }
      await recordActiveSession(sessionObj)
      updateActiveSession(sessionObj)

      if (updateTimerState) {
        await updateTimerState({
          actionId: crypto.randomUUID(),
          status: 'running',
          mode: nextMode,
          currentSession: completedFocusCount + 1,
          endAt: nextEndAt,
          totalSeconds: breakSecs,
          lastActionAt: new Date(nowMs).toISOString(),
        })
      }
    } else {
      const focusSecs = getModeDurationSeconds('focus')
      const nextEndAt = nowMs + focusSecs * 1000

      setMode('focus')
      setTotalSeconds(focusSecs)
      setRemainingSeconds(focusSecs)
      setElapsedSeconds(0)
      setStatus('running')
      setEndAt(nextEndAt)

      if (isTimerSoundsEnabled()) {
        playPomodoroStartSound()
      }

      const sessionObj = {
        sessionId: `session-${nowMs}`,
        taskName,
        sessionType: 'focus',
        configuredDuration: Math.round(focusSecs / 60),
        startedAt: new Date(nowMs).toISOString(),
        expectedEndAt: new Date(nextEndAt).toISOString(),
        status: 'active',
        currentSession: completedFocusCount + 1,
      }
      await recordActiveSession(sessionObj)
      updateActiveSession(sessionObj)

      if (updateTimerState) {
        await updateTimerState({
          actionId: crypto.randomUUID(),
          status: 'running',
          mode: 'focus',
          currentSession: completedFocusCount + 1,
          endAt: nextEndAt,
          totalSeconds: focusSecs,
          lastActionAt: new Date(nowMs).toISOString(),
        })
      }
    }
  }, [mode, completedFocusCount, taskName, settings, getModeDurationSeconds, updateTimerState])

  // ── START TIMER ──
  const startTimer = async (
    overrideTaskName,
    overrideTaskId,
    overrideMode,
    overrideDurationMinutes
  ) => {
    let actualTaskName = overrideTaskName
    let actualTaskId = overrideTaskId
    let actualMode = overrideMode
    let actualDurationMins = overrideDurationMinutes

    if (overrideTaskName && typeof overrideTaskName === 'object') {
      actualTaskName = overrideTaskName.taskName || overrideTaskName.title
      actualTaskId = overrideTaskName.taskId
      actualMode = overrideTaskName.mode
      actualDurationMins = overrideTaskName.durationMinutes || overrideTaskName.duration
      if (overrideTaskName.planBlockId) {
        setPlanBlockId(overrideTaskName.planBlockId)
      }
    }

    const targetMode = actualMode || mode
    const targetMins =
      actualDurationMins ||
      (targetMode === 'focus'
        ? settings?.focusDuration
        : targetMode === 'shortBreak'
        ? settings?.shortBreakDuration
        : settings?.longBreakDuration) ||
      25

    const durationSecs = Math.round(targetMins * 60)
    const nowMs = Date.now()
    const targetEndAt = nowMs + durationSecs * 1000

    if (actualTaskName !== undefined) setTaskName(actualTaskName)
    if (actualTaskId !== undefined) setTaskId(actualTaskId)

    setMode(targetMode)
    setTotalSeconds(durationSecs)
    setRemainingSeconds(durationSecs)
    setElapsedSeconds(0)
    setEndAt(targetEndAt)
    setStatus('running')
    hasWarned5mRef.current = false

    if (targetMode === 'focus') {
      playPomodoroStartSound()
    } else {
      playTimerStartSound()
    }

    const sessionObj = {
      sessionId: `session-${nowMs}`,
      taskId: actualTaskId !== undefined ? actualTaskId : taskId,
      taskName: actualTaskName !== undefined ? actualTaskName : taskName,
      sessionType:
        targetMode === 'shortBreak'
          ? 'short_break'
          : targetMode === 'longBreak'
          ? 'long_break'
          : 'focus',
      configuredDuration: targetMins,
      startedAt: new Date(nowMs).toISOString(),
      expectedEndAt: new Date(targetEndAt).toISOString(),
      status: 'active',
      currentSession: completedFocusCount + 1,
    }
    updateActiveSession(sessionObj)
    await recordActiveSession(sessionObj)

    if (updateTimerState) {
      await updateTimerState({
        actionId: crypto.randomUUID(),
        status: 'running',
        mode: targetMode,
        endAt: targetEndAt,
        totalSeconds: durationSecs,
        taskName: actualTaskName !== undefined ? actualTaskName : taskName,
        taskId: actualTaskId !== undefined ? actualTaskId : taskId,
        lastActionAt: new Date(nowMs).toISOString(),
      })
    }
  }

  // ── PAUSE TIMER ──
  const pauseTimer = async () => {
    if (status !== 'running') return
    const nowMs = Date.now()
    const safeRemaining = endAt ? Math.max(0, Math.round((endAt - nowMs) / 1000)) : remainingSeconds

    setStatus('paused')
    setEndAt(null)
    setRemainingSeconds(safeRemaining)
    playTimerPauseSound()

    const sessionObj = {
      ...(activeSessionRef.current || {}),
      status: 'paused',
      remainingSecondsWhenPaused: safeRemaining,
    }
    updateActiveSession(sessionObj)
    await recordActiveSession(sessionObj)

    if (updateTimerState) {
      await updateTimerState({
        actionId: crypto.randomUUID(),
        status: 'paused',
        mode,
        endAt: null,
        remainingSecondsWhenPaused: safeRemaining,
        totalSeconds,
        lastActionAt: new Date(nowMs).toISOString(),
      })
    }
  }

  // ── RESUME TIMER ──
  const resumeTimer = async () => {
    if (status !== 'paused') return
    const nowMs = Date.now()
    const targetEndAt = nowMs + remainingSeconds * 1000

    setStatus('running')
    setEndAt(targetEndAt)
    playTimerResumeSound()

    const sessionObj = {
      ...(activeSessionRef.current || {}),
      status: 'active',
      expectedEndAt: new Date(targetEndAt).toISOString(),
    }
    updateActiveSession(sessionObj)
    await recordActiveSession(sessionObj)

    if (updateTimerState) {
      await updateTimerState({
        actionId: crypto.randomUUID(),
        status: 'running',
        mode,
        endAt: targetEndAt,
        totalSeconds,
        lastActionAt: new Date(nowMs).toISOString(),
      })
    }
  }

  // ── TOGGLE PLAY / PAUSE ──
  const togglePlayPause = () => {
    if (status === 'running') {
      pauseTimer()
    } else if (status === 'paused') {
      resumeTimer()
    } else if (status === 'completed') {
      startNextPhase()
    } else {
      startTimer()
    }
  }

  // ── RESET TIMER ──
  const resetTimer = async () => {
    const resetDur = getModeDurationSeconds(mode)
    setStatus('idle')
    setEndAt(null)
    setTotalSeconds(resetDur)
    setRemainingSeconds(resetDur)
    setElapsedSeconds(0)
    hasWarned5mRef.current = false

    await clearActiveSession()
    updateActiveSession(null)

    if (updateTimerState) {
      await updateTimerState({
        actionId: crypto.randomUUID(),
        status: 'idle',
        mode,
        endAt: null,
        totalSeconds: resetDur,
        lastActionAt: new Date().toISOString(),
      })
    }
  }

  // ── SKIP TIMER ──
  const skipTimer = async () => {
    await clearActiveSession()
    updateActiveSession(null)
    setEndAt(null)
    hasWarned5mRef.current = false

    if (mode === 'focus') {
      const currentElapsed = Math.max(0, totalSeconds - remainingSeconds)
      if (currentElapsed >= 60) {
        const focusMins = Math.round((currentElapsed / 60) * 10) / 10
        const sessionStartedAt =
          activeSessionRef.current?.startedAt ||
          new Date(Date.now() - currentElapsed * 1000).toISOString()
        await recordPomodoroSession({
          taskId,
          duration: focusMins,
          durationSeconds: currentElapsed,
          sessionType: 'focus',
          startedAt: sessionStartedAt,
          taskTitle: taskName,
          sessionId: `focus-${sessionStartedAt}`,
          completed: false,
        }).catch(console.warn)
      }

      const longBreakInterval = Number(settings?.sessions) || 4
      const isLongBreak = (completedFocusCount + 1) > 0 && (completedFocusCount + 1) % longBreakInterval === 0
      const nextMode = isLongBreak ? 'longBreak' : 'shortBreak'
      const breakSecs = getModeDurationSeconds(nextMode)

      setMode(nextMode)
      setTotalSeconds(breakSecs)
      setRemainingSeconds(breakSecs)
      setElapsedSeconds(0)
      setStatus('idle')
    } else {
      const focusSecs = getModeDurationSeconds('focus')
      setMode('focus')
      setTotalSeconds(focusSecs)
      setRemainingSeconds(focusSecs)
      setElapsedSeconds(0)
      setStatus('idle')
    }
  }

  // ── APPLY PRESET (Sets durations & idle status, NEVER auto-starts!) ──
  const applyPreset = async (preset) => {
    if (status === 'running') {
      addToast('Timer stopped to apply preset', { type: 'info', duration: 3000 })
    }

    const focus = preset.duration || preset.focus || 25
    const short = preset.breakDuration || preset.short || 5
    const long = preset.longDuration || preset.long || 15
    const sess = preset.sessions || 4

    await updateSettings({
      focusDuration: focus,
      shortBreakDuration: short,
      longBreakDuration: long,
      sessions: sess,
    })

    const durSecs = focus * 60
    setMode('focus')
    setStatus('idle')
    setEndAt(null)
    updateCompletedFocusCount(0)
    setTotalSeconds(durSecs)
    setRemainingSeconds(durSecs)
    setElapsedSeconds(0)
    hasWarned5mRef.current = false

    await clearActiveSession()
    updateActiveSession(null)

    if (updateTimerState) {
      await updateTimerState({
        actionId: crypto.randomUUID(),
        status: 'idle',
        mode: 'focus',
        endAt: null,
        totalSeconds: durSecs,
        lastActionAt: new Date().toISOString(),
      })
    }

    addToast(`Applied ${preset.name || preset.label || 'preset'} (${focus}/${short}/${long} min)`, {
      type: 'success',
      duration: 3000,
    })
  }

  // ── SINGLE TICKER LOOP (250ms anti-drift) ──
  useEffect(() => {
    let interval = null

    if (status === 'running' && endAt) {
      interval = setInterval(() => {
        const nowMs = Date.now()
        const remaining = Math.max(0, Math.round((endAt - nowMs) / 1000))
        setRemainingSeconds(remaining)
        setElapsedSeconds(Math.max(0, totalSeconds - remaining))

        // 5-minute warning notification
        if (remaining <= 300 && remaining > 0 && !hasWarned5mRef.current && mode === 'focus') {
          hasWarned5mRef.current = true
          notifyTimerFiveMinuteWarning(taskName, activeSessionRef.current?.sessionId)
        }

        if (remaining <= 0) {
          handleNaturalCompletion()
        }
      }, 250)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [status, endAt, totalSeconds, mode, taskName, handleNaturalCompletion])

  // ── TAB VISIBILITY RE-SYNC ──
  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && statusRef.current === 'running' && endAtRef.current) {
        const nowMs = Date.now()
        const remaining = Math.max(0, Math.round((endAtRef.current - nowMs) / 1000))
        setRemainingSeconds(remaining)
        setElapsedSeconds(Math.max(0, totalSeconds - remaining))
        if (remaining <= 0) {
          handleNaturalCompletion()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [totalSeconds, handleNaturalCompletion])

  // ── RESTORE ACTIVE SESSION ON MOUNT ──
  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      if (statusRef.current === 'running' || statusRef.current === 'paused') return

      const cloudState = settings?.timerState
      if (cloudState && cloudState.endAt && cloudState.status === 'running') {
        const nowMs = Date.now()
        const remaining = Math.max(0, Math.round((cloudState.endAt - nowMs) / 1000))
        const total = cloudState.totalSeconds || getModeDurationSeconds(cloudState.mode || 'focus')

        setMode(cloudState.mode || 'focus')
        setTotalSeconds(total)

        if (remaining > 0) {
          setStatus('running')
          setEndAt(cloudState.endAt)
          setRemainingSeconds(remaining)
          setElapsedSeconds(Math.max(0, total - remaining))
          return
        } else {
          handleNaturalCompletion()
          return
        }
      }

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

      if (persisted.status === 'paused') {
        const remaining = persisted.remainingSecondsWhenPaused ?? configuredTotal
        setStatus('paused')
        setEndAt(null)
        setRemainingSeconds(remaining)
        setElapsedSeconds(Math.max(0, configuredTotal - remaining))
      } else if (persisted.status === 'active' && persisted.expectedEndAt) {
        const endMs = new Date(persisted.expectedEndAt).getTime()
        const nowMs = Date.now()
        const remaining = Math.max(0, Math.round((endMs - nowMs) / 1000))

        if (remaining > 0) {
          setStatus('running')
          setEndAt(endMs)
          setRemainingSeconds(remaining)
          setElapsedSeconds(Math.max(0, configuredTotal - remaining))
        } else {
          handleNaturalCompletion()
        }
      }
    }

    restoreSession()
    return () => {
      isMounted = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Document Title & Favicon sync
  useEffect(() => {
    if (typeof document === 'undefined') return

    setFaviconActive(isRunning)

    if (isRunning) {
      const mins = Math.floor(remainingSeconds / 60)
      const secs = remainingSeconds % 60
      const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      const label = taskName || (mode === 'focus' ? 'Focus' : mode === 'shortBreak' ? 'Short Break' : 'Long Break')
      document.title = `(${formatted}) ${label} · Nocturn`
    } else if (isPaused) {
      const mins = Math.floor(remainingSeconds / 60)
      const secs = remainingSeconds % 60
      const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      document.title = `[Paused ${formatted}] Nocturn`
    } else {
      document.title = 'Nocturn — Calm Focus & Planning'
    }

    return () => {
      document.title = 'Nocturn — Calm Focus & Planning'
      setFaviconActive(false)
    }
  }, [isRunning, isPaused, remainingSeconds, taskName, mode])

  // Handle post-session completion modal actions
  const handleCompleteSessionModal = async ({ sessionId, note, markTaskDone, nextAction }) => {
    if (note && sessionId) {
      try {
        await db.pomodoroSessions.update(sessionId, { notes: note })
      } catch (err) {
        console.warn('[TimerSessionProvider] update session note error:', err)
      }
    }

    if (markTaskDone && taskId) {
      try {
        const taskObj = await db.tasks.get(taskId)
        if (taskObj && !taskObj.completed) {
          const updatedTask = {
            ...taskObj,
            completed: true,
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          await db.tasks.update(taskId, {
            completed: true,
            completedAt: updatedTask.completedAt,
            updatedAt: updatedTask.updatedAt,
          })
          const row = mapTaskToRow(updatedTask, taskObj.userId)
          if (row) enqueueMutation('upsert', 'tasks', row)
        }
      } catch (tErr) {
        console.warn('[TimerSessionProvider] complete task error:', tErr)
      }
    }

    if (completionModalData?.planBlockId) {
      markPlanBlockCompleted(completionModalData.planBlockId).catch((err) => {
        console.warn('[TimerSessionProvider] complete plan block error:', err)
      })
    }

    setCompletionModalData(null)

    if (nextAction === 'break') {
      startTimer(undefined, undefined, mode.startsWith('short') || mode.startsWith('long') ? mode : 'shortBreak')
    } else if (nextAction === 'next-focus') {
      startTimer(undefined, undefined, 'focus')
    } else if (nextAction === 'plan') {
      navigate('/plan')
    }
  }

  const contextValue = {
    mode,
    status,
    isRunning,
    isPaused,
    isCompleted: status === 'completed' || (effectiveRemainingSeconds === 0 && !isRunning && !isPaused),
    remainingSeconds: effectiveRemainingSeconds,
    totalSeconds: effectiveTotalSeconds,
    elapsedSeconds: effectiveElapsedSeconds,
    currentSession: completedFocusCount + 1,
    completedFocusCount,
    taskName,
    setTaskName,
    taskId,
    setTaskId,
    startTimer,
    pauseTimer,
    resumeTimer,
    togglePlayPause,
    startNextPhase,
    resetTimer,
    skipTimer,
    skipSession: skipTimer,
    terminateTimer: resetTimer,
    applyPreset,
    startPlanSession: startTimer,
    completionModalData,
    closeCompletionModal: () => setCompletionModalData(null),
    handleCompleteSessionModal,
    pendingPreset,
    queuePendingPreset,
    resetCycles: () => updateCompletedFocusCount(0),
  }

  return (
    <TimerSessionContext.Provider value={contextValue}>
      {children}
      <SessionCompletionModal
        isOpen={Boolean(completionModalData)}
        sessionData={completionModalData}
        onCompleteSession={handleCompleteSessionModal}
        onClose={() => setCompletionModalData(null)}
      />
    </TimerSessionContext.Provider>
  )
}
