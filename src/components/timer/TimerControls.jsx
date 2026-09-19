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
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/[0.04] border border-white/[0.08] hover:border-white/20 text-nocturn-muted hover:text-white flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent/60"
        >
          <RotateCcw className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Main Play / Pause Button */}
        <button
          type="button"
          onClick={onTogglePlayPause}
          aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-nocturn-accent text-white flex items-center justify-center transition-all duration-150 hover:bg-nocturn-accent-bright active:scale-95 cursor-pointer shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nocturn-accent/40"
        >
          {isRunning ? (
            <Pause className="w-7 h-7 fill-current stroke-current" />
          ) : (
            <Play className="w-7 h-7 fill-current stroke-current ml-0.5" />
          )}
        </button>

        {/* Skip / Next Button */}
        <button
          type="button"
          onClick={onSkip}
          title="Skip to next session"
          aria-label="Skip to next session"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/[0.04] border border-white/[0.08] hover:border-white/20 text-nocturn-muted hover:text-white flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent/60"
        >
          <SkipForward className="w-4 h-4 stroke-[2]" />
        </button>
      </div>

      {/* Dedicated End Session Action */}
      {(isRunning || isPaused) && onTerminate && (
        <button
          type="button"
          onClick={onTerminate}
          title="End session and save completed progress"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-all duration-150 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>End Session</span>
        </button>
      )}
    </div>
  )
}

