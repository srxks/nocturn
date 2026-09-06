import { Play, Pause, RotateCcw, SkipForward, Square } from 'lucide-react'

export default function TimerControls({
  isRunning,
  isPaused = false,
  onTogglePlayPause,
  onReset,
  onSkip,
  onTerminate,
}) {
  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      <div className="flex items-center justify-center gap-3 sm:gap-5">
        {/* Reset Button */}
        <button
          type="button"
          onClick={onReset}
          title="Reset timer"
          aria-label="Reset current timer"
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-nocturn-surface border border-nocturn-border hover:border-nocturn-accent/40 text-nocturn-muted hover:text-white flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent"
        >
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
        </button>

        {/* Main Play / Pause Button */}
        <button
          type="button"
          onClick={onTogglePlayPause}
          aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          className="w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-nocturn-accent text-black flex items-center justify-center transition-all duration-200 hover:bg-nocturn-accent-bright active:scale-95 cursor-pointer shadow-[0_0_30px_rgba(var(--color-nocturn-accent-rgb),0.45)] hover:shadow-[0_0_40px_rgba(var(--color-nocturn-accent-rgb),0.65)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nocturn-accent/50"
        >
          {isRunning ? (
            <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-black stroke-black" />
          ) : (
            <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-black stroke-black ml-1" />
          )}
        </button>

        {/* Skip / Next Button */}
        <button
          type="button"
          onClick={onSkip}
          title="Skip to next session"
          aria-label="Skip to next session"
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-nocturn-surface border border-nocturn-border hover:border-nocturn-accent/40 text-nocturn-muted hover:text-white flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent"
        >
          <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
        </button>
      </div>

      {/* Dedicated End Session Action (Distinct from Reset) */}
      {(isRunning || isPaused) && onTerminate && (
        <button
          type="button"
          onClick={onTerminate}
          title="End session and save completed progress"
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>End Session</span>
        </button>
      )}
    </div>
  )
}
