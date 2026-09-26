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
  // mode: 'focus' | 'shortBreak' | 'longBreak' | 'normal_stopwatch' | 'focus_stopwatch'
  const [mode, setMode] = useState(() => {
    try {
      const savedPreset = typeof localStorage !== 'undefined' ? localStorage.getItem('nocturn_timer_preset') : null
      if (savedPreset === 'normal_stopwatch') return 'normal_stopwatch'
      if (savedPreset === 'focus_stopwatch') return 'focus_stopwatch'
    } catch {
      // ignore
    }
    return 'focus'
  })

  // status: 'idle' | 'running' | 'paused' | 'completed' | 'terminated'
  const [status, setStatus] = useState('idle')

  // Countdown end timestamp (epoch ms)
  const [endAt, setEndAt] = useState(null)

  // Stopwatch state: accumulated seconds from completed running intervals
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0)
  const [stopwatchElapsed, setStopwatchElapsed] = useState(0)
  const startedAtMsRef = useRef(null)
  const accumulatedSecondsRef = useRef(0)

  useEffect(() => {
    accumulatedSecondsRef.current = accumulatedSeconds
  }, [accumulatedSeconds])

  const isStopwatch = mode === 'normal_stopwatch' || mode === 'focus_stopwatch'

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
      if (targetMode === 'longBreak') return Math.round(longMins * 60)
      return 0
    },
    [settings]
  )

  const targetDuration = isStopwatch ? 0 : getModeDurationSeconds(mode)
  const [totalSeconds, setTotalSeconds] = useState(targetDuration)
  const [remainingSeconds, setRemainingSeconds] = useState(targetDuration)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const effectiveTotalSeconds = isStopwatch ? 0 : (status === 'idle' ? targetDuration : totalSeconds)
  const effectiveRemainingSeconds = isStopwatch ? 0 : (status === 'idle' ? targetDuration : remainingSeconds)
  const effectiveElapsedSeconds = isStopwatch
    ? (status === 'idle' ? 0 : stopwatchElapsed)
    : (status === 'idle' ? 0 : elapsedSeconds)

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

      // Multi-tab and rerender idempotency check
      const sessionStartedAt =
        activeSessionRef.current?.startedAt ||
        new Date(nowMs - currentTotal * 1000).toISOString()
      const sessionId = `focus-${sessionStartedAt}`

      try {
        const lastFinalized = localStorage.getItem('nocturn_last_completed_session')
        if (lastFinalized === sessionId) {
          setStatus('completed')
          setEndAt(null)
          setRemainingSeconds(0)
          setElapsedSeconds(currentTotal)
          return
        }
        localStorage.setItem('nocturn_last_completed_session', sessionId)
      } catch {
        // ignore
      }

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

        // Record completed focus session in Dexie and Supabase
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

  // ── START TIMER (COUNTDOWN) ──
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

    const targetMode = actualMode || (isStopwatch ? 'focus' : mode)
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

  // ── PAUSE TIMER (COUNTDOWN) ──
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

  // ── RESUME TIMER (COUNTDOWN) ──
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

  // ── STOPWATCH METHODS ──
  const startStopwatch = useCallback(async () => {
    const nowMs = Date.now()
    startedAtMsRef.current = nowMs
    setStatus('running')

    if (mode === 'focus_stopwatch') {
      playPomodoroStartSound()
    } else {
      playTimerStartSound()
    }

    const sessionObj = {
      sessionId: `stopwatch-${nowMs}`,
      taskId: taskId || null,
      taskName: taskName || (mode === 'focus_stopwatch' ? 'Focus Stopwatch' : 'Normal Stopwatch'),
      sessionType: mode,
      status: 'active',
      startedAt: new Date(nowMs - accumulatedSecondsRef.current * 1000).toISOString(),
      canonicalStartTime: nowMs,
      elapsedSeconds: accumulatedSecondsRef.current,
      createdAt: new Date(nowMs).toISOString(),
    }
    updateActiveSession(sessionObj)
    await recordActiveSession(sessionObj)
  }, [mode, taskId, taskName])

  const pauseStopwatch = useCallback(async () => {
    if (status !== 'running') return
    const nowMs = Date.now()
    const deltaSecs = startedAtMsRef.current ? Math.max(0, Math.floor((nowMs - startedAtMsRef.current) / 1000)) : 0
    const totalElapsed = accumulatedSecondsRef.current + deltaSecs
    accumulatedSecondsRef.current = totalElapsed
    startedAtMsRef.current = null

    setAccumulatedSeconds(totalElapsed)
    setStopwatchElapsed(totalElapsed)
    setStatus('paused')
    playTimerPauseSound()

    const sessionObj = {
      ...(activeSessionRef.current || {}),
      status: 'paused',
      canonicalStartTime: null,
      elapsedSeconds: totalElapsed,
    }
    updateActiveSession(sessionObj)
    await recordActiveSession(sessionObj)
  }, [status])

  const resumeStopwatch = useCallback(async () => {
    if (status !== 'paused') return
    const nowMs = Date.now()
    startedAtMsRef.current = nowMs
    setStatus('running')
    playTimerResumeSound()

    const sessionObj = {
      ...(activeSessionRef.current || {}),
      status: 'active',
      canonicalStartTime: nowMs,
      elapsedSeconds: accumulatedSecondsRef.current,
    }
    updateActiveSession(sessionObj)
    await recordActiveSession(sessionObj)
  }, [status])

  const stopStopwatch = useCallback(async () => {
    if (status === 'running') {
      await pauseStopwatch()
    }
  }, [status, pauseStopwatch])

  const resetStopwatch = useCallback(async () => {
    setStatus('idle')
    startedAtMsRef.current = null
    accumulatedSecondsRef.current = 0
    setAccumulatedSeconds(0)
    setStopwatchElapsed(0)
    await clearActiveSession()
    updateActiveSession(null)
  }, [])

  const finishFocusStopwatch = useCallback(async () => {
    const nowMs = Date.now()
    let runningSecs = accumulatedSecondsRef.current
    if (status === 'running' && startedAtMsRef.current) {
      runningSecs += Math.max(0, Math.floor((nowMs - startedAtMsRef.current) / 1000))
    }

    setStatus('idle')
    startedAtMsRef.current = null
    accumulatedSecondsRef.current = 0
    setAccumulatedSeconds(0)
    setStopwatchElapsed(0)

    await clearActiveSession()
    updateActiveSession(null)

    if (runningSecs >= 1) {
      const focusMins = Math.round((runningSecs / 60) * 10) / 10
      const sessionId = `focus-stopwatch-${nowMs}`
      const sessionStartedAt = new Date(nowMs - runningSecs * 1000).toISOString()

      await recordPomodoroSession({
        taskId: taskId || null,
        duration: focusMins,
        durationSeconds: runningSecs,
        sessionType: 'focus_stopwatch',
        startedAt: sessionStartedAt,
        taskTitle: taskName || 'Focus Stopwatch',
        sessionId,
        completed: true,
      })

      if (isTimerSoundsEnabled()) {
        playBell()
      }

      if (hasNotificationPermission()) {
        notifyTimerEnded(taskName || 'Focus Stopwatch', sessionId)
      }

      addToast(`Focus session complete! (${focusMins > 0 ? focusMins + ' min' : Math.round(runningSecs) + 's'} logged)`, {
        type: 'success',
        duration: 4000,
      })
    }
  }, [status, taskId, taskName, addToast])

  const discardFocusStopwatch = useCallback(async () => {
    setStatus('idle')
    startedAtMsRef.current = null
    accumulatedSecondsRef.current = 0
    setAccumulatedSeconds(0)
    setStopwatchElapsed(0)
    await clearActiveSession()
    updateActiveSession(null)
    addToast('Focus session discarded', { type: 'info', duration: 3000 })
  }, [addToast])

  // ── TOGGLE PLAY / PAUSE (UNIFIED) ──
  const togglePlayPause = () => {
    if (isStopwatch) {
      if (status === 'running') {
        pauseStopwatch()
      } else if (status === 'paused') {
        resumeStopwatch()
      } else {
        startStopwatch()
      }
    } else {
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
  }

  // ── RESET TIMER (UNIFIED) ──
  const resetTimer = async () => {
    if (isStopwatch) {
      await resetStopwatch()
    } else {
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
  }

  // ── SKIP TIMER (COUNTDOWN) ──
  const skipTimer = async () => {
    if (isStopwatch) {
      if (mode === 'focus_stopwatch') {
        await finishFocusStopwatch()
      } else {
        await stopStopwatch()
      }
      return
    }

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

  // ── APPLY PRESET OR STOPWATCH MODE (NEVER AUTO-STARTS) ──
  const applyPreset = async (preset) => {
    if (status === 'running') {
      addToast('Timer stopped to apply preset', { type: 'info', duration: 3000 })
    }

    if (preset.id === 'normal_stopwatch' || preset.mode === 'normal_stopwatch') {
      setMode('normal_stopwatch')
      setStatus('idle')
      setEndAt(null)
      startedAtMsRef.current = null
      accumulatedSecondsRef.current = 0
      setAccumulatedSeconds(0)
      setStopwatchElapsed(0)
      setTotalSeconds(0)
      setRemainingSeconds(0)
      setElapsedSeconds(0)
      hasWarned5mRef.current = false

      await clearActiveSession()
      updateActiveSession(null)

      try {
        localStorage.setItem('nocturn_timer_preset', 'normal_stopwatch')
      } catch {
        // ignore
      }

      addToast('Selected Normal Stopwatch', { type: 'success', duration: 3000 })
      return
    }

    if (preset.id === 'focus_stopwatch' || preset.mode === 'focus_stopwatch') {
      setMode('focus_stopwatch')
      setStatus('idle')
      setEndAt(null)
      startedAtMsRef.current = null
      accumulatedSecondsRef.current = 0
      setAccumulatedSeconds(0)
      setStopwatchElapsed(0)
      setTotalSeconds(0)
      setRemainingSeconds(0)
      setElapsedSeconds(0)
      hasWarned5mRef.current = false

      await clearActiveSession()
      updateActiveSession(null)

      try {
        localStorage.setItem('nocturn_timer_preset', 'focus_stopwatch')
      } catch {
        // ignore
      }

      addToast('Selected Focus Stopwatch', { type: 'success', duration: 3000 })
      return
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
    startedAtMsRef.current = null
    accumulatedSecondsRef.current = 0
    setAccumulatedSeconds(0)
    setStopwatchElapsed(0)
    setTotalSeconds(durSecs)
    setRemainingSeconds(durSecs)
    setElapsedSeconds(0)
    hasWarned5mRef.current = false

    await clearActiveSession()
    updateActiveSession(null)

    try {
      localStorage.setItem('nocturn_timer_preset', preset.id)
    } catch {
      // ignore
    }

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

    if (status === 'running') {
      if (isStopwatch) {
        interval = setInterval(() => {
          if (startedAtMsRef.current) {
            const nowMs = Date.now()
            const deltaSecs = Math.max(0, Math.floor((nowMs - startedAtMsRef.current) / 1000))
            const totalElapsed = accumulatedSecondsRef.current + deltaSecs
            setStopwatchElapsed(totalElapsed)
          }
        }, 250)
      } else if (endAt) {
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
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [status, endAt, totalSeconds, mode, taskName, isStopwatch, handleNaturalCompletion])

  // ── TAB VISIBILITY RE-SYNC ──
  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && statusRef.current === 'running') {
        if (isStopwatch) {
          if (startedAtMsRef.current) {
            const nowMs = Date.now()
            const deltaSecs = Math.max(0, Math.floor((nowMs - startedAtMsRef.current) / 1000))
            const totalElapsed = accumulatedSecondsRef.current + deltaSecs
            setStopwatchElapsed(totalElapsed)
          }
        } else if (endAtRef.current) {
          const nowMs = Date.now()
          const remaining = Math.max(0, Math.round((endAtRef.current - nowMs) / 1000))
          setRemainingSeconds(remaining)
          setElapsedSeconds(Math.max(0, totalSeconds - remaining))
          if (remaining <= 0) {
            handleNaturalCompletion()
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [totalSeconds, isStopwatch, handleNaturalCompletion])

  // ── RESTORE ACTIVE SESSION ON MOUNT ──
  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      if (statusRef.current === 'running' || statusRef.current === 'paused') return

      const persisted = await getActiveSession()
      if (!isMounted) return

      if (persisted) {
        if (persisted.sessionType === 'normal_stopwatch' || persisted.sessionType === 'focus_stopwatch') {
          setMode(persisted.sessionType)
          const baseElapsed = Number(persisted.elapsedSeconds) || 0
          if (persisted.status === 'active' && persisted.canonicalStartTime) {
            const nowMs = Date.now()
            const deltaSecs = Math.max(0, Math.floor((nowMs - persisted.canonicalStartTime) / 1000))
            const currentElapsed = baseElapsed + deltaSecs
            accumulatedSecondsRef.current = baseElapsed
            startedAtMsRef.current = persisted.canonicalStartTime
            setAccumulatedSeconds(baseElapsed)
            setStopwatchElapsed(currentElapsed)
            setStatus('running')
          } else {
            accumulatedSecondsRef.current = baseElapsed
            setAccumulatedSeconds(baseElapsed)
            setStopwatchElapsed(baseElapsed)
            setStatus('paused')
          }
          return
        }

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
        return
      }

      // Check cloud state if available
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

    if (isStopwatch) {
      const hrs = Math.floor(effectiveElapsedSeconds / 3600)
      const mins = Math.floor((effectiveElapsedSeconds % 3600) / 60)
      const secs = effectiveElapsedSeconds % 60
      const formatted = hrs > 0
        ? `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      const label = mode === 'focus_stopwatch' ? (taskName || 'Focus Stopwatch') : 'Stopwatch'

      if (isRunning) {
        document.title = `(${formatted}) ${label} · Nocturn`
      } else if (isPaused) {
        document.title = `[Paused ${formatted}] ${label} · Nocturn`
      } else {
        document.title = 'Nocturn — Calm Focus & Planning'
      }
    } else {
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
    }

    return () => {
      document.title = 'Nocturn — Calm Focus & Planning'
      setFaviconActive(false)
    }
  }, [isRunning, isPaused, remainingSeconds, effectiveElapsedSeconds, taskName, mode, isStopwatch])

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

  const startBreak = useCallback((isLong = false) => {
    const targetBreakMode = isLong ? 'longBreak' : 'shortBreak'
    startTimer(undefined, undefined, targetBreakMode)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startAnotherFocus = useCallback(() => {
    startTimer(undefined, undefined, 'focus')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const returnToPlan = useCallback(() => {
    navigate('/plan')
  }, [navigate])

  const contextValue = {
    mode,
    setMode,
    status,
    isRunning,
    isPaused,
    isCompleted: !isStopwatch && (status === 'completed' || (effectiveRemainingSeconds === 0 && !isRunning && !isPaused && status !== 'idle')),
    isStopwatch,
    isNormalStopwatch: mode === 'normal_stopwatch',
    isFocusStopwatch: mode === 'focus_stopwatch',
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
    startBreak,
    startAnotherFocus,
    returnToPlan,
    resetTimer,
    skipTimer,
    skipSession: skipTimer,
    terminateTimer: isStopwatch ? (mode === 'focus_stopwatch' ? finishFocusStopwatch : stopStopwatch) : resetTimer,
    applyPreset,
    startPlanSession: startTimer,
    completionModalData,
    closeCompletionModal: () => setCompletionModalData(null),
    handleCompleteSessionModal,
    pendingPreset,
    queuePendingPreset,
    resetCycles: () => updateCompletedFocusCount(0),
    // Stopwatch methods
    startStopwatch,
    pauseStopwatch,
    resumeStopwatch,
    stopStopwatch,
    resetStopwatch,
    finishFocusStopwatch,
    discardFocusStopwatch,
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
