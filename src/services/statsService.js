import { formatDateKey } from './calendarService.js'

/**
 * Productivity Statistics Calculator
 * Computes focus time, session counts, streaks, and period breakdowns from persistent session records.
 *
 * CRITICAL FOCUS CALCULATION:
 * - "Total Focus" represents the ACTUAL amount of time the timer was actively running.
 * - Paused time is strictly excluded.
 * - Active or paused current session duration is added dynamically.
 * - Historical periods (week, month, year) support complete bi-directional navigation.
 * - Zero fake/seeded values when there is no data.
 */

export function getSessionDurationMinutes(s) {
  if (!s || typeof s !== 'object') return 0
  if (Number.isFinite(Number(s.durationSeconds)) && Number(s.durationSeconds) > 0) {
    return Number(s.durationSeconds) / 60
  }
  if (Number.isFinite(Number(s.duration_seconds)) && Number(s.duration_seconds) > 0) {
    return Number(s.duration_seconds) / 60
  }
  if (Number.isFinite(Number(s.duration)) && Number(s.duration) > 0) {
    return Number(s.duration)
  }
  return 0
}

export function getActiveSessionMinutes(activeSession) {
  if (!activeSession || typeof activeSession !== 'object') return 0
  const isFocus = activeSession.sessionType === 'focus' || activeSession.sessionType === 'focus_session'
  if (!isFocus) return 0

  if (activeSession.status === 'paused') {
    const elapsedSecs = Number(activeSession.elapsedSeconds) || 0
    return elapsedSecs > 0 ? elapsedSecs / 60 : 0
  }

  if (activeSession.status === 'active' || activeSession.status === 'running') {
    if (activeSession.canonicalStartTime) {
      const nowMs = Date.now()
      const elapsedSecs = Math.max(0, Math.floor((nowMs - activeSession.canonicalStartTime) / 1000))
      return elapsedSecs > 0 ? elapsedSecs / 60 : 0
    }
    const elapsedSecs = Number(activeSession.elapsedSeconds) || 0
    return elapsedSecs > 0 ? elapsedSecs / 60 : 0
  }

  return 0
}

export function calculateProductivityStats(
  sessions = [],
  tasks = [],
  period = 'week',
  offset = 0,
  activeSession = null
) {
  const safeSessions = Array.isArray(sessions) ? sessions.filter((s) => s && typeof s === 'object') : []
  const safeTasks = Array.isArray(tasks) ? tasks.filter((t) => t && typeof t === 'object') : []

  // Filter focus sessions (exclude break records)
  const focusSessions = safeSessions.filter(
    (s) => s.sessionType === 'focus' || s.sessionType === 'focus_session'
  )

  // Completed sessions focus minutes
  const completedFocusMinutes = focusSessions.reduce((acc, s) => acc + getSessionDurationMinutes(s), 0)

  // Active / paused current focus session minutes (paused time does NOT count)
  const activeMinutes = getActiveSessionMinutes(activeSession)

  const rawTotalFocusMinutes = completedFocusMinutes + activeMinutes
  const totalFocusMinutes = Math.round(rawTotalFocusMinutes * 10) / 10
  const totalFocusHours = (totalFocusMinutes / 60).toFixed(1)

  const totalCompletedTasks = safeTasks.filter((t) => Boolean(t.completed)).length

  // Streak Calculation (Consecutive days ending today/yesterday with at least 1 completed focus session or task)
  const validDates = [
    ...focusSessions.map((s) => {
      const dateStr = s.completedAt || s.ended_at || s.createdAt || s.created_at || s.startedAt
      return dateStr ? formatDateKey(new Date(dateStr)) : null
    }),
    ...safeTasks
      .filter((t) => Boolean(t.completed) && (t.completedAt || t.updatedAt))
      .map((t) => formatDateKey(new Date(t.completedAt || t.updatedAt))),
  ].filter(Boolean)

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
  let filteredSessions = []
  let filteredTasks = []
  let periodLabel = ''

  if (period === 'week') {
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + offset * 7)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    filteredSessions = focusSessions.filter((s) => {
      const dateStr = s.completedAt || s.ended_at || s.createdAt || s.created_at || s.startedAt
      if (!dateStr) return false
      const d = new Date(dateStr)
      return !isNaN(d.getTime()) && d >= startOfWeek && d <= endOfWeek
    })

    filteredTasks = safeTasks.filter((t) => {
      if (!t.completed) return false
      const dateStr = t.completedAt || t.updatedAt
      if (!dateStr) return false
      const d = new Date(dateStr)
      return !isNaN(d.getTime()) && d >= startOfWeek && d <= endOfWeek
    })

    const startStr = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endStr = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: startOfWeek.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
    periodLabel = `${startStr} – ${endStr}`
  } else if (period === 'month') {
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const year = targetMonth.getFullYear()
    const month = targetMonth.getMonth()

    filteredSessions = focusSessions.filter((s) => {
      const dateStr = s.completedAt || s.ended_at || s.createdAt || s.created_at || s.startedAt
      if (!dateStr) return false
      const d = new Date(dateStr)
      return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month
    })

    filteredTasks = safeTasks.filter((t) => {
      if (!t.completed) return false
      const dateStr = t.completedAt || t.updatedAt
      if (!dateStr) return false
      const d = new Date(dateStr)
      return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month
    })

    periodLabel = targetMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  } else if (period === 'year') {
    const targetYear = now.getFullYear() + offset
    filteredSessions = focusSessions.filter((s) => {
      const dateStr = s.completedAt || s.ended_at || s.createdAt || s.created_at || s.startedAt
      if (!dateStr) return false
      const d = new Date(dateStr)
      return !isNaN(d.getTime()) && d.getFullYear() === targetYear
    })

    filteredTasks = safeTasks.filter((t) => {
      if (!t.completed) return false
      const dateStr = t.completedAt || t.updatedAt
      if (!dateStr) return false
      const d = new Date(dateStr)
      return !isNaN(d.getTime()) && d.getFullYear() === targetYear
    })

    periodLabel = `${targetYear}`
  }

  // Include active session in period minutes if offset is 0 (current period)
  const periodCompletedMinutes = filteredSessions.reduce(
    (acc, s) => acc + getSessionDurationMinutes(s),
    0
  )
  const periodActiveMinutes = offset === 0 ? activeMinutes : 0
  const rawPeriodMinutes = periodCompletedMinutes + periodActiveMinutes
  const periodMinutes = Math.round(rawPeriodMinutes * 10) / 10
  const periodHours = (periodMinutes / 60).toFixed(1)

  return {
    totalFocusMinutes,
    totalFocusHours,
    totalFocusSessionsCount: focusSessions.length,
    totalCompletedTasks,
    streak,
    periodSessionsCount: filteredSessions.length,
    periodTasksCount: filteredTasks.length,
    periodMinutes,
    periodHours,
    periodLabel,
  }
}
