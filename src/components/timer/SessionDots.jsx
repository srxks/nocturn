import { Check } from 'lucide-react'

export default function SessionDots({ currentSession, totalSessions = 4, isBreak }) {
  return (
    <div
      role="group"
      aria-label={`Pomodoro sessions progress: session ${currentSession} of ${totalSessions}`}
      className="flex items-center justify-center gap-3 my-2"
    >
      {Array.from({ length: totalSessions }).map((_, index) => {
        const sessionNumber = index + 1
        const isCompleted = sessionNumber < currentSession
        const isCurrent = sessionNumber === currentSession

        return (
          <div
            key={sessionNumber}
            aria-label={`Session ${sessionNumber}${isCompleted ? ' completed' : isCurrent ? ' current' : ' upcoming'}`}
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
              isCompleted
                ? 'bg-nocturn-accent text-white shadow-sm'
                : isCurrent
                  ? 'bg-white/[0.04] border-2 border-nocturn-accent/80 scale-105'
                  : 'bg-white/[0.03] border border-white/[0.08]'
            }`}
          >
            {isCompleted ? (
              <Check className="w-3 h-3 stroke-[3]" />
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
