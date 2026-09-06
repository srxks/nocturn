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
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
              isCompleted
                ? 'bg-nocturn-accent text-black shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb),0.4)]'
                : isCurrent
                  ? 'bg-nocturn-surface border-2 border-nocturn-accent shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.5)] scale-110'
                  : 'bg-nocturn-surface/50 border border-nocturn-border/80'
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
