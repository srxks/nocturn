import { CheckCircle2 } from 'lucide-react'

export default function EmptyTasks() {
  return (
    <div className="nocturn-card p-8 sm:p-10 text-center flex flex-col items-center justify-center space-y-3.5 my-6 border border-nocturn-border">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center shadow-[0_0_20px_rgba(var(--color-nocturn-accent-rgb),0.25)] text-nocturn-accent">
        <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.8]" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base sm:text-lg font-semibold text-white">No tasks yet</h3>
        <p className="text-xs sm:text-sm text-nocturn-muted max-w-xs mx-auto leading-relaxed">
          Stay focused and keep moving by adding your first task above.
        </p>
      </div>
    </div>
  )
}
