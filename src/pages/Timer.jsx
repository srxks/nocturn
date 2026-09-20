import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Settings, Clock, Edit3, CheckCircle2, Target, Maximize2 } from 'lucide-react'
import TimerRing from '../components/timer/TimerRing'
import TimerControls from '../components/timer/TimerControls'
import SessionDots from '../components/timer/SessionDots'
import FocusModeOverlay from '../components/timer/FocusModeOverlay'
import { useTimerSettings } from '../context/useTimerSettings'
import { useTimerSession } from '../context/useTimerSession'
import {
  playTimerStartSound,
  playTimerPauseSound,
  playTimerResumeSound,
} from '../services/soundService'

export default function Timer() {
  const { settings } = useTimerSettings()
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
    blockTimeRange,
  } = useTimerSession()

  const [isEditingTask, setIsEditingTask] = useState(false)
  const [taskInputVal, setTaskInputVal] = useState('')
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(() => Boolean(location.state?.focusMode))
  const [prevFocusModeProp, setPrevFocusModeProp] = useState(location.state?.focusMode)

  if (location.state?.focusMode !== prevFocusModeProp) {
    setPrevFocusModeProp(location.state?.focusMode)
    if (location.state?.focusMode) {
      setIsFocusModeOpen(true)
    }
  }

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

  const handleTogglePlayPause = () => {
    if (!isRunning && !isPaused) {
      playTimerStartSound()
    } else if (isRunning) {
      playTimerPauseSound()
    } else {
      playTimerResumeSound()
    }
    togglePlayPause()
  }

  const modeLabel =
    mode === 'focus' ? 'FOCUS' : mode === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK'

  const isCompleted = remainingSeconds === 0 && !isRunning && !isPaused

  return (
    <div className="w-full max-w-md lg:max-w-xl mx-auto flex flex-col items-center justify-center space-y-6 sm:space-y-7 py-4">
      {/* Top Header with Timer Settings gear button */}
      <header className="relative w-full text-center flex items-center justify-between px-2">
        <button
          type="button"
          onClick={() => setIsFocusModeOpen(true)}
          title="Enter Fullscreen Focus Mode"
          aria-label="Enter Fullscreen Focus Mode"
          className="p-2 rounded-xl text-nocturn-muted hover:text-nocturn-accent hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
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

      {/* When completed: large tasteful completion state */}
      {isCompleted ? (
        <div className="w-full p-8 rounded-3xl bg-nocturn-card border border-nocturn-border flex flex-col items-center justify-center text-center space-y-3 shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-1">
            <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold tracking-widest uppercase text-emerald-400">
            Session Ended
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {taskName.trim() || 'Focus Session'}
          </h2>
          <p className="text-sm text-nocturn-muted">
            {Math.round(totalSeconds / 60)} minutes focused
          </p>
        </div>
      ) : (
        <>
          {/* SVG Circular Timer Ring with Digital Countdown */}
          <div className="py-1">
            <TimerRing
              remainingSeconds={remainingSeconds}
              totalSeconds={totalSeconds}
              modeLabel={modeLabel}
              isRunning={isRunning}
              isPaused={isPaused}
              isCompleted={mode === 'completed' || remainingSeconds === 0}
            />
          </div>

          {/* Prominent Task Name Section */}
          <div className="w-full max-w-sm text-center space-y-2">
            {isEditingTask ? (
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
            onTogglePlayPause={handleTogglePlayPause}
            onReset={resetTimer}
            onSkip={skipTimer}
            onTerminate={terminateTimer}
          />
        </>
      )}

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
