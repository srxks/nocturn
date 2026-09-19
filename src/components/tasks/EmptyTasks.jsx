import { CheckCircle2 } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'

export default function EmptyTasks() {
  return (
    <div className="bg-nocturn-card/60 border border-nocturn-border rounded-2xl my-4">
      <EmptyState
        icon={CheckCircle2}
        title="Nothing scheduled"
        description="Add something you want to accomplish today to get started."
      />
    </div>
  )
}

