import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Minimize2, Play, Pause, Square, SkipForward, Zap } from 'lucide-react'
import TimerRing from './TimerRing'
import AmbientSoundWidget from './AmbientSoundWidget'

export default function FocusModeOverlay({
  isOpen,
  onClose,
  remainingSeconds,
  totalSeconds,
  isRunning,
  isPaused,
  taskName,
  blockTimeRange,
  currentSession,
  totalSessions,
  modeLabel,
  onStart,
  onPause,
  onResume,
  onTerminate,
  onSkip,
}) {
  const [cursorVisible, setCursorVisible] = useState(true)

  // ESC key handler to exit focus mode
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Cursor auto-hides after 3 seconds of inactivity
  useEffect(() => {
    if (!isOpen) return
    let timer = setTimeout(() => setCursorVisible(false), 3000)
    const handleMouseMove = () => {
      setCursorVisible(true)
      clearTimeout(timer)
      timer = setTimeout(() => setCursorVisible(false), 3000)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 1.04, filter: 'blur(12px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 1.04, filter: 'blur(12px)' }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-0 z-50 bg-[#07070a] flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden ${
          !cursorVisible ? 'cursor-none' : ''
        }`}
      >
        {/* Animated drifting ambient gradient blob (20s loop) */}
        <motion.div
          animate={{
            x: [-60, 60, -60],
            y: [-40, 40, -40],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-nocturn-accent/10 rounded-full blur-[160px] pointer-events-none"
        />

        {/* Top Header: Session Info + Exit Focus Mode button */}
        <div className="relative z-10 flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent">
              <Zap className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-nocturn-accent block">
                {modeLabel} MODE
              </span>
              <span className="text-xs text-nocturn-muted block">
                Cycle {currentSession} of {totalSessions}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <AmbientSoundWidget compact />
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-white transition-all cursor-pointer shadow-sm"
            >
              <Minimize2 className="w-3.5 h-3.5 text-nocturn-muted" />
              <span>Exit (Esc)</span>
            </button>
          </div>
        </div>

        {/* Center: Large Timer & Emphasized Task */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center space-y-6 text-center max-w-xl mx-auto w-full">
          {/* Timer Ring */}
          <div className="scale-110 sm:scale-125 transition-transform duration-300">
            <TimerRing
              remainingSeconds={remainingSeconds}
              totalSeconds={totalSeconds}
              modeLabel={modeLabel}
              isRunning={isRunning}
              isPaused={isPaused}
              isCompleted={remainingSeconds === 0}
            />
          </div>

          {/* Task Info */}
          <div className="space-y-2 pt-4">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-display">
              {taskName?.trim() || 'Unassigned Focus'}
            </h1>
            {blockTimeRange && (
              <span className="inline-block text-xs font-mono font-medium text-nocturn-muted bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.08]">
                {blockTimeRange}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Minimal Controls Row */}
        <div className="relative z-10 flex items-center justify-center gap-4 max-w-md mx-auto w-full">
          {isRunning ? (
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={onPause}
              aria-label="Pause"
              className="w-14 h-14 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white flex items-center justify-center transition-colors cursor-pointer border border-white/[0.1]"
            >
              <Pause className="w-6 h-6 fill-current stroke-current" />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={isPaused ? onResume : onStart}
              aria-label="Start"
              className="w-14 h-14 rounded-full bg-nocturn-accent hover:bg-nocturn-accent-bright text-white flex items-center justify-center shadow-[0_0_20px_rgba(var(--color-nocturn-accent-rgb),0.35)] transition-colors cursor-pointer"
            >
              <Play className="w-6 h-6 fill-current stroke-current ml-0.5" />
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={onSkip}
            title="Skip to next"
            aria-label="Skip session"
            className="w-11 h-11 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-nocturn-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/[0.08]"
          >
            <SkipForward className="w-4 h-4 stroke-[2]" />
          </motion.button>

          {(isRunning || isPaused) && onTerminate && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={onTerminate}
              title="End session"
              aria-label="End session"
              className="w-11 h-11 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </motion.button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
