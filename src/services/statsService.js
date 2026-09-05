import { formatDateKey } from './calendarService'

/**
 * Productivity Statistics Calculator
 * Computes focus time, session counts, streaks, and period breakdowns from persistent session records.
 * Resilient against undefined/null data, empty arrays, and first-time users.
 */

export function calculateProductivityStats(sessions = [], tasks = [], period = 'week', offset = 0) {
  const safeSessions = Array.isArray(sessions) ? sessions.filter((s) => s && typeof s === 'object') : []
  const safeTasks = Array.isArray(tasks) ? tasks.filter((t) => t && typeof t === 'object') : []

  const focusSessions = safeSessions.filter((s) => s.sessionType === 'focus' || s.sessionType === 'focus_session')
  const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0)
  const totalCompletedTasks = safeTasks.filter((t) => Boolean(t.completed)).length

  // Streak Calculation (Consecutive days ending today/yesterday with at least 1 completed focus session)
  const validDates = focusSessions
    .map((s) => (s.completedAt ? formatDateKey(new Date(s.completedAt)) : null))
    .filter(Boolean)

  const sessionDates = new Set(validDates)

  const today = new Date()
  let streak = 0
  const checkDate = new Date(today)

  let checkKey = formatDateKey(checkDate)
  if (sessionDates.has(checkKey)) {
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
    checkKey = formatDateKey(checkDate)
    while (sessionDates.has(checkKey)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
      checkKey = formatDateKey(checkDate)
    }
  } else {
    checkDate.setDate(checkDate.getDate() - 1)
    checkKey = formatDateKey(checkDate)
    while (sessionDates.has(checkKey)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
      checkKey = formatDateKey(checkDate)
    }
  }

  // Period Filtering (Week / Month / Year)
  const now = new Date()
  let filteredSessions = focusSessions
  let periodLabel = ''

  if (period === 'week') {
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + offset * 7)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    filteredSessions = focusSessions.filter((s) => {
      if (!s.completedAt) return false
      const d = new Date(s.completedAt)
      return d >= startOfWeek && d <= endOfWeek
    })

    const startStr = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endStr = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    periodLabel = `${startStr} – ${endStr}`
  } else if (period === 'month') {
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const year = targetMonth.getFullYear()
    const month = targetMonth.getMonth()

    filteredSessions = focusSessions.filter((s) => {
      if (!s.completedAt) return false
      const d = new Date(s.completedAt)
      return d.getFullYear() === year && d.getMonth() === month
    })

    periodLabel = targetMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  } else if (period === 'year') {
    const targetYear = now.getFullYear() + offset
    filteredSessions = focusSessions.filter((s) => {
      if (!s.completedAt) return false
      const d = new Date(s.completedAt)
      return d.getFullYear() === targetYear
    })

    periodLabel = `${targetYear}`
  }

  const periodMinutes = filteredSessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0)
  const periodHours = (periodMinutes / 60).toFixed(1)

  return {
    totalFocusMinutes,
    totalFocusHours: (totalFocusMinutes / 60).toFixed(1),
    totalFocusSessionsCount: focusSessions.length,
    totalCompletedTasks,
    streak,
    periodSessionsCount: filteredSessions.length,
    periodMinutes,
    periodHours,
    periodLabel,
  }
}
