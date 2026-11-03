import { Check, Square } from 'lucide-react'

export default function SessionDots({
  currentSession = 1,
  totalSessions = 4,
  isBreak = false,
  blockStatuses = {},
}) {
  return (
    <div
      role="group"
      aria-label={`Pomodoro sessions progress: session ${currentSession} of ${totalSessions}`}
      className="flex items-center justify-center gap-2.5 sm:gap-3 my-2"
    >
      {Array.from({ length: totalSessions }).map((_, index) => {
        const sessionNumber = index + 1
        const explicitStatus = blockStatuses[sessionNumber]
        const isCompleted = explicitStatus === 'completed'
        const isSkipped = explicitStatus === 'skipped'
        const isTerminated = explicitStatus === 'terminated'
        const isCurrent = sessionNumber === currentSession

        let dotStyle = 'bg-white/[0.03] border border-white/[0.08]'
        if (isCompleted) {
          dotStyle = 'bg-nocturn-accent text-white shadow-sm'
        } else if (isSkipped) {
          dotStyle = 'bg-white/[0.06] border border-white/[0.15] text-nocturn-muted'
        } else if (isTerminated) {
          dotStyle = 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
        } else if (isCurrent) {
          dotStyle = 'bg-white/[0.04] border-2 border-nocturn-accent/80 scale-105'
        }

        const labelStatus = isCompleted
          ? 'completed'
          : isSkipped
          ? 'skipped'
          : isTerminated
          ? 'terminated early'
          : isCurrent
          ? 'current'
          : 'upcoming'

        return (
          <div
            key={sessionNumber}
            aria-label={`Session ${sessionNumber}: ${labelStatus}`}
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${dotStyle}`}
          >
            {isCompleted ? (
              <Check className="w-3 h-3 stroke-[3]" />
            ) : isSkipped ? (
              <span className="text-[10px] font-bold text-nocturn-muted leading-none select-none" title="Skipped">
                —
              </span>
            ) : isTerminated ? (
              <Square className="w-1.5 h-1.5 fill-current" title="Terminated early" />
            ) : isCurrent ? (
              <div
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  isBreak ? 'bg-nocturn-accent-bright animate-pulse' : 'bg-nocturn-accent'
                }`}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

