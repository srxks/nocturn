import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
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
import { getServerNowMs } from '../lib/timer'
import {
  initTimerSync,
  stopTimerSync,
  broadcastTimerState,
  getLocalTimerRevision,
  setLocalTimerRevision,
} from '../services/timerSyncService'
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
  const { user } = useAuth()
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

  const cycleLength = Math.max(1, Number(settings?.sessions) || 4)

  // ── EXPLICIT CYCLE STATE (INDEPENDENT FROM RAW SESSION ROW COUNT) ──
  const [cycleState, setCycleState] = useState(() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('nocturn_timer_cycle_state') : null
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') {
          const total = Math.max(1, Number(parsed.totalBlocks) || cycleLength)
          const blockIdx = Math.max(1, Math.min(total, Number(parsed.currentBlockIndex) || 1))
          const statuses = parsed.blockStatuses || {}
          if (!statuses[blockIdx]) statuses[blockIdx] = 'active'
          return {
            currentBlockIndex: blockIdx,
            completedBlocks: Math.max(0, Number(parsed.completedBlocks) || 0),
            skippedBlocks: Math.max(0, Number(parsed.skippedBlocks) || 0),
            terminatedBlocks: Math.max(0, Number(parsed.terminatedBlocks) || 0),
            totalBlocks: total,
            actualFocusedSeconds: Math.max(0, Number(parsed.actualFocusedSeconds) || 0),
            blockStatuses: statuses,
          }
        }
      }
    } catch {
      // ignore
    }
    const initialStatuses = {}
    for (let i = 1; i <= cycleLength; i++) {
      initialStatuses[i] = i === 1 ? 'active' : 'upcoming'
    }
    return {
      currentBlockIndex: 1,
      completedBlocks: 0,
      skippedBlocks: 0,
      terminatedBlocks: 0,
      totalBlocks: cycleLength,
      actualFocusedSeconds: 0,
      blockStatuses: initialStatuses,
    }
  })

  // Synchronize cycle total if settings.sessions changes
  useEffect(() => {
    const configuredSessions = Math.max(1, Number(settings?.sessions) || 4)
    setCycleState((prev) => {
      if (prev.totalBlocks === configuredSessions) return prev
      const newStatuses = { ...prev.blockStatuses }
      for (let i = 1; i <= configuredSessions; i++) {
        if (!newStatuses[i]) {
          newStatuses[i] = i === prev.currentBlockIndex ? 'active' : 'upcoming'
        }
      }
      const updated = {
        ...prev,
        totalBlocks: configuredSessions,
        currentBlockIndex: Math.min(prev.currentBlockIndex, configuredSessions),
        blockStatuses: newStatuses,
      }
      try {
        localStorage.setItem('nocturn_timer_cycle_state', JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [settings?.sessions])

  const saveCycleState = useCallback((newState, shouldBroadcast = false) => {
    setCycleState(newState)
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('nocturn_timer_cycle_state', JSON.stringify(newState))
        localStorage.setItem('nocturn_timer_cycles', String(newState.completedBlocks))
      }
    } catch {
      // ignore
    }
  }, [])

  const completedFocusCount = cycleState.completedBlocks
  const currentSession = cycleState.currentBlockIndex

  const [pendingPreset, setPendingPreset] = useState(null)
  const pendingPresetRef = useRef(null)

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

  // ── REMOTE STATE RECONCILIATION ──
  const applyRemoteTimerState = useCallback(
    (payload) => {
      if (!payload || typeof payload !== 'object') return

      const {
        mode: remoteMode,
        status: remoteStatus,
        endAt: remoteEndAt,
        remainingSecondsWhenPaused: remoteRemainingWhenPaused,
        totalSeconds: remoteTotalSeconds,
        elapsedSeconds: remoteElapsedSeconds,
        canonicalStartTime: remoteCanonicalStartTime,
        taskId: remoteTaskId,
        taskName: remoteTaskName,
        cycleState: remoteCycleState,
      } = payload

      // Reconcile cycleState if present
      if (remoteCycleState && typeof remoteCycleState === 'object') {
        setCycleState((prev) => {
          const merged = {
            currentBlockIndex: Math.max(1, Number(remoteCycleState.currentBlockIndex) || prev.currentBlockIndex),
            completedBlocks: Math.max(0, Number(remoteCycleState.completedBlocks) ?? prev.completedBlocks),
            skippedBlocks: Math.max(0, Number(remoteCycleState.skippedBlocks) ?? prev.skippedBlocks),
            terminatedBlocks: Math.max(0, Number(remoteCycleState.terminatedBlocks) ?? prev.terminatedBlocks),
            totalBlocks: Math.max(1, Number(remoteCycleState.totalBlocks) || prev.totalBlocks),
            actualFocusedSeconds: Math.max(0, Number(remoteCycleState.actualFocusedSeconds) ?? prev.actualFocusedSeconds),
            blockStatuses: remoteCycleState.blockStatuses || prev.blockStatuses,
          }
          try {
            localStorage.setItem('nocturn_timer_cycle_state', JSON.stringify(merged))
            localStorage.setItem('nocturn_timer_cycles', String(merged.completedBlocks))
          } catch {}
          return merged
        })
      }

      if (remoteTaskName !== undefined) setTaskName(remoteTaskName || '')
      if (remoteTaskId !== undefined) setTaskId(remoteTaskId || null)

      const targetMode = remoteMode || mode
      const isRemoteStopwatch = targetMode === 'normal_stopwatch' || targetMode === 'focus_stopwatch'
      setMode(targetMode)

      if (isRemoteStopwatch) {
        const baseElapsed = Number(remoteElapsedSeconds) || 0
        if (remoteStatus === 'running' && remoteCanonicalStartTime) {
          const nowMs = getServerNowMs()
          const deltaSecs = Math.max(0, Math.floor((nowMs - remoteCanonicalStartTime) / 1000))
          accumulatedSecondsRef.current = baseElapsed
          startedAtMsRef.current = remoteCanonicalStartTime
          setAccumulatedSeconds(baseElapsed)
          setStopwatchElapsed(baseElapsed + deltaSecs)
          setStatus('running')
        } else if (remoteStatus === 'paused') {
          accumulatedSecondsRef.current = baseElapsed
          startedAtMsRef.current = null
          setAccumulatedSeconds(baseElapsed)
          setStopwatchElapsed(baseElapsed)
          setStatus('paused')
        } else {
          // idle or reset
          accumulatedSecondsRef.current = 0
          startedAtMsRef.current = null
          setAccumulatedSeconds(0)
          setStopwatchElapsed(0)
          setStatus('idle')
        }
        return
      }

      // Countdown modes (focus, shortBreak, longBreak)
      const configuredTotal = Number(remoteTotalSeconds) || getModeDurationSeconds(targetMode)
      setTotalSeconds(configuredTotal)

      if (remoteStatus === 'running' && remoteEndAt) {
        const nowMs = getServerNowMs()
        const remaining = Math.max(0, Math.round((remoteEndAt - nowMs) / 1000))
        if (remaining > 0) {
          setStatus('running')
          setEndAt(remoteEndAt)
          setRemainingSeconds(remaining)
          setElapsedSeconds(Math.max(0, configuredTotal - remaining))
        } else {
          setStatus('completed')
          setEndAt(null)
          setRemainingSeconds(0)
          setElapsedSeconds(configuredTotal)
        }
      } else if (remoteStatus === 'paused') {
        const remaining = Number.isFinite(Number(remoteRemainingWhenPaused))
          ? Number(remoteRemainingWhenPaused)
          : configuredTotal
        setStatus('paused')
        setEndAt(null)
        setRemainingSeconds(remaining)
        setElapsedSeconds(Math.max(0, configuredTotal - remaining))
      } else if (remoteStatus === 'completed') {
        setStatus('completed')
        setEndAt(null)
        setRemainingSeconds(0)
        setElapsedSeconds(configuredTotal)
      } else {
        // idle
        setStatus('idle')
        setEndAt(null)
        setRemainingSeconds(configuredTotal)
        setElapsedSeconds(0)
      }
    },
    [mode, getModeDurationSeconds]
  )

  // Listen for realtime timer synchronization
  useEffect(() => {
    if (!user?.id) return
    initTimerSync(user.id, (remotePayload) => {
      applyRemoteTimerState(remotePayload)
    })

    const handleWindowSync = (e) => {
      if (e.detail) {
        applyRemoteTimerState(e.detail)
      }
    }
    window.addEventListener('nocturn:remote-timer-sync', handleWindowSync)

    return () => {
      window.removeEventListener('nocturn:remote-timer-sync', handleWindowSync)
      stopTimerSync()
    }
  }, [user?.id, applyRemoteTimerState])

  // Synchronize duration when idle whenever mode or settings change
  useEffect(() => {
    if (status === 'idle' && !isStopwatch) {
      const dur = getModeDurationSeconds(mode)
      setTotalSeconds(dur)
      setRemainingSeconds(dur)
      setElapsedSeconds(0)
    }
  }, [status, isStopwatch, mode, getModeDurationSeconds])

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
      const sessionId =
        activeSessionRef.current?.sessionId ||
        `session-${new Date(sessionStartedAt).getTime()}`

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

      const nextCycleState = {
        ...(currentMode === 'focus'
          ? {
              ...cycleState,
              completedBlocks: cycleState.completedBlocks + 1,
              actualFocusedSeconds: cycleState.actualFocusedSeconds + currentTotal,
              blockStatuses: { ...cycleState.blockStatuses, [cycleState.currentBlockIndex]: 'completed' },
            }
          : cycleState),
      }

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

        saveCycleState(nextCycleState)

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
        const isLongBreak = nextCycleState.completedBlocks > 0 && nextCycleState.completedBlocks % longBreakInterval === 0
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
        const stateObj = {
          actionId: crypto.randomUUID(),
          status: 'completed',
          mode: currentMode,
          currentSession: cycleState.currentBlockIndex,
          endAt: null,
          totalSeconds: currentTotal,
          lastActionAt: new Date(nowMs).toISOString(),
          cycleState: nextCycleState,
        }
        await updateTimerState(stateObj)
        if (user?.id) {
          broadcastTimerState(user.id, stateObj)
        }
      }
    } finally {
      setTimeout(() => {
        isAdvancingRef.current = false
      }, 400)
    }
  }, [
    mode,
    cycleState,
    saveCycleState,
    taskName,
    taskId,
    totalSeconds,
    planBlockId,
    settings,
    updateTimerState,
    addToast,
    user?.id,
  ])

  // ── START NEXT PHASE (EXPLICIT USER CLICK REQUIRED) ──
  const startNextPhase = useCallback(async () => {
    const nowMs = Date.now()
    hasWarned5mRef.current = false

    if (mode === 'focus') {
      const longBreakInterval = cycleState.totalBlocks
      const isLongBreak = cycleState.completedBlocks > 0 && cycleState.completedBlocks % longBreakInterval === 0
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
        currentSession: cycleState.currentBlockIndex,
      }
      await recordActiveSession(sessionObj)
      updateActiveSession(sessionObj)

      if (updateTimerState) {
        const stateObj = {
          actionId: crypto.randomUUID(),
          status: 'running',
          mode: nextMode,
          currentSession: cycleState.currentBlockIndex,
          endAt: nextEndAt,
          totalSeconds: breakSecs,
          lastActionAt: new Date(nowMs).toISOString(),
          cycleState,
        }
        await updateTimerState(stateObj)
        if (user?.id) {
          broadcastTimerState(user.id, stateObj)
        }
      }
    } else {
      const total = cycleState.totalBlocks
      const nextIdx = cycleState.currentBlockIndex < total ? cycleState.currentBlockIndex + 1 : 1
      const updatedStatuses = { ...cycleState.blockStatuses, [nextIdx]: 'active' }
      const updatedCycle = {
        ...cycleState,
        currentBlockIndex: nextIdx,
        blockStatuses: updatedStatuses,
      }
      saveCycleState(updatedCycle)

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
        currentSession: nextIdx,
      }
      await recordActiveSession(sessionObj)
      updateActiveSession(sessionObj)

      if (updateTimerState) {
        const stateObj = {
          actionId: crypto.randomUUID(),
          status: 'running',
          mode: 'focus',
          currentSession: nextIdx,
          endAt: nextEndAt,
          totalSeconds: focusSecs,
          lastActionAt: new Date(nowMs).toISOString(),
          cycleState: updatedCycle,
        }
        await updateTimerState(stateObj)
        if (user?.id) {
          broadcastTimerState(user.id, stateObj)
        }
      }
    }
  }, [mode, cycleState, taskName, getModeDurationSeconds, saveCycleState, updateTimerState, user?.id])

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

    let activeBlockIndex = cycleState.currentBlockIndex
    if (targetMode === 'focus' && cycleState.blockStatuses[activeBlockIndex] === 'completed') {
      activeBlockIndex = activeBlockIndex < cycleState.totalBlocks ? activeBlockIndex + 1 : 1
      saveCycleState({
        ...cycleState,
        currentBlockIndex: activeBlockIndex,
        blockStatuses: {
          ...cycleState.blockStatuses,
          [activeBlockIndex]: 'active',
        },
      })
    }

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
      currentSession: activeBlockIndex,
    }
    updateActiveSession(sessionObj)
    await recordActiveSession(sessionObj)

    if (updateTimerState) {
      const stateObj = {
        actionId: crypto.randomUUID(),
        status: 'running',
        mode: targetMode,
        endAt: targetEndAt,
        totalSeconds: durationSecs,
        currentSession: activeBlockIndex,
        taskName: actualTaskName !== undefined ? actualTaskName : taskName,
        taskId: actualTaskId !== undefined ? actualTaskId : taskId,
        lastActionAt: new Date(nowMs).toISOString(),
        cycleState,
      }
      await updateTimerState(stateObj)
      if (user?.id) {
        broadcastTimerState(user.id, stateObj)
      }
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
      const stateObj = {
        actionId: crypto.randomUUID(),
        status: 'paused',
        mode,
        endAt: null,
        remainingSecondsWhenPaused: safeRemaining,
        totalSeconds,
        lastActionAt: new Date(nowMs).toISOString(),
        cycleState,
      }
      await updateTimerState(stateObj)
      if (user?.id) {
        broadcastTimerState(user.id, stateObj)
      }
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
      const stateObj = {
        actionId: crypto.randomUUID(),
        status: 'running',
        mode,
        endAt: targetEndAt,
        totalSeconds,
        lastActionAt: new Date(nowMs).toISOString(),
        cycleState,
      }
      await updateTimerState(stateObj)
      if (user?.id) {
        broadcastTimerState(user.id, stateObj)
      }
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

    if (updateTimerState) {
      const stateObj = {
        actionId: crypto.randomUUID(),
        status: 'running',
        mode,
        canonicalStartTime: nowMs,
        elapsedSeconds: accumulatedSecondsRef.current,
        taskName: sessionObj.taskName,
        taskId: sessionObj.taskId,
        lastActionAt: new Date(nowMs).toISOString(),
        cycleState,
      }
      await updateTimerState(stateObj)
      if (user?.id) {
        broadcastTimerState(user.id, stateObj)
      }
    }
  }, [mode, taskId, taskName, updateTimerState, user?.id, cycleState])

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

    if (updateTimerState) {
      const stateObj = {
        actionId: crypto.randomUUID(),
        status: 'paused',
        mode,
        canonicalStartTime: null,
        elapsedSeconds: totalElapsed,
        lastActionAt: new Date(nowMs).toISOString(),
        cycleState,
      }
      await updateTimerState(stateObj)
      if (user?.id) {
        broadcastTimerState(user.id, stateObj)
      }
    }
  }, [status, mode, updateTimerState, user?.id, cycleState])

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

    if (updateTimerState) {
      const stateObj = {
        actionId: crypto.randomUUID(),
        status: 'running',
        mode,
        canonicalStartTime: nowMs,
        elapsedSeconds: accumulatedSecondsRef.current,
        lastActionAt: new Date(nowMs).toISOString(),
        cycleState,
      }
      await updateTimerState(stateObj)
      if (user?.id) {
        broadcastTimerState(user.id, stateObj)
      }
    }
  }, [status, mode, updateTimerState, user?.id, cycleState])

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

    if (updateTimerState) {
      const stateObj = {
        actionId: crypto.randomUUID(),
        status: 'idle',
        mode,
        canonicalStartTime: null,
        elapsedSeconds: 0,
        lastActionAt: new Date().toISOString(),
        cycleState,
      }
      await updateTimerState(stateObj)
      if (user?.id) {
        broadcastTimerState(user.id, stateObj)
      }
    }
  }, [mode, updateTimerState, user?.id, cycleState])

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
      const sessionId = activeSessionRef.current?.sessionId || `focus-stopwatch-${nowMs}`
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

      // Update actualFocusedSeconds in cycleState exactly once
      saveCycleState({
        ...cycleState,
        actualFocusedSeconds: cycleState.actualFocusedSeconds + runningSecs,
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
  }, [status, taskId, taskName, cycleState, saveCycleState, addToast])

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

  // ── RESET TIMER (RESET CURRENT BLOCK ONLY, PRESERVES HISTORICAL COMPLETED SESSIONS) ──
  const resetTimer = async () => {
    if (isStopwatch) {
      await resetStopwatch()
      addToast('Stopwatch reset', { type: 'info', duration: 2500 })
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
        const stateObj = {
          actionId: crypto.randomUUID(),
          status: 'idle',
          mode,
          endAt: null,
          totalSeconds: resetDur,
          lastActionAt: new Date().toISOString(),
          cycleState,
        }
        await updateTimerState(stateObj)
        if (user?.id) {
          broadcastTimerState(user.id, stateObj)
        }
      }
      addToast('Current block reset', { type: 'info', duration: 2500 })
    }
  }

  // ── SKIP TIMER (EXPLICITLY ADVANCES CYCLE INDEX WITHOUT ADDING MINUTES OR INCREMENTING COMPLETED) ──
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
      const currIdx = cycleState.currentBlockIndex
      const total = cycleState.totalBlocks
      const nextIdx = currIdx < total ? currIdx + 1 : 1
      const updatedStatuses = {
        ...cycleState.blockStatuses,
        [currIdx]: 'skipped',
        [nextIdx]: 'active',
      }
      const updatedCycle = {
        ...cycleState,
        currentBlockIndex: nextIdx,
        skippedBlocks: cycleState.skippedBlocks + 1,
        blockStatuses: updatedStatuses,
      }
      saveCycleState(updatedCycle)

      const isLongBreak = currIdx % total === 0
      const nextMode = isLongBreak ? 'longBreak' : 'shortBreak'
      const breakSecs = getModeDurationSeconds(nextMode)

      setMode(nextMode)
      setTotalSeconds(breakSecs)
      setRemainingSeconds(breakSecs)
      setElapsedSeconds(0)
      setStatus('idle')

      if (updateTimerState) {
        const stateObj = {
          actionId: crypto.randomUUID(),
          status: 'idle',
          mode: nextMode,
          endAt: null,
          totalSeconds: breakSecs,
          lastActionAt: new Date().toISOString(),
          cycleState: updatedCycle,
        }
        await updateTimerState(stateObj)
        if (user?.id) {
          broadcastTimerState(user.id, stateObj)
        }
      }

      addToast(`Block ${currIdx} skipped`, { type: 'info', duration: 3000 })
    } else {
      const focusSecs = getModeDurationSeconds('focus')
      setMode('focus')
      setTotalSeconds(focusSecs)
      setRemainingSeconds(focusSecs)
      setElapsedSeconds(0)
      setStatus('idle')

      if (updateTimerState) {
        const stateObj = {
          actionId: crypto.randomUUID(),
          status: 'idle',
          mode: 'focus',
          endAt: null,
          totalSeconds: focusSecs,
          lastActionAt: new Date().toISOString(),
          cycleState,
        }
        await updateTimerState(stateObj)
        if (user?.id) {
          broadcastTimerState(user.id, stateObj)
        }
      }

      addToast('Break skipped — ready to focus', { type: 'info', duration: 3000 })
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
    const durSecs = focus * 60

    await updateSettings({
      focusDuration: focus,
      shortBreakDuration: short,
      longBreakDuration: long,
      sessions: sess,
      timerState: {
        actionId: crypto.randomUUID(),
        status: 'idle',
        mode: 'focus',
        endAt: null,
        totalSeconds: durSecs,
        lastActionAt: new Date().toISOString(),
      },
    })

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

    addToast(`Applied ${preset.name || preset.label || 'preset'} (${focus}/${short}/${long} min)`, {
      type: 'success',
      duration: 3000,
    })
  }

  // ── TERMINATE TIMER (EXPLICIT CANCELLATION / NOT LOGGED AS COMPLETED) ──
  const terminateTimer = useCallback(async () => {
    if (isStopwatch) {
      if (mode === 'focus_stopwatch') {
        await discardFocusStopwatch()
      } else {
        await resetStopwatch()
      }
      return
    }

    const nowMs = Date.now()
    const currentRemaining = endAt ? Math.max(0, Math.round((endAt - nowMs) / 1000)) : remainingSeconds
    const elapsedSecs = Math.max(0, totalSeconds - currentRemaining)

    const resetDur = getModeDurationSeconds('focus')
    setMode('focus')
    setStatus('idle')
    setEndAt(null)
    setTotalSeconds(resetDur)
    setRemainingSeconds(resetDur)
    setElapsedSeconds(0)
    hasWarned5mRef.current = false

    await clearActiveSession()
    updateActiveSession(null)

    const nextCycleState = {
      ...(mode === 'focus'
        ? {
            ...cycleState,
            terminatedBlocks: cycleState.terminatedBlocks + 1,
            actualFocusedSeconds: cycleState.actualFocusedSeconds + elapsedSecs,
            blockStatuses: { ...cycleState.blockStatuses, [cycleState.currentBlockIndex]: 'terminated' },
          }
        : cycleState),
    }

    if (mode === 'focus') {
      saveCycleState(nextCycleState)
    }

    if (updateTimerState) {
      const stateObj = {
        actionId: crypto.randomUUID(),
        status: 'idle',
        mode: 'focus',
        endAt: null,
        totalSeconds: resetDur,
        lastActionAt: new Date(nowMs).toISOString(),
        cycleState: nextCycleState,
      }
      await updateTimerState(stateObj)
      if (user?.id) {
        broadcastTimerState(user.id, stateObj)
      }
    }

    if (mode === 'focus') {
      const currIdx = cycleState.currentBlockIndex
      if (elapsedSecs >= 1) {
        const focusMins = Math.round((elapsedSecs / 60) * 10) / 10
        const displayMins = Math.round(elapsedSecs / 60)
        const displayTime = elapsedSecs >= 60 ? `${displayMins}m` : `${elapsedSecs}s`
        const sessionStartedAt =
          activeSessionRef.current?.startedAt ||
          new Date(nowMs - elapsedSecs * 1000).toISOString()
        const sessionId =
          activeSessionRef.current?.sessionId ||
          `session-${new Date(sessionStartedAt).getTime()}`

        await recordPomodoroSession({
          taskId: taskId || null,
          duration: focusMins,
          durationSeconds: elapsedSecs,
          sessionType: 'focus',
          startedAt: sessionStartedAt,
          taskTitle: taskName || 'Focus Session',
          sessionId,
          completed: false,
        }).catch(console.warn)

        addToast(`Focus session ended early — ${displayTime} focused`, {
          type: 'info',
          duration: 3500,
        })
      } else {
        addToast('Focus session ended', {
          type: 'info',
          duration: 3000,
        })
      }
    } else {
      addToast('Break ended', {
        type: 'info',
        duration: 3000,
      })
    }
  }, [
    isStopwatch,
    mode,
    endAt,
    remainingSeconds,
    totalSeconds,
    taskId,
    taskName,
    cycleState,
    saveCycleState,
    getModeDurationSeconds,
    discardFocusStopwatch,
    resetStopwatch,
    updateTimerState,
    addToast,
    user?.id,
  ])

  // ── RESET CYCLE (CYCLE RE-INITIALIZATION ONLY, DOES NOT DELETE HISTORY) ──
  const resetCycle = useCallback(async () => {
    const total = Math.max(1, Number(settings?.sessions) || 4)
    const initialStatuses = {}
    for (let i = 1; i <= total; i++) {
      initialStatuses[i] = i === 1 ? 'active' : 'upcoming'
    }
    const newCycleState = {
      currentBlockIndex: 1,
      completedBlocks: 0,
      skippedBlocks: 0,
      terminatedBlocks: 0,
      totalBlocks: total,
      actualFocusedSeconds: 0,
      blockStatuses: initialStatuses,
    }
    saveCycleState(newCycleState)

    const focusDur = getModeDurationSeconds('focus')
    setMode('focus')
    setStatus('idle')
    setEndAt(null)
    setTotalSeconds(focusDur)
    setRemainingSeconds(focusDur)
    setElapsedSeconds(0)
    hasWarned5mRef.current = false
    await clearActiveSession()
    updateActiveSession(null)

    if (updateTimerState) {
      const stateObj = {
        actionId: crypto.randomUUID(),
        status: 'idle',
        mode: 'focus',
        endAt: null,
        totalSeconds: focusDur,
        lastActionAt: new Date().toISOString(),
        cycleState: newCycleState,
      }
      await updateTimerState(stateObj)
      if (user?.id) {
        broadcastTimerState(user.id, stateObj)
      }
    }

    addToast('Cycle reset to Block 1', { type: 'info', duration: 3000 })
  }, [settings, getModeDurationSeconds, saveCycleState, addToast, updateTimerState, user?.id])

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
            clearInterval(interval)
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
          updateActiveSession(persisted)
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
    cycleLength,
    currentSession,
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
    terminateTimer,
    applyPreset,
    startPlanSession: startTimer,
    completionModalData,
    closeCompletionModal: () => setCompletionModalData(null),
    handleCompleteSessionModal,
    pendingPreset,
    queuePendingPreset,
    cycleState,
    resetCycle,
    resetCycles: resetCycle,
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
