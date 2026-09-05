import { AlertTriangle, Clock } from 'lucide-react'

export default function MissedTasksBanner({ overdueTasks }) {
  if (!overdueTasks || overdueTasks.length === 0) return null

  return (
    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
          <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <span>Missed Tasks</span>
            <span className="text-[10px] bg-red-500/20 text-red-400 font-semibold px-2 py-0.5 rounded-full border border-red-500/40">
              {overdueTasks.length} {overdueTasks.length === 1 ? 'task' : 'tasks'} carried forward
            </span>
          </h3>
          <p className="text-nocturn-muted text-xs">
            Overdue tasks are prioritized at the top of your schedule. Original due dates remain unchanged.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 text-red-400 font-medium bg-red-500/10 px-2.5 py-1 rounded-xl border border-red-500/20">
        <Clock className="w-3.5 h-3.5" />
        <span>Priority Reschedule</span>
      </div>
    </div>
  )
}
