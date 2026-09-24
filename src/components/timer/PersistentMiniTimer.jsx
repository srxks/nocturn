import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, SkipForward, Clock } from 'lucide-react'
import { useTimerSession } from '../../context/useTimerSession'
import {
  playTimerStartSound,
  playTimerPauseSound,
  playTimerResumeSound,
} from '../../services/soundService'

export default function PersistentMiniTimer() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isHovered, setIsHovered] = useState(false)

  const {
    isRunning,
    isPaused,
    remainingSeconds,
    totalSeconds,
    mode,
    taskName,
    togglePlayPause,
    skipSession,
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

  // 44px circular progress ring calculations
  const radius = 17
  const circumference = 2 * Math.PI * radius
  const progressRatio = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0
  const strokeDashoffset = circumference - progressRatio * circumference

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

  const handleSkip = (e) => {
    e.stopPropagation()
    if (typeof skipSession === 'function') {
      skipSession()
    }
  }

  const handleOpenTimer = () => {
    navigate('/timer')
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{
          y: 0,
          opacity: 1,
          scale: 1,
          width: isHovered ? 290 : 260,
        }}
        exit={{ y: 80, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleOpenTimer}
        className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 h-16 rounded-2xl border border-white/[0.08] hover:border-nocturn-accent/40 px-3.5 shadow-2xl flex items-center justify-between cursor-pointer group select-none transition-colors"
        style={{
          background: 'rgba(17, 19, 26, 0.72)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: 'var(--elev-2)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* 44px Circular SVG Progress Ring */}
          <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
            <svg className="w-11 h-11 -rotate-90 transform" viewBox="0 0 44 44">
              {/* Background Track */}
              <circle
                cx="22"
                cy="22"
                r={radius}
                className="text-white/[0.08]"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
              />
              {/* Animated Progress Track */}
              <motion.circle
                cx="22"
                cy="22"
                r={radius}
                className={mode === 'focus' ? 'text-nocturn-accent' : 'text-emerald-400'}
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </svg>
            <Clock
              className={`w-4 h-4 absolute ${
                mode === 'focus' ? 'text-nocturn-accent' : 'text-emerald-400'
              }`}
            />
          </div>

          {/* Time & Task Title */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-base font-semibold text-white tracking-tight">
                {formattedTime}
              </span>
              {isPaused && (
                <span className="text-[9px] font-sans font-bold text-amber-400 bg-amber-400/15 px-1 py-0.2 rounded border border-amber-400/20">
                  PAUSED
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium text-nocturn-muted truncate max-w-[120px] group-hover:text-white transition-colors">
              {taskName || (mode === 'focus' ? 'Focus Session' : 'Rest Break')}
            </span>
          </div>
        </div>

        {/* Action Controls: Play/Pause Icon Morph + Skip button on Hover */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          {/* Skip button visible on hover or if hovered */}
          <AnimatePresence>
            {isHovered && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                type="button"
                onClick={handleSkip}
                title="Skip session"
                className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-nocturn-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Morphing Play/Pause button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={handleToggle}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
              mode === 'focus'
                ? 'bg-nocturn-accent text-white hover:bg-nocturn-accent-bright'
                : 'bg-emerald-500 text-white hover:bg-emerald-400'
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isRunning ? (
                <motion.div
                  key="pause"
                  initial={{ rotate: -45, scale: 0.7, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 45, scale: 0.7, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Pause className="w-4 h-4 fill-current stroke-[2]" />
                </motion.div>
              ) : (
                <motion.div
                  key="play"
                  initial={{ rotate: -45, scale: 0.7, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 45, scale: 0.7, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Play className="w-4 h-4 fill-current stroke-[2] ml-0.5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
