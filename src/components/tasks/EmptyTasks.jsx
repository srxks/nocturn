import { CheckCircle2 } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import FlowingLines from '../common/FlowingLines'

export default function EmptyTasks({ onAddTask }) {
  return (
    <div className="relative overflow-hidden bg-nocturn-card/60 border border-nocturn-border rounded-2xl my-4">
      <FlowingLines variant="corner" opacity={0.15} />
      <div className="relative z-10">
        <EmptyState
          icon={CheckCircle2}
          title="Nothing scheduled"
          description="Add something you want to accomplish today to get started."
          action={
            onAddTask ? (
              <button
                type="button"
                onClick={onAddTask}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-nocturn-accent/15 hover:bg-nocturn-accent/25 text-nocturn-accent-bright border border-nocturn-accent/30 transition-all active:scale-95 shadow-[0_0_15px_rgba(var(--color-nocturn-accent-rgb),0.15)] cursor-pointer"
              >
                <span>+</span> Add Task
              </button>
            ) : null
          }
        />
      </div>
    </div>
  )
}

