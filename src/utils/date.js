/**
 * Utility functions for date formatting and manipulation across Nocturn.
 */

export function formatDateKey(date) {
  if (!date) {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const d = typeof date === 'object' && date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) {
    const fallback = new Date()
    const y = fallback.getFullYear()
    const m = String(fallback.getMonth() + 1).padStart(2, '0')
    const day = String(fallback.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isSameDay(date1, date2) {
  return formatDateKey(date1) === formatDateKey(date2)
}
