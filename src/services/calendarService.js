/**
 * Calendar Service Abstraction
 * Handles local event mapping, date formatting, and Google Calendar integration bridge.
 */

// Helper to format Date object into YYYY-MM-DD
export function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
