import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Minimize2, Play, Pause, Square, SkipForward, Zap } from 'lucide-react'
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

  const mins = Math.floor(remainingSeconds / 60)
  const secs = remainingSeconds % 60
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const progressRatio = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 1.04, filter: 'blur(12px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 1.04, filter: 'blur(12px)' }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-0 z-50 bg-[#050508] flex flex-col justify-between p-6 sm:p-12 select-none overflow-hidden ${
          !cursorVisible ? 'cursor-none' : ''
        }`}
      >
        {/* Top Edge Glowing Ambient Progress Line */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-white/[0.06] z-20">
          <motion.div
            className="h-full bg-nocturn-accent shadow-[0_0_16px_var(--accent)]"
            style={{ width: `${Math.min(100, Math.max(0, progressRatio * 100))}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* 2 Drifting Ambient Gradient Blobs (GPU transform only) */}
        <motion.div
          animate={{
            x: [-80, 80, -80],
            y: [-60, 60, -60],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-nocturn-accent/12 rounded-full blur-[180px] pointer-events-none"
        />
        <motion.div
          animate={{
            x: [60, -60, 60],
            y: [50, -50, 50],
          }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-1/4 right-1/3 translate-x-1/2 translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/8 rounded-full blur-[160px] pointer-events-none"
        />

        {/* Top Floating Controls Header */}
        <div
          className={`relative z-10 flex items-center justify-between max-w-5xl mx-auto w-full transition-opacity duration-500 ${
            cursorVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent">
              <Zap className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-nocturn-accent block">
                {modeLabel} ZEN MODE
              </span>
              <span className="text-xs text-nocturn-muted block">
                Cycle {currentSession} of {totalSessions}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AmbientSoundWidget compact />
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-white transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Minimize2 className="w-3.5 h-3.5 text-nocturn-muted" />
              <span>Exit (Esc)</span>
            </button>
          </div>
        </div>

        {/* Center: Ambient Zen Big Time Numerals & Muted Task */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center space-y-4 text-center max-w-4xl mx-auto w-full">
          {/* Muted uppercase letter-spaced task name */}
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-white/50 font-sans">
            {taskName?.trim() || 'Unassigned Focus'}
          </span>

          {/* Giant tabular numerals */}
          <div className="font-mono font-light text-7xl sm:text-9xl md:text-[140px] text-white tracking-tighter tabular-nums leading-none select-none drop-shadow-2xl">
            {formattedTime}
          </div>

          {/* Minimal status subtext */}
          <div className="flex items-center gap-2 pt-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-nocturn-accent animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-xs font-mono font-medium text-nocturn-muted tracking-wider uppercase">
              {isRunning ? `${modeLabel} IN PROGRESS` : isPaused ? 'PAUSED' : 'READY'}
              {blockTimeRange && ` • ${blockTimeRange}`}
            </span>
          </div>
        </div>

        {/* Bottom Floating Minimal Control Bar (Fades out after 3s idle) */}
        <div
          className={`relative z-10 flex items-center justify-center gap-4 max-w-md mx-auto w-full transition-opacity duration-500 ${
            cursorVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {isRunning ? (
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={onPause}
              aria-label="Pause"
              className="w-14 h-14 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white flex items-center justify-center transition-colors cursor-pointer border border-white/[0.1] shadow-2xl backdrop-blur-xl"
            >
              <Pause className="w-6 h-6 fill-current stroke-current" />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={isPaused ? onResume : onStart}
              aria-label="Start"
              className="w-14 h-14 rounded-full bg-nocturn-accent hover:bg-nocturn-accent-bright text-white flex items-center justify-center shadow-[0_0_24px_rgba(var(--color-nocturn-accent-rgb),0.4)] transition-colors cursor-pointer"
            >
              <Play className="w-6 h-6 fill-current stroke-current ml-0.5" />
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={onSkip}
            title="Skip to next session"
            aria-label="Skip session"
            className="w-11 h-11 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-nocturn-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/[0.08] backdrop-blur-xl"
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
              className="w-11 h-11 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 flex items-center justify-center transition-colors cursor-pointer backdrop-blur-xl"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </motion.button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
