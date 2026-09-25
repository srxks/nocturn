import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, SkipForward, Clock } from 'lucide-react'
import { useTimerSession } from '../../context/useTimerSession'
import { useTasks } from '../../context/useTasks'
import {
  playTimerStartSound,
  playTimerPauseSound,
  playTimerResumeSound,
} from '../../services/soundService'

export default function PersistentMiniTimer() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isHovered, setIsHovered] = useState(false)

  // Track viewport width for responsive collision matrix
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  )

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  // Safely read selectedTask and selectedTaskIds from useTasks
  let selectedTask = null
  let selectedTaskIds = []
  try {
    const taskContext = useTasks()
    selectedTask = taskContext?.selectedTask || null
    selectedTaskIds = taskContext?.selectedTaskIds || []
  } catch {
    // Graceful fallback outside TaskProvider
  }

  const isTimerActive = isRunning || isPaused
  const isTimerPage = location.pathname.startsWith('/timer')
  const isTasksPage = location.pathname.startsWith('/tasks')

  // Collision state
  const isLg = viewportWidth >= 1024
  const isMd = viewportWidth >= 768 && viewportWidth < 1024
  const isSmOrXs = viewportWidth < 768

  const isDrawerOpen = Boolean(selectedTask)
  const isBulkActive = Boolean(selectedTaskIds && selectedTaskIds.length > 0 && isTasksPage)

  // RULE 4: On /timer route -> hidden
  if (!isTimerActive || isTimerPage) {
    return null
  }

  // RULE 1: On sm/xs, if bulk bar is active -> mini-timer hides (bulk bar takes priority)
  if (isSmOrXs && isBulkActive) {
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

  // Collision positioning calculations:
  // lg+: Fixed bottom 24px, right: if drawer open -> calc(420px + 24px) = 444px, else 24px
  // md: Fixed bottom 24px, right 16px, width: if bulk active -> 180px, else 220px, opacity: if drawer open -> 0.4
  // sm/xs: Fixed bottom calc(64px + env(safe-area-inset-bottom, 0px) + 12px), centered 100% - 24px wide, opacity: if drawer open -> 0.4
  let dynamicWidth
  let dynamicHeight
  let dynamicOpacity
  let dynamicStyle

  if (isLg) {
    dynamicWidth = isHovered ? 290 : 260
    dynamicHeight = 64
    dynamicOpacity = 1
    dynamicStyle = {
      bottom: '24px',
      right: isDrawerOpen ? '444px' : '24px',
      width: `${dynamicWidth}px`,
      height: `${dynamicHeight}px`,
    }
  } else if (isMd) {
    dynamicWidth = isBulkActive ? 180 : isHovered ? 240 : 220
    dynamicHeight = 56
    dynamicOpacity = isDrawerOpen ? 0.4 : 1
    dynamicStyle = {
      bottom: '24px',
      right: '16px',
      width: `${dynamicWidth}px`,
      height: `${dynamicHeight}px`,
    }
  } else {
    dynamicHeight = 56
    dynamicOpacity = isDrawerOpen ? 0.4 : 1
    dynamicStyle = {
      bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 12px)',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 24px)',
      height: `${dynamicHeight}px`,
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={{ y: 80, opacity: 0 }}
        animate={{
          y: 0,
          opacity: dynamicOpacity,
        }}
        exit={{ y: 80, opacity: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
        transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.8 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleOpenTimer}
        className="mini-timer fixed z-40 rounded-2xl border border-white/[0.08] hover:border-nocturn-accent/40 px-3.5 shadow-2xl flex items-center justify-between cursor-pointer group select-none transition-colors"
        style={{
          ...dynamicStyle,
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
