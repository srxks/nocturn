import { Check, Star, Calendar, Repeat, ListChecks, Sun } from 'lucide-react'
import { getTaskDeadlineConfig } from '../../utils/deadlineUtils'
import { useTheme } from '../../context/useTheme'

export default function TaskItemRow({
  task,
  lists = [],
  onToggleComplete,
  onToggleStar,
  onSelectTask,
  isSelected = false,
}) {
  const { uiStyle } = useTheme()
  const isAngular = uiStyle === 'angular'
  const deadlineConfig = getTaskDeadlineConfig(task)
  const listObj = lists.find((l) => l.id === task.listId)
  const subtasksTotal = task.subtasks ? task.subtasks.length : 0
  const subtasksDone = task.subtasks ? task.subtasks.filter((s) => s.completed).length : 0

  return (
    <div
      onClick={() => onSelectTask(task)}
      className={`group relative flex items-center justify-between gap-3 p-3.5 sm:p-4 border transition-all duration-200 cursor-pointer select-none ${
        isAngular ? 'rounded-none angular-chamfer-sm' : 'rounded-2xl'
      } ${
        task.completed
          ? 'bg-nocturn-card/40 border-nocturn-border/50 opacity-75'
          : isSelected
          ? 'bg-nocturn-card border-nocturn-accent/60 shadow-[0_0_16px_rgba(var(--color-nocturn-accent-rgb),0.2)] ring-1 ring-nocturn-accent/40'
          : 'bg-nocturn-card border-nocturn-border hover:border-nocturn-accent/35 shadow-md shadow-black/40'
      }`}
    >
      {/* Left Deadline Accent Pill Indicator for uncompleted tasks with due date */}
      {!task.completed && deadlineConfig.status !== 'none' && (
        <div
          className={`absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r-full ${deadlineConfig.indicatorBg}`}
          title={`Deadline: ${deadlineConfig.label}`}
        />
      )}

      <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
        {/* Checkbox */}
        <button
          type="button"
          role="checkbox"
          aria-checked={task.completed}
          aria-label={task.completed ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleComplete(task.id)
          }}
          className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent ${
            task.completed
              ? 'bg-nocturn-accent border-nocturn-accent text-black shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb),0.5)]'
              : `border-nocturn-muted/40 ${deadlineConfig.checkboxHoverBorder} bg-nocturn-surface/50 text-transparent`
          }`}
        >
          <Check className={`w-3.5 h-3.5 stroke-[3] transition-transform duration-150 ${task.completed ? 'scale-100' : 'scale-0'}`} />
        </button>

        {/* Title & Metadata */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {/* Small status dot if task has deadline */}
            {!task.completed && deadlineConfig.status !== 'none' && (
              <span className={`w-2 h-2 rounded-full shrink-0 ${deadlineConfig.dotClass}`} />
            )}
            <span
              className={`text-sm sm:text-base font-medium break-words block transition-all duration-200 ${
                task.completed
                  ? 'line-through text-nocturn-dim font-normal'
                  : 'text-white'
              }`}
            >
              {task.title}
            </span>
          </div>

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-nocturn-muted">
            {/* List Name Pill */}
            {listObj && listObj.id !== 'tasks' && (
              <span className="text-[10px] bg-nocturn-surface px-2 py-0.5 rounded-md border border-nocturn-border text-nocturn-muted">
                {listObj.name}
              </span>
            )}

            {/* My Day Badge */}
            {task.inMyDay && (
              <span className="inline-flex items-center gap-1 text-[10px] text-nocturn-accent bg-nocturn-accent/10 px-1.5 py-0.5 rounded-md border border-nocturn-accent/20">
                <Sun className="w-3 h-3 stroke-[2]" />
                My Day
              </span>
            )}

            {/* Due Date Badge with Deadline Color Coding */}
            {task.dueDate && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${
                  task.completed
                    ? 'bg-nocturn-surface border-nocturn-border text-nocturn-muted'
                    : deadlineConfig.badgeClass
                }`}
              >
                <Calendar className="w-3 h-3 stroke-[2]" />
                {deadlineConfig.formattedLabel}
              </span>
            )}

            {/* Recurrence Badge */}
            {task.recurrence && task.recurrence !== 'none' && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-nocturn-surface px-1.5 py-0.5 rounded-md border border-nocturn-border text-nocturn-muted capitalize">
                <Repeat className="w-3 h-3 stroke-[2]" />
                {task.recurrence}
              </span>
            )}

            {/* Priority Badge */}
            {task.priority && (
              <span
                className={`inline-flex items-center text-[10px] px-1.5 py-0.5 border font-medium ${
                  isAngular ? 'rounded-none font-mono text-[9px]' : 'rounded-md capitalize'
                } ${
                  task.priority === 'high'
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/25'
                    : task.priority === 'low'
                    ? 'text-blue-400 bg-blue-500/10 border-blue-500/25'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                }`}
              >
                {isAngular
                  ? task.priority === 'high'
                    ? '[HIGH]'
                    : task.priority === 'low'
                    ? '[LOW]'
                    : '[MED]'
                  : task.priority === 'high'
                  ? 'High'
                  : task.priority === 'low'
                  ? 'Low'
                  : 'Medium'}
              </span>
            )}

            {/* Subtasks Count */}
            {subtasksTotal > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-nocturn-surface px-1.5 py-0.5 rounded-md border border-nocturn-border text-nocturn-muted font-mono">
                <ListChecks className="w-3 h-3 stroke-[2]" />
                {subtasksDone}/{subtasksTotal}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Star Priority Toggle Button */}
      <button
        type="button"
        aria-label={task.starred ? `Unstar task` : `Star task`}
        onClick={(e) => {
          e.stopPropagation()
          onToggleStar(task.id)
        }}
        className="p-1.5 rounded-lg text-nocturn-muted hover:text-white transition-all cursor-pointer shrink-0"
      >
        <Star
          className={`w-5 h-5 stroke-[2] transition-colors duration-200 ${
            task.starred
              ? 'fill-nocturn-accent text-nocturn-accent shadow-[0_0_10px_rgba(var(--color-nocturn-accent-rgb),0.5)]'
              : 'text-nocturn-dim hover:text-nocturn-muted'
          }`}
        />
      </button>
    </div>
  )
}
