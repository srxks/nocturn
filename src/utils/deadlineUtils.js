import { formatDateKey } from '../services/calendarService'

/**
 * Reusable utility for task deadline status and color coding.
 *
 * Rules:
 * 1. OVERDUE (dueDate < today): RED
 * 2. DUE TODAY (dueDate === today): BLUE
 * 3. DUE TOMORROW / WITHIN 1 DAY (dueDate === tomorrow): YELLOW
 * 4. DUE 2 OR MORE DAYS AWAY (dueDate > tomorrow): GREEN
 * 5. NO DUE DATE: Neutral
 */

export function getTaskDeadlineStatus(task) {
  if (!task || !task.dueDate) {
    return 'none'
  }

  const todayDate = new Date()
  const todayKey = formatDateKey(todayDate)

  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowKey = formatDateKey(tomorrowDate)

  const dueKey = task.dueDate

  if (dueKey < todayKey) {
    return 'overdue'
  }
  if (dueKey === todayKey) {
    return 'today'
  }
  if (dueKey === tomorrowKey) {
    return 'tomorrow'
  }
  if (dueKey > tomorrowKey) {
    return 'future'
  }

  return 'none'
}

export const DEADLINE_CONFIG = {
  overdue: {
    status: 'overdue',
    label: 'Overdue',
    hex: '#EF4444',
    textClass: 'text-red-400',
    bgClass: 'bg-red-500/15',
    borderClass: 'border-red-500/40',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    indicatorBg: 'bg-red-500',
    checkboxHoverBorder: 'hover:border-red-500',
    dotClass: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
  },
  today: {
    status: 'today',
    label: 'Today',
    hex: '#3B82F6',
    textClass: 'text-blue-400',
    bgClass: 'bg-blue-500/15',
    borderClass: 'border-blue-500/40',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    indicatorBg: 'bg-blue-500',
    checkboxHoverBorder: 'hover:border-blue-500',
    dotClass: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]',
  },
  tomorrow: {
    status: 'tomorrow',
    label: 'Tomorrow',
    hex: '#EAB308',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/40',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    indicatorBg: 'bg-amber-500',
    checkboxHoverBorder: 'hover:border-amber-500',
    dotClass: 'bg-amber-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]',
  },
  future: {
    status: 'future',
    label: 'Upcoming',
    hex: '#00E676',
    textClass: 'text-nocturn-accent',
    bgClass: 'bg-nocturn-accent/15',
    borderClass: 'border-nocturn-accent/40',
    badgeClass: 'bg-nocturn-accent/15 text-nocturn-accent border-nocturn-accent/30',
    indicatorBg: 'bg-nocturn-accent',
    checkboxHoverBorder: 'hover:border-nocturn-accent',
    dotClass: 'bg-nocturn-accent shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb),0.6)]',
  },
  none: {
    status: 'none',
    label: 'No Due Date',
    hex: '#A7B3AA',
    textClass: 'text-nocturn-muted',
    bgClass: 'bg-nocturn-surface',
    borderClass: 'border-nocturn-border',
    badgeClass: 'bg-nocturn-surface text-nocturn-muted border-nocturn-border',
    indicatorBg: 'bg-nocturn-muted',
    checkboxHoverBorder: 'hover:border-nocturn-accent',
    dotClass: 'bg-nocturn-muted/40',
  },
}

export function getTaskDeadlineConfig(task) {
  const status = getTaskDeadlineStatus(task)
  const config = DEADLINE_CONFIG[status] || DEADLINE_CONFIG.none

  // Format custom due date label if applicable
  let formattedLabel = config.label
  if (task && task.dueDate) {
    if (status === 'overdue' || status === 'future') {
      const due = new Date(task.dueDate + 'T00:00:00')
      const formatted = due.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      formattedLabel = status === 'overdue' ? `Overdue (${formatted})` : formatted
    }
  }

  return {
    ...config,
    formattedLabel,
  }
}
