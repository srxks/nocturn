import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, SkipForward, Square, Check, Trash2, ArrowRight } from 'lucide-react'

export default function TimerControls({
  isRunning,
  isPaused = false,
  isCompleted = false,
  mode = 'focus',
  isLongBreak = false,
  onTogglePlayPause,
  onReset,
  onSkip,
  onTerminate,
  onFinishFocus,
  onDiscardFocus,
  onStartBreak,
  onStartAnotherFocus,
  onReturnToPlan,
}) {
  const isNormalStopwatch = mode === 'normal_stopwatch'
  const isFocusStopwatch = mode === 'focus_stopwatch'

  // ── NORMAL STOPWATCH CONTROLS ──
  if (isNormalStopwatch) {
    return (
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          {/* Reset Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={onReset}
            title="Reset stopwatch to zero"
            aria-label="Reset stopwatch"
            className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-white/20 text-nocturn-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 stroke-[2]" />
          </motion.button>

          {/* Main 64px Start / Pause / Resume Button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={onTogglePlayPause}
            aria-label={isRunning ? 'Pause stopwatch' : isPaused ? 'Resume stopwatch' : 'Start stopwatch'}
            className="w-16 h-16 rounded-full bg-nocturn-accent hover:bg-nocturn-accent-bright text-white flex items-center justify-center cursor-pointer transition-all shadow-[0_0_24px_rgba(var(--color-nocturn-accent-rgb),0.35)]"
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

          {/* Stop Button (Freezes stopwatch elapsed time) */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={onTerminate || onTogglePlayPause}
            disabled={!isRunning && !isPaused}
            title="Stop stopwatch"
            aria-label="Stop stopwatch"
            className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
              isRunning || isPaused
                ? 'bg-rose-500/10 border-rose-500/25 text-rose-300 hover:bg-rose-500/20'
                : 'bg-white/[0.02] border-white/[0.05] text-white/20 cursor-not-allowed'
            }`}
          >
            <Square className="w-4 h-4 fill-current" />
          </motion.button>
        </div>
      </div>
    )
  }

  // ── FOCUS STOPWATCH CONTROLS ──
  if (isFocusStopwatch) {
    return (
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          {/* Discard Session Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={onDiscardFocus || onReset}
            disabled={!isRunning && !isPaused}
            title="Discard current session without saving"
            aria-label="Discard focus session"
            className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
              isRunning || isPaused
                ? 'bg-rose-500/10 border-rose-500/25 text-rose-300 hover:bg-rose-500/20'
                : 'bg-white/[0.02] border-white/[0.05] text-white/20 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-4 h-4 stroke-[2]" />
          </motion.button>

          {/* Main 64px Start Focus / Pause / Resume Button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={onTogglePlayPause}
            aria-label={isRunning ? 'Pause focus session' : isPaused ? 'Resume focus session' : 'Start focus stopwatch'}
            className="w-16 h-16 rounded-full bg-nocturn-accent hover:bg-nocturn-accent-bright text-white flex items-center justify-center cursor-pointer transition-all shadow-[0_0_24px_rgba(var(--color-nocturn-accent-rgb),0.35)]"
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

          {/* Finish Focus Button (Saves focus session to stats) */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={onFinishFocus || onTerminate}
            disabled={!isRunning && !isPaused}
            title="Finish and log focus session"
            aria-label="Finish focus session"
            className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
              isRunning || isPaused
                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-white/[0.02] border-white/[0.05] text-white/20 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
          </motion.button>
        </div>

        {/* Prominent Finish Focus CTA when running or paused */}
        {(isRunning || isPaused) && (
          <motion.button
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onFinishFocus || onTerminate}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)]"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Finish Focus</span>
          </motion.button>
        )}
      </div>
    )
  }

  // ── COUNTDOWN / POMODORO CONTROLS ──
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
          aria-label={isRunning ? 'Pause timer' : isPaused ? 'Resume timer' : isCompleted ? (mode === 'focus' ? 'Start break' : 'Start focus') : 'Start timer'}
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

      {/* Explicit Next Phase Action Prompts when Session Completed at 0:00 (NO AUTO-CHAINING) */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-center gap-2 pt-1 max-w-sm"
        >
          {mode === 'focus' ? (
            <>
              <button
                type="button"
                onClick={onStartBreak || onTogglePlayPause}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 transition-all cursor-pointer shadow-sm"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{isLongBreak ? 'Start Long Break' : 'Start Short Break'}</span>
              </button>
              <button
                type="button"
                onClick={onStartAnotherFocus || onTogglePlayPause}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-nocturn-accent-bright bg-nocturn-accent/15 hover:bg-nocturn-accent/25 border border-nocturn-accent/35 transition-all cursor-pointer shadow-sm"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Start Another Focus</span>
              </button>
              {onReturnToPlan && (
                <button
                  type="button"
                  onClick={onReturnToPlan}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-nocturn-muted hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer"
                >
                  <span>Return to Plan</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onStartAnotherFocus || onTogglePlayPause}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-nocturn-accent-bright bg-nocturn-accent/15 hover:bg-nocturn-accent/25 border border-nocturn-accent/35 transition-all cursor-pointer shadow-sm"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Start Focus</span>
              </button>
              {onReturnToPlan && (
                <button
                  type="button"
                  onClick={onReturnToPlan}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-nocturn-muted hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer"
                >
                  <span>Return to Plan</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </motion.div>
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
