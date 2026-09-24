import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Maximize2, Clock } from 'lucide-react'
import { useTimerSession } from '../../context/useTimerSession'
import {
  playTimerStartSound,
  playTimerPauseSound,
  playTimerResumeSound,
} from '../../services/soundService'

export default function PersistentMiniTimer() {
  const navigate = useNavigate()
  const location = useLocation()

  const {
    isRunning,
    isPaused,
    remainingSeconds,
    totalSeconds,
    mode,
    taskName,
    togglePlayPause,
  } = useTimerSession()

  // Only show when timer is active and user is outside of /timer
  const isTimerActive = isRunning || isPaused
  const isTimerPage = location.pathname === '/timer'

  if (!isTimerActive || isTimerPage) {
    return null
  }

  const mins = Math.floor(remainingSeconds / 60)
  const secs = remainingSeconds % 60
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0

  const handleToggle = (e) => {
    e.stopPropagation()
    if (!isRunning && !isPaused) {
      playTimerStartSound()
    } else if (isRunning) {
      playTimerPauseSound()
    } else {
      playTimerResumeSound()
    }
    togglePlayPause()
  }

  const handleOpenTimer = () => {
    navigate('/timer')
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={handleOpenTimer}
        className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 bg-[#12141c]/95 backdrop-blur-xl border border-white/15 hover:border-nocturn-accent/50 rounded-2xl p-2.5 sm:p-3 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex items-center gap-3 cursor-pointer group select-none transition-all duration-200"
      >
        {/* Circular mini progress indicator */}
        <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
          <svg className="w-8 h-8 -rotate-90 transform" viewBox="0 0 36 36">
            <path
              className="text-white/10"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={mode === 'focus' ? 'text-nocturn-accent' : 'text-emerald-400'}
              strokeDasharray={`${progressPercent}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <Clock className={`w-3.5 h-3.5 absolute ${mode === 'focus' ? 'text-nocturn-accent' : 'text-emerald-400'}`} />
        </div>

        {/* Task name and digital time */}
        <div className="flex flex-col min-w-0 max-w-[130px] sm:max-w-[180px]">
          <span className="text-[11px] font-medium text-nocturn-muted truncate group-hover:text-white transition-colors">
            {taskName || (mode === 'focus' ? 'Focus Session' : 'Rest Break')}
          </span>
          <span className="text-sm font-bold text-white font-mono tracking-tight flex items-center gap-1.5">
            <span>{formattedTime}</span>
            {isPaused && (
              <span className="text-[10px] font-sans font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded">
                PAUSED
              </span>
            )}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-white/10">
          <button
            type="button"
            onClick={handleToggle}
            aria-label={isRunning ? 'Pause timer' : 'Resume timer'}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white transition-colors cursor-pointer"
          >
            {isRunning ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
          </button>
          <button
            type="button"
            onClick={handleOpenTimer}
            aria-label="Maximize timer view"
            className="p-1.5 rounded-xl hover:bg-white/10 text-nocturn-muted hover:text-white transition-colors cursor-pointer hidden sm:inline-flex"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
