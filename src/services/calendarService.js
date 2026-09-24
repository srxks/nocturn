/**
 * Calendar Service Abstraction
 * Handles local event mapping, date formatting, and Google Calendar integration bridge.
 */

import { formatDateKey } from '../utils/date.js'
export { formatDateKey }

export function getEventsForDate(dateKey, tasks = []) {
  const matchingTasks = tasks.filter(
    (t) => !t.completed && (t.dueDate === dateKey || t.date === dateKey)
  )

  return matchingTasks.map((t) => ({
    id: `event-${t.id}`,
    taskId: t.id,
    taskObj: t,
    title: t.title,
    startTime: t.reminder || '09:00',
    date: dateKey,
    source: 'local',
    type: 'task',
    completed: false,
    priority: t.priority || 'medium',
  }))
}

/**
 * Constructs Google Calendar day URL and opens in a new tab.
 */
export function openGoogleCalendarForDate(dateObj) {
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')

  const url = `https://calendar.google.com/calendar/r/day/${year}/${month}/${day}`
  window.open(url, '_blank', 'noopener,noreferrer')
}
