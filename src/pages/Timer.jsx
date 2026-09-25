import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Settings,
  Clock,
  Edit3,
  Target,
  Maximize2,
  Sparkles,
} from 'lucide-react'
import TimerRing from '../components/timer/TimerRing'
import TimerControls from '../components/timer/TimerControls'
import SessionDots from '../components/timer/SessionDots'
import FocusModeOverlay from '../components/timer/FocusModeOverlay'
import AmbientSoundWidget from '../components/timer/AmbientSoundWidget'
import { useTimerSettings } from '../context/useTimerSettings'
import { useTimerSession } from '../context/useTimerSession'
import { useTasks } from '../context/useTasks'

const TIMER_PRESETS = [
  { id: 'pomodoro', name: 'Pomodoro', duration: 25, breakDuration: 5 },
  { id: '52-17', name: '52 / 17', duration: 52, breakDuration: 17 },
  { id: 'ultradian', name: '90m Ultradian', duration: 90, breakDuration: 20 },
  { id: 'quick', name: '15m Sprint', duration: 15, breakDuration: 3 },
]

export default function Timer() {
  const { settings } = useTimerSettings()
  const { tasks } = useTasks()
  const location = useLocation()

  const {
    mode,
    isRunning,
    isPaused,
    remainingSeconds,
    totalSeconds,
    currentSession,
    taskName,
    setTaskName,
    togglePlayPause,
    resetTimer,
    skipTimer,
    terminateTimer,
    applyPreset,
    blockTimeRange,
  } = useTimerSession()

  const [isEditingTask, setIsEditingTask] = useState(false)
  const [taskInputVal, setTaskInputVal] = useState('')
  const [selectedPreset, setSelectedPreset] = useState(() => {
    return localStorage.getItem('nocturn_timer_preset') || 'pomodoro'
  })
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(() => Boolean(location.state?.focusMode))
  const [prevFocusModeProp, setPrevFocusModeProp] = useState(location.state?.focusMode)

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
  }, [location.state?.taskName, setTaskName, taskName])

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
    setIsEditingTask(false)
  }

  const handleSelectPreset = (preset) => {
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

  const modeLabel =
    mode === 'focus' ? 'FOCUS' : mode === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK'

  const isCompleted = remainingSeconds === 0 && !isRunning && !isPaused

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-3 sm:px-6 space-y-6">
      {/* Top Header with Timer Settings gear button & Zen mode */}
      <header className="relative w-full text-center flex items-center justify-between px-2 pb-4 border-b border-white/[0.06]">
        <button
          type="button"
          onClick={() => setIsFocusModeOpen(true)}
          title="Enter Fullscreen Zen Mode"
          aria-label="Enter Fullscreen Zen Mode"
          className="px-3 py-1.5 rounded-xl text-nocturn-muted hover:text-nocturn-accent hover:bg-white/[0.04] border border-white/[0.06] hover:border-nocturn-accent/30 transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Zen Mode</span>
        </button>
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold tracking-widest text-nocturn-accent uppercase">
            {modeLabel}
          </span>
          <p className="text-xs font-medium text-nocturn-muted">
            Session {currentSession} of {settings.sessions}
            {mode !== 'focus' && ` • Rest & Recharge`}
          </p>
        </div>
        <Link
          to="/timer-settings"
          aria-label="Timer settings"
          className="p-2 rounded-xl text-nocturn-muted hover:text-nocturn-accent hover:bg-nocturn-surface/80 border border-transparent hover:border-nocturn-border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent cursor-pointer"
        >
          <Settings className="w-5 h-5 stroke-[2]" />
        </Link>
      </header>

      {/* Main Timer Display */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* Left Main Column: Ring, Controls, Rhythm Presets */}
          <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-7 w-full max-w-md lg:max-w-none mx-auto">
            {/* Preset Rhythm Selector (only when timer is not running) */}
            {!isRunning && !isPaused && (
              <div className="flex items-center gap-1.5 p-1 bg-[#11131a]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-x-auto max-w-full no-scrollbar shadow-sm">
                {TIMER_PRESETS.map((preset) => {
                  const isSelected = selectedPreset === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`relative px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                        isSelected ? 'text-white font-semibold' : 'text-nocturn-muted hover:text-white'
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="timerPresetPill"
                          className="absolute inset-0 bg-nocturn-accent/15 border border-nocturn-accent/30 rounded-xl shadow-sm"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">{preset.name}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* SVG Circular Timer Ring with Digital Countdown */}
            <div className="py-1">
              <TimerRing
                remainingSeconds={remainingSeconds}
                totalSeconds={totalSeconds}
                modeLabel={modeLabel}
                isRunning={isRunning}
                isPaused={isPaused}
                isCompleted={isCompleted}
              />
            </div>

            {/* Prominent Task Name Section */}
            <div className="w-full max-w-sm text-center space-y-2">
              {isEditingTask ? (
                <div className="space-y-3 bg-nocturn-card border border-nocturn-border rounded-2xl p-3.5 shadow-lg text-left">
                  <form onSubmit={handleSaveTaskName} className="flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={taskInputVal}
                      onChange={(e) => setTaskInputVal(e.target.value)}
                      placeholder="Task or subject name..."
                      className="flex-1 bg-nocturn-surface border border-nocturn-accent text-white text-sm px-3.5 py-1.5 rounded-xl outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-nocturn-accent text-white text-xs font-semibold cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingTask(false)}
                      className="px-2.5 py-1.5 rounded-xl text-nocturn-muted hover:text-white text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </form>

                  {/* Quick Task Selection Chips */}
                  {activeTaskList.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-nocturn-border/60">
                      <span className="text-[11px] font-bold text-nocturn-muted uppercase tracking-wider block">
                        Choose from your tasks:
                      </span>
                      <div className="space-y-1 max-h-36 overflow-y-auto no-scrollbar">
                        {activeTaskList.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handlePickTask(t)}
                            className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-nocturn-muted hover:text-white hover:bg-white/[0.05] transition-colors text-left truncate cursor-pointer"
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
                <div className="space-y-1.5">
                  <div
                    onClick={handleStartEdit}
                    className="group cursor-pointer flex items-center justify-center gap-2"
                  >
                    <h2
                      className={`text-xl sm:text-2xl font-bold tracking-tight transition-colors ${
                        taskName.trim()
                          ? 'text-white group-hover:text-nocturn-accent'
                          : 'text-nocturn-muted/80 italic font-normal text-lg group-hover:text-white'
                      }`}
                    >
                      {taskName.trim() || 'Unassigned Focus'}
                    </h2>
                    <Edit3 className="w-3.5 h-3.5 text-nocturn-muted/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Plan My Day or Assigned Badge */}
                  {blockTimeRange ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-nocturn-muted">
                      <Clock className="w-3.5 h-3.5 text-nocturn-accent" />
                      <span>Plan My Day • {blockTimeRange}</span>
                    </div>
                  ) : (
                    !taskName.trim() && (
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        className="inline-flex items-center gap-1 text-[11px] text-nocturn-muted hover:text-nocturn-accent transition-colors cursor-pointer"
                      >
                        <Target className="w-3 h-3" />
                        <span>Click to assign a task</span>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Session Progress Dots */}
            <div className="w-full flex flex-col items-center space-y-1">
              <SessionDots
                currentSession={currentSession}
                totalSessions={settings.sessions}
                isBreak={mode !== 'focus'}
              />
              <span className="text-[11px] text-nocturn-dim font-medium">
                {mode === 'focus' ? `${settings.sessions} Focus blocks cycle` : 'Break in progress'}
              </span>
            </div>

            {/* Main Timer Controls */}
            <TimerControls
              isRunning={isRunning}
              isPaused={isPaused}
              isCompleted={isCompleted}
              mode={mode}
              onTogglePlayPause={handleTogglePlayPause}
              onReset={resetTimer}
              onSkip={skipTimer}
              onTerminate={terminateTimer}
            />

            {/* Ambient Soundscape Section on Mobile/Tablet */}
            <div className="pt-2 w-full flex justify-center lg:hidden">
              <AmbientSoundWidget />
            </div>
          </div>

          {/* Right Column: 360px Sticky Glass Panel on lg+ */}
          <div className="hidden lg:flex flex-col space-y-5 sticky top-6">
            {/* Ambient Sounds Widget */}
            <div className="p-5 rounded-3xl bg-[#11131a]/70 backdrop-blur-2xl border border-white/[0.08] shadow-2xl space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-nocturn-muted flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-nocturn-accent" />
                <span>Ambient Soundscapes</span>
              </h3>
              <AmbientSoundWidget />
            </div>

            {/* Current Active Task Card */}
            <div className="p-5 rounded-3xl bg-[#11131a]/70 backdrop-blur-2xl border border-white/[0.08] shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-nocturn-muted">
                  Focus Target
                </h3>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="text-[11px] font-semibold text-nocturn-accent hover:underline cursor-pointer"
                >
                  {taskName ? 'Edit' : 'Assign'}
                </button>
              </div>

              {taskName ? (
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                  <span className="text-sm font-bold text-white block truncate">{taskName}</span>
                  {blockTimeRange && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-nocturn-muted font-mono">
                      <Clock className="w-3 h-3 text-nocturn-accent" /> {blockTimeRange}
                    </span>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="w-full p-4 rounded-2xl border border-dashed border-white/10 hover:border-nocturn-accent/40 text-left transition-colors cursor-pointer group"
                >
                  <span className="text-xs font-medium text-nocturn-muted group-hover:text-white transition-colors block">
                    + Assign a task or subject
                  </span>
                </button>
              )}
            </div>

            {/* Daily Rhythm Progress */}
            <div className="p-5 rounded-3xl bg-[#11131a]/70 backdrop-blur-2xl border border-white/[0.08] shadow-2xl space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-nocturn-muted flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-nocturn-accent" />
                <span>Today's Progress</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-center">
                  <span className="text-xl font-bold font-mono text-white block">
                    {Math.max(0, currentSession - 1)} / {settings.sessions}
                  </span>
                  <span className="text-[10px] text-nocturn-muted uppercase tracking-wider font-semibold">
                    Blocks Done
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-center">
                  <span className="text-xl font-bold font-mono text-nocturn-accent block">
                    {Math.round((Math.max(0, currentSession - 1) * (totalSeconds || 1500)) / 60)}m
                  </span>
                  <span className="text-[10px] text-nocturn-muted uppercase tracking-wider font-semibold">
                    Focused
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Distraction-Free Focus Mode Overlay */}
      <FocusModeOverlay
        isOpen={isFocusModeOpen}
        onClose={() => setIsFocusModeOpen(false)}
        remainingSeconds={remainingSeconds}
        totalSeconds={totalSeconds}
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
        onTerminate={terminateTimer}
        onSkip={skipTimer}
      />
    </div>
  )
}
