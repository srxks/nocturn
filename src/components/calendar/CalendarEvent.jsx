import { getTaskDeadlineConfig } from '../../utils/deadlineUtils'

export default function CalendarEvent({ event }) {
  const isCompleted = event.completed
  const taskObj = event.taskObj || event
  const deadlineConfig = getTaskDeadlineConfig(taskObj)

  return (
    <div
      className={`text-[10px] sm:text-[11px] leading-tight px-1.5 py-0.5 rounded-md truncate transition-all duration-150 ${
        isCompleted
          ? 'bg-nocturn-surface/50 text-nocturn-muted/60 line-through'
          : `${deadlineConfig.badgeClass} font-medium`
      }`}
      title={`${event.title} (${deadlineConfig.formattedLabel})`}
    >
      <span className="font-mono text-[9px] opacity-75 mr-1 hidden sm:inline">
        {event.startTime}
      </span>
      <span>{event.title}</span>
    </div>
  )
}
