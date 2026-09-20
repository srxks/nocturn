import { CheckCircle2 } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import FlowingLines from '../common/FlowingLines'

export default function EmptyTasks() {
  return (
    <div className="relative overflow-hidden bg-nocturn-card/60 border border-nocturn-border rounded-2xl my-4">
      <FlowingLines variant="corner" opacity={0.15} />
      <div className="relative z-10">
        <EmptyState
          icon={CheckCircle2}
          title="Nothing scheduled"
          description="Add something you want to accomplish today to get started."
        />
      </div>
    </div>
  )
}

