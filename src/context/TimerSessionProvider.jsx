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

  const [completedFocusCount, setCompletedFocusCount] = useState(0)
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

  // Keep duration synchronized while idle
  useEffect(() => {
    if (status === 'idle') {
      const dur = getModeDurationSeconds(mode)
      setTotalSeconds(dur)
      setRemainingSeconds(dur)
      setElapsedSeconds(0)
    }
  }, [mode, settings?.focusDuration, settings?.shortBreakDuration, settings?.longBreakDuration, status, getModeDurationSeconds])

  // ── ADVANCE PHASE TRANSITION LOGIC ──
  const advancePhase = useCallback(
    async ({ isNaturalCompletion = false } = {}) => {
      if (isAdvancingRef.current) return
      isAdvancingRef.current = true

      try {
        const nowMs = Date.now()
        const currentMode = mode
        const currentCount = completedFocusCount
        const currentTask = taskName
        const currentTaskId = taskId
        const currentTotal = totalSeconds
        const currentRemaining = remainingSeconds
        const currentElapsed = Math.max(0, currentTotal - currentRemaining)

        if (currentMode === 'focus') {
          let newCount = currentCount

          if (isNaturalCompletion) {
            const focusMins = Math.round(currentTotal / 60) || 25
            const sessionStartedAt =
              activeSessionRef.current?.startedAt ||
              new Date(nowMs - currentTotal * 1000).toISOString()
            const sessionId = `focus-${sessionStartedAt}`

            // 1. Record completed focus session in Dexie
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

            newCount = currentCount + 1
            setCompletedFocusCount(newCount)

            // 2. Play warm bell sound
            if (isTimerSoundsEnabled()) {
              playBell()
            }

            // 3. Native OS Notification
            if (hasNotificationPermission()) {
              notifyTimerEnded(currentTask || 'Focus Session', sessionId)
            }

            // 4. Toast feedback
            addToast(`Focus session complete! (${focusMins} min logged)`, {
              type: 'success',
              duration: 4000,
            })
          } else {
            // Manual skip - record partial focus session if >= 60s
            if (currentElapsed >= 60) {
              const focusMins = Math.round((currentElapsed / 60) * 10) / 10
              const sessionStartedAt =
                activeSessionRef.current?.startedAt ||
                new Date(nowMs - currentElapsed * 1000).toISOString()
              await recordPomodoroSession({
                taskId: currentTaskId,
                duration: focusMins,
                durationSeconds: currentElapsed,
                sessionType: 'focus',
                startedAt: sessionStartedAt,
                taskTitle: currentTask,
                sessionId: `focus-${sessionStartedAt}`,
                completed: false,
              }).catch(console.warn)

              newCount = currentCount + 1
              setCompletedFocusCount(newCount)
            }
          }

          // Determine next break phase
          const longBreakInterval = Number(settings?.sessions) || 4
          const isLongBreak = newCount > 0 && newCount % longBreakInterval === 0
          const nextMode = isLongBreak ? 'longBreak' : 'shortBreak'
          const breakSecs = getModeDurationSeconds(nextMode)
          const autoStartBreaks = Boolean(settings?.autoStartBreaks)

          await clearActiveSession()
          updateActiveSession(null)

          setMode(nextMode)
          setTotalSeconds(breakSecs)
          setRemainingSeconds(breakSecs)
          setElapsedSeconds(0)
          hasWarned5mRef.current = false

          if (autoStartBreaks) {
            const nextEndAt = nowMs + breakSecs * 1000
            setStatus('running')
            setEndAt(nextEndAt)

            const sessionObj = {
              sessionId: `session-${nowMs}`,
              taskName: currentTask,
              sessionType: isLongBreak ? 'long_break' : 'short_break',
              configuredDuration: Math.round(breakSecs / 60),
              startedAt: new Date(nowMs).toISOString(),
              expectedEndAt: new Date(nextEndAt).toISOString(),
              status: 'active',
              currentSession: newCount + 1,
            }
            await recordActiveSession(sessionObj)
            updateActiveSession(sessionObj)

            if (updateTimerState) {
              await updateTimerState({
                actionId: crypto.randomUUID(),
                status: 'running',
                mode: nextMode,
                currentSession: newCount + 1,
                endAt: nextEndAt,
                totalSeconds: breakSecs,
                lastActionAt: new Date(nowMs).toISOString(),
              })
            }
          } else {
            setStatus('idle')
            setEndAt(null)

            if (updateTimerState) {
              await updateTimerState({
                actionId: crypto.randomUUID(),
                status: 'idle',
                mode: nextMode,
                currentSession: newCount + 1,
                endAt: null,
                totalSeconds: breakSecs,
                lastActionAt: new Date(nowMs).toISOString(),
              })
            }
          }

          // Summary Modal check (ONLY on focus completion & if setting enabled)
          if (isNaturalCompletion && Boolean(settings?.showSessionSummary)) {
            setCompletionModalData({
              sessionId: `focus-${Date.now()}`,
              taskTitle: currentTask,
              taskId: currentTaskId,
              durationMins: Math.round(currentTotal / 60),
              isLongBreak,
              planBlockId,
            })
          } else {
            setCompletionModalData(null)
          }

        } else {
          // BREAK (short or long) ENDS
          if (isNaturalCompletion) {
            if (isTimerSoundsEnabled()) {
              playBreakEndSound()
            }
            if (hasNotificationPermission()) {
              notifyTimerEnded('Break Over — Time to Focus')
            }
            addToast('Break completed. Ready to focus!', { type: 'info', duration: 4000 })
          }

          const focusSecs = getModeDurationSeconds('focus')
          const autoStartFocus = Boolean(settings?.autoStartPomo)

          await clearActiveSession()
          updateActiveSession(null)

          setMode('focus')
          setTotalSeconds(focusSecs)
          setRemainingSeconds(focusSecs)
          setElapsedSeconds(0)
          hasWarned5mRef.current = false
          setCompletionModalData(null) // NEVER show modal after break!

          if (autoStartFocus) {
            const nextEndAt = nowMs + focusSecs * 1000
            setStatus('running')
            setEndAt(nextEndAt)

            const sessionObj = {
              sessionId: `session-${nowMs}`,
              taskName: currentTask,
              sessionType: 'focus',
              configuredDuration: Math.round(focusSecs / 60),
              startedAt: new Date(nowMs).toISOString(),
              expectedEndAt: new Date(nextEndAt).toISOString(),
              status: 'active',
              currentSession: currentCount + 1,
            }
            await recordActiveSession(sessionObj)
            updateActiveSession(sessionObj)

            if (updateTimerState) {
              await updateTimerState({
                actionId: crypto.randomUUID(),
                status: 'running',
                mode: 'focus',
                currentSession: currentCount + 1,
                endAt: nextEndAt,
                totalSeconds: focusSecs,
                lastActionAt: new Date(nowMs).toISOString(),
              })
            }
          } else {
            setStatus('idle')
            setEndAt(null)

            if (updateTimerState) {
              await updateTimerState({
                actionId: crypto.randomUUID(),
                status: 'idle',
                mode: 'focus',
                currentSession: currentCount + 1,
                endAt: null,
                totalSeconds: focusSecs,
                lastActionAt: new Date(nowMs).toISOString(),
              })
            }
          }
        }
      } finally {
        setTimeout(() => {
          isAdvancingRef.current = false
        }, 400)
      }
    },
    [
      mode,
      completedFocusCount,
      taskName,
      taskId,
      totalSeconds,
      remainingSeconds,
      planBlockId,
      settings,
      getModeDurationSeconds,
      updateTimerState,
      addToast,
    ]
  )

  // ── START TIMER ──
  const startTimer = async (
    overrideTaskName,
    overrideTaskId,
    overrideMode,
    overrideDurationMinutes
  ) => {
    const targetMode = overrideMode || mode
    const targetMins =
      overrideDurationMinutes ||
      (targetMode === 'focus'
        ? settings?.focusDuration
        : targetMode === 'shortBreak'
        ? settings?.shortBreakDuration
        : settings?.longBreakDuration) ||
      25

    const durationSecs = Math.round(targetMins * 60)
    const nowMs = Date.now()
    const targetEndAt = nowMs + durationSecs * 1000

    if (overrideTaskName !== undefined) setTaskName(overrideTaskName)
    if (overrideTaskId !== undefined) setTaskId(overrideTaskId)

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
      taskId: overrideTaskId !== undefined ? overrideTaskId : taskId,
      taskName: overrideTaskName !== undefined ? overrideTaskName : taskName,
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
        taskName: overrideTaskName !== undefined ? overrideTaskName : taskName,
        taskId: overrideTaskId !== undefined ? overrideTaskId : taskId,
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
    await advancePhase({ isNaturalCompletion: false })
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
    setCompletedFocusCount(0)
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
          advancePhase({ isNaturalCompletion: true })
        }
      }, 250)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [status, endAt, totalSeconds, mode, taskName, advancePhase])

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
          advancePhase({ isNaturalCompletion: true })
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [totalSeconds, advancePhase])

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
          advancePhase({ isNaturalCompletion: true })
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
          advancePhase({ isNaturalCompletion: true })
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
    remainingSeconds,
    totalSeconds,
    elapsedSeconds,
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
    resetTimer,
    skipTimer,
    skipSession: skipTimer,
    terminateTimer: resetTimer,
    applyPreset,
    startPlanSession: startTimer,
    completionModalData,
    closeCompletionModal: () => setCompletionModalData(null),
    handleCompleteSessionModal,
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
