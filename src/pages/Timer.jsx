import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings,
  Clock,
  Edit3,
  Maximize2,
  Square,
  RotateCcw,
  Headphones,
  ChevronDown,
  X,
} from 'lucide-react'
import TimerRing from '../components/timer/TimerRing'
import TimerControls from '../components/timer/TimerControls'
import SessionDots from '../components/timer/SessionDots'
import FocusModeOverlay from '../components/timer/FocusModeOverlay'
import AmbientSoundWidget from '../components/timer/AmbientSoundWidget'
import TimerSettingsDrawer from '../components/timer/TimerSettingsDrawer'
import { useTimerSettings } from '../context/useTimerSettings'
import { useTimerSession } from '../context/useTimerSession'
import { useTasks } from '../context/useTasks'
import { subscribeAmbientState } from '../services/ambientSoundService'
import { TIMER_PRESETS } from '../lib/timer'

export default function Timer() {
  const { settings } = useTimerSettings()
  const { tasks } = useTasks()
  const location = useLocation()

  const {
    mode,
    isStopwatch,
    isNormalStopwatch,
    isFocusStopwatch,
    isRunning,
    isPaused,
    remainingSeconds,
    totalSeconds,
    elapsedSeconds,
    currentSession,
    completedFocusCount,
    cycleState,
    resetCycle,
    status,
    isCompleted: isSessionCompleted,
    taskName,
    setTaskName,
    taskId,
    setTaskId,
    togglePlayPause,
    resetTimer,
    skipTimer,
    terminateTimer,
    applyPreset,
    blockTimeRange,
    pendingPreset,
    queuePendingPreset,
    startBreak,
    startAnotherFocus,
    returnToPlan,
    finishFocusStopwatch,
    discardFocusStopwatch,
  } = useTimerSession()

  const [isEditingTask, setIsEditingTask] = useState(false)
  const [taskInputVal, setTaskInputVal] = useState('')
  const [selectedPreset, setSelectedPreset] = useState(() => {
    return localStorage.getItem('nocturn_timer_preset') || 'pomodoro'
  })
  const [pendingSwitchPreset, setPendingSwitchPreset] = useState(null)
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(() => Boolean(location.state?.focusMode))
  const [prevFocusModeProp, setPrevFocusModeProp] = useState(location.state?.focusMode)
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showResetCycleConfirm, setShowResetCycleConfirm] = useState(false)
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false)
  const [isSoundscapeDrawerOpen, setIsSoundscapeDrawerOpen] = useState(false)
  const [isMoreModesOpen, setIsMoreModesOpen] = useState(false)
  const [hasActiveSound, setHasActiveSound] = useState(false)
  const moreModesRef = useRef(null)

  useEffect(() => {
    return subscribeAmbientState((state) => {
      setHasActiveSound(Boolean(state.activeStems?.length > 0 && !state.isMuted))
    })
  }, [])

  // Close more modes dropdown when clicking outside
  useEffect(() => {
    if (!isMoreModesOpen) return
    const handleClickOutside = (e) => {
      if (moreModesRef.current && !moreModesRef.current.contains(e.target)) {
        setIsMoreModesOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMoreModesOpen])

  const activePresetId = useMemo(() => {
    if (isNormalStopwatch) return 'normal_stopwatch'
    if (isFocusStopwatch) return 'focus_stopwatch'
    const found = TIMER_PRESETS.find(
      (p) => !p.type && p.duration === settings?.focusDuration && p.sessions === settings?.sessions
    )
    return found ? found.id : selectedPreset
  }, [isNormalStopwatch, isFocusStopwatch, settings?.focusDuration, settings?.sessions, selectedPreset])

  if (location.state?.focusMode !== prevFocusModeProp) {
    setPrevFocusModeProp(location.state?.focusMode)
    if (location.state?.focusMode) {
      setIsFocusModeOpen(true)
    }
  }

  // Auto-pause when tab is blurred if setting enabled
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && settings?.autoPauseOnBlur && isRunning) {
        togglePlayPause()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [settings?.autoPauseOnBlur, isRunning, togglePlayPause])

  // Active uncompleted tasks available for quick assignment
  const activeTaskList = useMemo(
    () => tasks.filter((t) => !t.completed).slice(0, 6),
    [tasks]
  )

  // Sync taskName when location state passes a new taskName
  useEffect(() => {
    if (location.state?.taskName && location.state.taskName !== taskName) {
      setTaskName(location.state.taskName)
    }
    if (location.state?.taskId && location.state.taskId !== taskId) {
      setTaskId(location.state.taskId)
    }
  }, [location.state?.taskName, location.state?.taskId, setTaskName, setTaskId, taskName, taskId])

  const handleStartEdit = () => {
    setTaskInputVal(taskName || '')
    setIsEditingTask(true)
  }

  const handleSaveTaskName = (e) => {
    e.preventDefault()
    setTaskName(taskInputVal.trim())
    setIsEditingTask(false)
  }

  const handlePickTask = (t) => {
    setTaskName(t.title)
    if (setTaskId) setTaskId(t.id)
    setIsEditingTask(false)
  }

  const handleSelectPreset = (preset) => {
    if (preset.id === selectedPreset && !pendingPreset) return

    if (isRunning || isPaused) {
      setPendingSwitchPreset(preset)
      return
    }

    setSelectedPreset(preset.id)
    try {
      localStorage.setItem('nocturn_timer_preset', preset.id)
    } catch {
      // localStorage may fail in private mode
    }
    if (applyPreset) {
      applyPreset(preset)
    }
  }

  const handleTogglePlayPause = useCallback(() => {
    togglePlayPause()
  }, [togglePlayPause])

  const handleRequestEndSession = useCallback(() => {
    if (status !== 'running' && status !== 'paused' && mode === 'focus') return
    setShowEndSessionConfirm(true)
  }, [status, mode])

  const handleConfirmEndSession = useCallback(async () => {
    setShowEndSessionConfirm(false)
    await terminateTimer()
  }, [terminateTimer])

  const handleRequestReset = useCallback(() => {
    // Require confirmation only if resetting an active/paused session with >= 15s elapsed to prevent accidental loss
    if ((isRunning || isPaused) && elapsedSeconds >= 15) {
      setShowResetConfirm(true)
    } else {
      resetTimer()
    }
  }, [isRunning, isPaused, elapsedSeconds, resetTimer])

  // ONLY EXCEPTION: Spacebar toggles Play/Pause on the /timer route (and only when not inside an input/textarea)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        const activeTag = document.activeElement?.tagName?.toLowerCase()
        const isInput =
          activeTag === 'input' ||
          activeTag === 'textarea' ||
          activeTag === 'select' ||
          document.activeElement?.isContentEditable

        if (!isInput) {
          e.preventDefault()
          handleTogglePlayPause()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleTogglePlayPause])

  const modeLabel = isNormalStopwatch
    ? 'NORMAL STOPWATCH'
    : isFocusStopwatch
    ? 'FOCUS STOPWATCH'
    : mode === 'focus'
    ? 'FOCUS'
    : mode === 'shortBreak'
    ? 'SHORT BREAK'
    : 'LONG BREAK'

  const isCompleted = isSessionCompleted || (!isStopwatch && (status === 'completed' || (remainingSeconds === 0 && !isRunning && !isPaused && status !== 'idle')))
  const isLongBreak = completedFocusCount > 0 && completedFocusCount % (Number(settings?.sessions) || 4) === 0

  const isPomodoroSelected = activePresetId === 'pomodoro'
  const isStopwatchSelected = isStopwatch || activePresetId === 'focus_stopwatch' || activePresetId === 'normal_stopwatch'

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 sm:space-y-8 py-2">
      {/* Top Header Toolbar */}
      <header className="flex items-center justify-between gap-3 px-1 pb-3 border-b border-white/[0.06]">
        {/* Left: Mode Switcher Pills (Pomodoro | Stopwatch | More) */}
        <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] text-xs">
          <button
            type="button"
            onClick={() => {
              const p = TIMER_PRESETS.find((x) => x.id === 'pomodoro')
              if (p) handleSelectPreset(p)
            }}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              isPomodoroSelected
                ? 'bg-emerald-500 text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Pomodoro
          </button>
          <button
            type="button"
            onClick={() => {
              const p = TIMER_PRESETS.find((x) => x.id === 'focus_stopwatch')
              if (p) handleSelectPreset(p)
            }}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              isStopwatchSelected
                ? 'bg-emerald-500 text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Stopwatch
          </button>

          {/* More Modes Dropdown */}
          <div className="relative" ref={moreModesRef}>
            <button
              type="button"
              onClick={() => setIsMoreModesOpen(!isMoreModesOpen)}
              className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                !isPomodoroSelected && !isStopwatchSelected
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>More</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isMoreModesOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-48 bg-[#12141c] border border-white/10 rounded-xl shadow-2xl p-1 z-30 space-y-0.5">
                {TIMER_PRESETS.filter((p) => p.id !== 'pomodoro' && p.id !== 'focus_stopwatch').map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      handleSelectPreset(preset)
                      setIsMoreModesOpen(false)
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      activePresetId === preset.id
                        ? 'bg-emerald-500/15 text-emerald-300 font-semibold'
                        : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{preset.name}</span>
                    {activePresetId === preset.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Toolbar Utilities: Soundscape, Zen Mode, Settings */}
        <div className="flex items-center gap-1.5">
          {/* Soundscapes Toggle Button */}
          <button
            type="button"
            onClick={() => setIsSoundscapeDrawerOpen(true)}
            title="Ambient Soundscapes"
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-all ${
              hasActiveSound
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border-white/10'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Soundscape</span>
            {hasActiveSound && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* Fullscreen Zen Mode Button */}
          <button
            type="button"
            onClick={() => setIsFocusModeOpen(true)}
            title="Enter Fullscreen Zen Mode"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 border border-white/10 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Zen</span>
          </button>

          {/* Settings Gear */}
          <button
            type="button"
            onClick={() => setIsSettingsDrawerOpen(true)}
            aria-label="Timer settings"
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 border border-white/10 transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </header>

      {/* Main Focus Content Area (Distraction-Free) */}
      <div className="flex flex-col items-center justify-center space-y-5 sm:space-y-6">
        {/* Phase Header Label */}
        <div className="text-center space-y-0.5">
          <span className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase font-mono">
            {modeLabel}
          </span>
          <p className="text-xs text-neutral-400 font-medium">
            {isNormalStopwatch
              ? 'Standard Count-Up Stopwatch'
              : isFocusStopwatch
              ? 'Open-Ended Focus Session'
              : mode === 'focus'
              ? `Session ${currentSession} of ${settings?.sessions || 4}`
              : 'Rest & Recharge'}
          </p>
        </div>

        {/* Circular Timer Ring with Digital Readout */}
        <div className="py-1">
          <TimerRing
            remainingSeconds={remainingSeconds}
            totalSeconds={totalSeconds}
            elapsedSeconds={elapsedSeconds}
            mode={mode}
            modeLabel={modeLabel}
            isRunning={isRunning}
            isPaused={isPaused}
            isCompleted={isCompleted}
          />
        </div>

        {/* Focus Target / Task Name Line */}
        <div className="w-full max-w-sm text-center">
          {isEditingTask ? (
            <div className="space-y-2 bg-[#12141c] border border-white/10 rounded-2xl p-3 shadow-xl text-left">
              <form onSubmit={handleSaveTaskName} className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  value={taskInputVal}
                  onChange={(e) => setTaskInputVal(e.target.value)}
                  placeholder="Task or subject name..."
                  className="flex-1 bg-neutral-900 border border-emerald-500/50 text-white text-xs px-3 py-1.5 rounded-xl outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-semibold cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTask(false)}
                  className="px-2 py-1.5 rounded-xl text-neutral-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </form>

              {activeTaskList.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-white/10">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Choose from your tasks:
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar">
                    {activeTaskList.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handlePickTask(t)}
                        className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-white/5 transition-colors text-left truncate cursor-pointer"
                      >
                        <span className="truncate">{t.title}</span>
                        {t.priority === 'urgent' || t.priority === 'high' ? (
                          <span className="text-[10px] font-mono text-rose-400">High</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={handleStartEdit}
              className="group cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors"
            >
              <h2
                className={`text-sm font-medium transition-colors ${
                  taskName.trim()
                    ? 'text-white group-hover:text-emerald-400'
                    : 'text-neutral-500 italic group-hover:text-neutral-300'
                }`}
              >
                {taskName.trim() ? `Focusing on: ${taskName}` : '+ Assign a task to focus on'}
              </h2>
              <Edit3 className="w-3 h-3 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Session Progress Dots (Shown for countdown modes only) */}
        {!isStopwatch && (
          <div className="w-full flex flex-col items-center space-y-1">
            <SessionDots
              currentSession={currentSession}
              totalSessions={settings?.sessions || 4}
              isBreak={mode !== 'focus'}
              blockStatuses={cycleState?.blockStatuses || {}}
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-400 font-medium">
                {mode === 'focus'
                  ? `${cycleState?.completedBlocks ?? completedFocusCount} of ${cycleState?.totalBlocks ?? settings?.sessions ?? 4} blocks completed`
                  : isRunning
                  ? 'Break in progress'
                  : isPaused
                  ? 'Break paused'
                  : 'Break ready to start'}
              </span>
              <span className="text-white/20">•</span>
              <button
                type="button"
                data-testid="timer-inline-reset-cycle-btn"
                onClick={() => setShowResetCycleConfirm(true)}
                className="text-[11px] text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
              >
                Reset Cycle
              </button>
            </div>
          </div>
        )}

        {/* Main Timer Controls */}
        <TimerControls
          isRunning={isRunning}
          isPaused={isPaused}
          isCompleted={isCompleted}
          mode={mode}
          isLongBreak={isLongBreak}
          onTogglePlayPause={handleTogglePlayPause}
          onReset={handleRequestReset}
          onSkip={skipTimer}
          onTerminate={handleRequestEndSession}
          onFinishFocus={finishFocusStopwatch}
          onDiscardFocus={discardFocusStopwatch}
          onStartBreak={() => startBreak(isLongBreak)}
          onStartAnotherFocus={startAnotherFocus}
          onReturnToPlan={returnToPlan}
        />

        {/* Small Daily Focus Summary Card */}
        <div className="pt-2 flex items-center justify-center gap-4 text-xs text-neutral-400 bg-white/[0.015] border border-white/[0.06] px-4 py-2 rounded-2xl font-mono">
          <span>
            Today: <strong className="text-emerald-400 font-semibold">{Math.round((cycleState?.actualFocusedSeconds ?? 0) / 60)}m</strong> focused
          </span>
          <span className="text-white/20">•</span>
          <span>
            <strong className="text-white font-semibold">{cycleState?.completedBlocks ?? completedFocusCount}</strong> blocks done
          </span>
        </div>
      </div>

      {/* Soundscape Slide-Over Drawer */}
      <AnimatePresence>
        {isSoundscapeDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSoundscapeDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-sm h-full bg-[#0d0f17] border-l border-white/10 shadow-2xl p-5 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Headphones className="w-4 h-4 text-emerald-400" />
                    <span>Ambient Soundscapes</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSoundscapeDrawerOpen(false)}
                    className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <AmbientSoundWidget />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Distraction-Free Focus Mode Overlay */}
      <FocusModeOverlay
        isOpen={isFocusModeOpen}
        onClose={() => setIsFocusModeOpen(false)}
        remainingSeconds={remainingSeconds}
        totalSeconds={totalSeconds}
        elapsedSeconds={elapsedSeconds}
        mode={mode}
        isRunning={isRunning}
        isPaused={isPaused}
        taskName={taskName}
        blockTimeRange={blockTimeRange}
        currentSession={currentSession}
        totalSessions={settings.sessions}
        modeLabel={modeLabel}
        onStart={handleTogglePlayPause}
        onPause={handleTogglePlayPause}
        onResume={handleTogglePlayPause}
        onTerminate={handleRequestEndSession}
        onSkip={skipTimer}
        onFinishFocus={finishFocusStopwatch}
        onDiscardFocus={discardFocusStopwatch}
        onReset={handleRequestReset}
      />

      {/* Mid-Session Preset Switch Confirmation Modal */}
      {pendingSwitchPreset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
          <div className="bg-nocturn-card border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent-bright">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Switch to {pendingSwitchPreset.name}?</h3>
                <p className="text-xs text-nocturn-muted">A session is currently in progress</p>
              </div>
            </div>
            <p className="text-xs text-nocturn-dim leading-relaxed">
              {pendingSwitchPreset.type === 'stopwatch' || pendingSwitchPreset.isStopwatch ? (
                <>
                  Changing to <span className="text-white font-medium">{pendingSwitchPreset.name}</span> will switch to count-up stopwatch mode.
                </>
              ) : (
                <>
                  Changing to <span className="text-white font-medium">{pendingSwitchPreset.name}</span> will set your focus rhythm to{' '}
                  <span className="text-nocturn-accent-bright font-mono">
                    {pendingSwitchPreset.duration}m focus / {pendingSwitchPreset.breakDuration}m break
                  </span>.
                </>
              )}
            </p>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedPreset(pendingSwitchPreset.id)
                  try {
                    localStorage.setItem('nocturn_timer_preset', pendingSwitchPreset.id)
                  } catch {
                    // ignore
                  }
                  applyPreset(pendingSwitchPreset)
                  setPendingSwitchPreset(null)
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-nocturn-accent hover:bg-nocturn-accent-bright text-white text-xs font-semibold shadow-sm transition-colors text-center cursor-pointer"
              >
                Switch Now & Reset Session
              </button>
              <button
                type="button"
                onClick={() => {
                  queuePendingPreset(pendingSwitchPreset)
                  setPendingSwitchPreset(null)
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10 text-xs font-semibold transition-colors text-center cursor-pointer"
              >
                Apply After Current Session
              </button>
              <button
                type="button"
                onClick={() => setPendingSwitchPreset(null)}
                className="w-full py-2 px-4 rounded-xl text-nocturn-muted hover:text-white text-xs font-medium transition-colors text-center cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Session Confirmation Modal */}
      {showEndSessionConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
          <div className="bg-[#12141c] border border-rose-500/25 rounded-2xl p-5 sm:p-6 shadow-2xl max-w-sm w-full space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mx-auto">
              <Square className="w-5 h-5 fill-current" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-white">
                {mode === 'focus' ? 'End Focus Session?' : 'End Break Session?'}
              </h3>
              <p className="text-xs sm:text-sm text-nocturn-muted leading-relaxed">
                Your current session will end and won't count as a completed session.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowEndSessionConfirm(false)}
                className="py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-end-session-btn"
                onClick={handleConfirmEndSession}
                className="py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-md shadow-rose-950/50 transition-colors cursor-pointer"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Block Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
          <div className="bg-[#12141c] border border-amber-500/25 rounded-2xl p-5 sm:p-6 shadow-2xl max-w-sm w-full space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto">
              <RotateCcw className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-white">
                Reset Current Block?
              </h3>
              <p className="text-xs sm:text-sm text-nocturn-muted leading-relaxed">
                This will reset the current block's timer back to {Math.round(totalSeconds / 60)} min. Unsaved progress on this block will be cleared. Completed sessions and cycle statistics remain safe.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-reset-btn"
                onClick={async () => {
                  setShowResetConfirm(false)
                  await resetTimer()
                }}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-md shadow-amber-950/50 transition-colors cursor-pointer"
              >
                Reset Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Cycle Confirmation Modal */}
      {showResetCycleConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
          <div className="bg-[#12141c] border border-rose-500/25 rounded-2xl p-5 sm:p-6 shadow-2xl max-w-sm w-full space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mx-auto">
              <RotateCcw className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-white">
                Reset Current Cycle?
              </h3>
              <p className="text-xs sm:text-sm text-nocturn-muted leading-relaxed">
                This will reset your current cycle progress back to Block 1 of {cycleState?.totalBlocks || settings?.sessions || 4}. Your completed focus history and daily statistics will NOT be deleted.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetCycleConfirm(false)}
                className="py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-reset-cycle-btn"
                onClick={async () => {
                  setShowResetCycleConfirm(false)
                  if (resetCycle) await resetCycle()
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-md shadow-rose-950/50 transition-colors cursor-pointer"
              >
                Reset Cycle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Timer Settings Drawer */}
      <TimerSettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onClose={() => setIsSettingsDrawerOpen(false)}
        onRequestResetCycle={() => setShowResetCycleConfirm(true)}
      />
    </div>
  )
}
