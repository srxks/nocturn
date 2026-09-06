import { Sparkles, Loader2, RefreshCw, Wand2 } from 'lucide-react'

export default function PlanButton({
  onClick,
  onSmartReschedule,
  isGenerating,
  disabled,
  hasPlanned = false,
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
      {hasPlanned && onSmartReschedule && (
        <button
          type="button"
          onClick={onSmartReschedule}
          disabled={disabled || isGenerating}
          className="w-full sm:w-auto nocturn-btn-secondary py-2.5 px-4 text-xs sm:text-sm font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200"
        >
          <Wand2 className="w-4 h-4 text-nocturn-accent" />
          <span>Smart Reschedule</span>
        </button>
      )}

      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isGenerating}
        className="w-full sm:w-auto nocturn-btn-primary py-2.5 px-5 sm:px-6 text-xs sm:text-sm font-semibold shadow-[0_0_24px_rgba(var(--color-nocturn-accent-rgb),0.35)] hover:shadow-[0_0_32px_rgba(var(--color-nocturn-accent-rgb),0.5)] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-black" />
            <span>Planning your day...</span>
          </>
        ) : hasPlanned ? (
          <>
            <RefreshCw className="w-4 h-4 stroke-[2.2] text-black" />
            <span>Regenerate</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 stroke-[2.2] text-black" />
            <span>Plan My Day</span>
          </>
        )}
      </button>
    </div>
  )
}
