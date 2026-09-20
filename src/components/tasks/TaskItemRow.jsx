import { Star, Calendar, Repeat, ListChecks, Sun, Trash2, Edit3 } from 'lucide-react'
import { getTaskDeadlineConfig } from '../../utils/deadlineUtils'
import { Checkbox } from '../ui/Checkbox'

export default function TaskItemRow({
  task,
  lists = [],
  onToggleComplete,
  onToggleStar,
  onSelectTask,
  onDeleteTask,
  isSelected = false,
}) {
  const deadlineConfig = getTaskDeadlineConfig(task)
  const listObj = lists.find((l) => l.id === task.listId)
  const subtasksTotal = task.subtasks ? task.subtasks.length : 0
  const subtasksDone = task.subtasks ? task.subtasks.filter((s) => s.completed).length : 0

  return (
    <div
      onClick={() => onSelectTask(task)}
      className={`group relative flex items-center justify-between gap-3 px-3.5 py-3 sm:px-4 sm:py-3.5 border rounded-xl transition-all duration-150 cursor-pointer select-none ${
        task.completed
          ? 'bg-nocturn-card/40 border-nocturn-border/50 opacity-60'
          : isSelected
          ? 'bg-nocturn-card border-nocturn-accent/60 shadow-sm ring-1 ring-nocturn-accent/30'
          : 'bg-nocturn-card border-nocturn-border hover:border-white/15 hover:bg-nocturn-surface/70 shadow-sm'
      }`}
    >
      {/* Left Deadline Accent Pill Indicator */}
      {!task.completed && deadlineConfig.status !== 'none' && (
        <div
          className={`absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full ${deadlineConfig.indicatorBg}`}
          title={`Deadline: ${deadlineConfig.label}`}
        />
      )}

      <div className="flex items-center gap-3 min-w-0 flex-1 pl-0.5">
        {/* Checkbox with smooth draw animation */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center">
          <Checkbox
            checked={Boolean(task.completed)}
            onChange={() => onToggleComplete(task.id)}
            aria-label={task.completed ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
          />
        </div>

        {/* Title & Metadata */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {!task.completed && deadlineConfig.status !== 'none' && (
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${deadlineConfig.dotClass}`} />
            )}
            <span
              className={`text-sm sm:text-[15px] font-medium break-words block transition-all duration-150 ${
                task.completed
                  ? 'line-through text-nocturn-dim font-normal'
                  : 'text-white'
              }`}
            >
              {task.title}
            </span>
          </div>

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] font-medium text-nocturn-muted">
            {/* List Name Pill */}
            {listObj && listObj.id !== 'tasks' && (
              <span className="text-[10px] bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06] text-nocturn-muted">
                {listObj.name}
              </span>
            )}

            {/* My Day Badge */}
            {task.inMyDay && (
              <span className="inline-flex items-center gap-1 text-[10px] text-nocturn-accent-bright bg-nocturn-accent/10 px-1.5 py-0.5 rounded-md border border-nocturn-accent/20">
                <Sun className="w-3 h-3 stroke-[2]" />
                My Day
              </span>
            )}

            {/* Due Date & Deadline Status Badges */}
            {task.dueDate ? (
              <span
                className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${
                  task.completed
                    ? 'bg-white/[0.03] border-white/[0.06] text-nocturn-muted'
                    : deadlineConfig.status === 'overdue'
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : deadlineConfig.status === 'today'
                    ? 'bg-nocturn-accent/15 text-nocturn-accent-bright border-nocturn-accent/30'
                    : deadlineConfig.badgeClass
                }`}
              >
                <Calendar className="w-3 h-3 stroke-[2]" />
                {deadlineConfig.status === 'overdue'
                  ? 'OVERDUE'
                  : deadlineConfig.status === 'today'
                  ? 'DUE TODAY'
                  : deadlineConfig.formattedLabel}
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md border font-medium bg-white/[0.02] border-white/[0.05] text-nocturn-muted/60">
                NO DEADLINE
              </span>
            )}

            {/* Recurrence Badge */}
            {task.recurrence && task.recurrence !== 'none' && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-white/[0.04] px-1.5 py-0.5 rounded-md border border-white/[0.06] text-nocturn-muted capitalize">
                <Repeat className="w-3 h-3 stroke-[2]" />
                {task.recurrence}
              </span>
            )}

            {/* Priority Badge */}
            {task.priority && task.priority !== 'none' && (
              <span
                className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md border font-medium capitalize ${
                  task.priority === 'high'
                    ? 'text-rose-300 bg-rose-500/10 border-rose-500/25'
                    : task.priority === 'low'
                    ? 'text-sky-300 bg-sky-500/10 border-sky-500/25'
                    : 'text-amber-300 bg-amber-500/10 border-amber-500/25'
                }`}
              >
                {task.priority === 'high'
                  ? 'High'
                  : task.priority === 'low'
                  ? 'Low'
                  : 'Medium'}
              </span>
            )}

            {/* Subtasks Count */}
            {subtasksTotal > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-white/[0.04] px-1.5 py-0.5 rounded-md border border-white/[0.06] text-nocturn-muted font-mono">
                <ListChecks className="w-3 h-3 stroke-[2]" />
                {subtasksDone > 0 ? `${subtasksDone}/${subtasksTotal}` : `${subtasksTotal}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contextual Action Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Direct Edit Button */}
        <button
          type="button"
          aria-label={`Edit task "${task.title}"`}
          onClick={(e) => {
            e.stopPropagation()
            onSelectTask(task)
          }}
          className="p-1.5 rounded-lg text-nocturn-muted hover:text-white hover:bg-white/[0.08] transition-all opacity-70 sm:opacity-0 group-hover:opacity-100 cursor-pointer"
          title="Edit task details"
        >
          <Edit3 className="w-4 h-4" />
        </button>

        {/* Star Button */}
        <button
          type="button"
          aria-label={task.starred ? `Unstar task` : `Star task`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleStar(task.id)
          }}
          className="p-1.5 rounded-lg text-nocturn-muted hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
        >
          <Star
            className={`w-4.5 h-4.5 stroke-[2] transition-colors duration-150 ${
              task.starred
                ? 'fill-amber-400 text-amber-400'
                : 'text-nocturn-dim hover:text-nocturn-muted'
            }`}
          />
        </button>

        {/* Direct Delete Button - ALWAYS Accessible */}
        {onDeleteTask && (
          <button
            type="button"
            aria-label={`Delete task "${task.title}"`}
            onClick={(e) => {
              e.stopPropagation()
              onDeleteTask(task.id)
            }}
            className="p-1.5 rounded-lg text-nocturn-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-70 sm:opacity-0 group-hover:opacity-100 cursor-pointer"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

