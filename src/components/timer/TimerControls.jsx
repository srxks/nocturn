import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react'

export default function TimerControls({
  isRunning,
  onTogglePlayPause,
  onReset,
  onSkip,
}) {
  return (
    <div className="flex items-center justify-center gap-6 pt-2">
      {/* Reset Button */}
      <button
        type="button"
        onClick={onReset}
        aria-label="Reset current timer"
        className="w-12 h-12 rounded-full bg-nocturn-surface border border-nocturn-border hover:border-nocturn-accent/40 text-nocturn-muted hover:text-white flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent"
      >
        <RotateCcw className="w-5 h-5 stroke-[2]" />
      </button>

      {/* Main Play / Pause Button */}
      <button
        type="button"
        onClick={onTogglePlayPause}
        aria-label={isRunning ? 'Pause timer' : 'Start timer'}
        className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-nocturn-accent text-black flex items-center justify-center transition-all duration-200 hover:bg-nocturn-accent-bright active:scale-95 cursor-pointer shadow-[0_0_30px_rgba(0,230,118,0.45)] hover:shadow-[0_0_40px_rgba(0,230,118,0.65)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nocturn-accent/50"
      >
        {isRunning ? (
          <Pause className="w-9 h-9 sm:w-10 sm:h-10 fill-black stroke-black" />
        ) : (
          <Play className="w-9 h-9 sm:w-10 sm:h-10 fill-black stroke-black ml-1" />
        )}
      </button>

      {/* Skip Button */}
      <button
        type="button"
        onClick={onSkip}
        aria-label="Skip to next session"
        className="w-12 h-12 rounded-full bg-nocturn-surface border border-nocturn-border hover:border-nocturn-accent/40 text-nocturn-muted hover:text-white flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent"
      >
        <SkipForward className="w-5 h-5 stroke-[2]" />
      </button>
    </div>
  )
}
