import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Minimize2, Play, Pause, Square, SkipForward, Clock, Zap } from 'lucide-react'
import FlowingLines from '../common/FlowingLines'
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

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-[#07070a] flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden"
      >
        {/* Distinctive flowing lines motif background */}
        <FlowingLines opacity={0.12} className="text-nocturn-accent" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-nocturn-accent/10 rounded-full blur-[140px] pointer-events-none" />

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
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
              {taskName?.trim() || 'Unassigned Focus'}
            </h1>

            {blockTimeRange && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-nocturn-muted">
                <Clock className="w-3.5 h-3.5 text-nocturn-accent" />
                <span>Plan My Day • {blockTimeRange}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="relative z-10 flex items-center justify-center gap-4 max-w-md mx-auto w-full pb-4">
          <button
            type="button"
            onClick={onTerminate}
            title="Terminate Session"
            className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-rose-500/15 text-nocturn-muted hover:text-rose-300 border border-white/[0.06] hover:border-rose-500/30 transition-all cursor-pointer"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>

          {isRunning ? (
            <button
              type="button"
              onClick={onPause}
              className="px-8 py-3.5 rounded-2xl bg-white text-black hover:bg-white/90 text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause Focus</span>
            </button>
          ) : isPaused ? (
            <button
              type="button"
              onClick={onResume}
              className="px-8 py-3.5 rounded-2xl bg-nocturn-accent text-white hover:bg-nocturn-accent-bright text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(var(--color-nocturn-accent-rgb),0.4)] active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume Focus</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStart}
              className="px-8 py-3.5 rounded-2xl bg-nocturn-accent text-white hover:bg-nocturn-accent-bright text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(var(--color-nocturn-accent-rgb),0.4)] active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Focus</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSkip}
            title="Skip Session"
            className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] text-nocturn-muted hover:text-white border border-white/[0.06] transition-all cursor-pointer"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
