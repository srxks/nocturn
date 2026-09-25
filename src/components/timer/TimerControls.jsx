import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, SkipForward, Square } from 'lucide-react'

export default function TimerControls({
  isRunning,
  isPaused = false,
  isCompleted = false,
  mode = 'focus',
  onTogglePlayPause,
  onReset,
  onSkip,
  onTerminate,
}) {
  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        {/* Reset Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={onReset}
          title="Reset timer"
          aria-label="Reset current timer"
          className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-white/20 text-nocturn-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 stroke-[2]" />
        </motion.button>

        {/* Main 64px Play / Pause Button with Icon Morphing */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          type="button"
          onClick={onTogglePlayPause}
          aria-label={isRunning ? 'Pause timer' : isCompleted ? (mode === 'focus' ? 'Start break' : 'Start focus') : 'Start timer'}
          className={`w-16 h-16 rounded-full bg-nocturn-accent hover:bg-nocturn-accent-bright text-white flex items-center justify-center cursor-pointer transition-all ${
            isCompleted
              ? 'shadow-[0_0_30px_rgba(var(--color-nocturn-accent-rgb),0.55)] ring-2 ring-nocturn-accent ring-offset-2 ring-offset-[#07070a]'
              : 'shadow-[0_0_24px_rgba(var(--color-nocturn-accent-rgb),0.35)]'
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
                <Pause className="w-7 h-7 fill-current stroke-current" />
              </motion.div>
            ) : (
              <motion.div
                key="play"
                initial={{ rotate: -45, scale: 0.7, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 45, scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Play className="w-7 h-7 fill-current stroke-current ml-0.5" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Skip / Next Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={onSkip}
          title="Skip to next session"
          aria-label="Skip to next session"
          className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-white/20 text-nocturn-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <SkipForward className="w-4 h-4 stroke-[2]" />
        </motion.button>
      </div>

      {/* Explicit Next Phase Action Prompt when Session Completed */}
      {isCompleted && (
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={onTogglePlayPause}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-nocturn-accent-bright bg-nocturn-accent/15 hover:bg-nocturn-accent/25 border border-nocturn-accent/35 transition-all cursor-pointer shadow-[0_0_14px_rgba(var(--color-nocturn-accent-rgb),0.2)]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{mode === 'focus' ? 'Start Break' : 'Start Focus'}</span>
        </motion.button>
      )}

      {/* Dedicated End Session Action */}
      {(isRunning || isPaused) && onTerminate && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={onTerminate}
          title="End session and save completed progress"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-all cursor-pointer"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>End Session</span>
        </motion.button>
      )}
    </div>
  )
}
