import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Settings } from 'lucide-react'
import TimerRing from '../components/timer/TimerRing'
import TimerControls from '../components/timer/TimerControls'
import SessionDots from '../components/timer/SessionDots'
import TaskInput from '../components/timer/TaskInput'
import { useTimerSettings } from '../context/useTimerSettings'
import { useTimerSession } from '../context/useTimerSession'

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
  } = useTimerSession()

  // Sync taskName when location state passes a new taskName from Tasks or Plan My Day
  useEffect(() => {
    if (location.state?.taskName && location.state.taskName !== taskName) {
      setTaskName(location.state.taskName)
    }
  }, [location.state?.taskName, setTaskName, taskName])

  const modeLabel =
    mode === 'focus' ? 'Focus' : mode === 'shortBreak' ? 'Short Break' : 'Long Break'

  return (
    <div className="w-full max-w-md lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col items-center justify-center space-y-6 sm:space-y-8 py-2">
      {/* Top Header with Timer Settings gear button */}
      <header className="relative w-full text-center space-y-1">
        <div className="flex items-center justify-center relative">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {modeLabel}
          </h1>
          <Link
            to="/timer-settings"
            aria-label="Timer settings"
            className="absolute right-0 p-2 rounded-xl text-nocturn-muted hover:text-nocturn-accent hover:bg-nocturn-surface/80 border border-transparent hover:border-nocturn-border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent cursor-pointer"
          >
            <Settings className="w-5 h-5 stroke-[2]" />
          </Link>
        </div>
        <p className="text-xs sm:text-sm font-medium text-nocturn-muted">
          Session {currentSession} of {settings.sessions}
          {mode !== 'focus' && ` • Rest & Recharge`}
        </p>
      </header>

      {/* Active Task Input */}
      <TaskInput taskName={taskName} setTaskName={setTaskName} />

      {/* SVG Circular Timer Ring */}
      <div className="py-2">
        <TimerRing
          remainingSeconds={remainingSeconds}
          totalSeconds={totalSeconds}
          modeLabel={modeLabel}
          isRunning={isRunning}
        />
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
        onTogglePlayPause={togglePlayPause}
        onReset={resetTimer}
        onSkip={skipTimer}
        onTerminate={terminateTimer}
      />
    </div>
  )
}
