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

/**
 * Returns true if the session record qualifies as a genuine focused session.
 * Includes Pomodoro focus and Focus Stopwatch.
 * Strictly EXCLUDES breaks and Normal Stopwatch.
 */
export function isFocusSessionRecord(s) {
  if (!s || typeof s !== 'object') return false
  const t = s.sessionType
  return t === 'focus' || t === 'focus_session' || t === 'focus_stopwatch' || t === 'pomodoro_focus'
}

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
  const isFocus = isFocusSessionRecord(activeSession)
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

  // Filter genuine focus sessions (Pomodoro focus + Focus Stopwatch; excludes breaks & normal stopwatch)
  const focusSessions = safeSessions.filter(isFocusSessionRecord)

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

/**
 * Computes daily activity heatmap for the last N days (default 60).
 * Returns array of { dateKey, dayOfWeek, dayOfMonth, monthLabel, minutes, count, level: 0..4 }.
 */
export function calculateDailyHeatmap(sessions = [], tasks = [], days = 60) {
  const safeSessions = Array.isArray(sessions) ? sessions : []
  const safeTasks = Array.isArray(tasks) ? tasks : []
  const now = new Date()
  const heatmap = []

  // Create lookup of minutes per dateKey
  const minsByDate = new Map()
  for (const s of safeSessions) {
    if (!isFocusSessionRecord(s)) continue
    const dateStr = s.completedAt || s.ended_at || s.createdAt || s.created_at || s.startedAt
    if (!dateStr) continue
    const key = formatDateKey(new Date(dateStr))
    const m = getSessionDurationMinutes(s)
    minsByDate.set(key, (minsByDate.get(key) || 0) + m)
  }

  // Also count completed tasks per dateKey
  const tasksByDate = new Map()
  for (const t of safeTasks) {
    if (!t.completed) continue
    const dateStr = t.completedAt || t.updatedAt
    if (!dateStr) continue
    const key = formatDateKey(new Date(dateStr))
    tasksByDate.set(key, (tasksByDate.get(key) || 0) + 1)
  }

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = formatDateKey(d)
    const minutes = Math.round((minsByDate.get(key) || 0) * 10) / 10
    const taskCount = tasksByDate.get(key) || 0

    // Intensity level: 0 = none, 1 = 1-25m, 2 = 25-50m, 3 = 50-100m, 4 = 100m+
    let level = 0
    if (minutes > 100 || (minutes > 60 && taskCount >= 3)) level = 4
    else if (minutes >= 50 || taskCount >= 4) level = 3
    else if (minutes >= 25 || taskCount >= 2) level = 2
    else if (minutes > 0 || taskCount >= 1) level = 1

    heatmap.push({
      dateKey: key,
      date: d,
      dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayOfMonth: d.getDate(),
      monthLabel: d.toLocaleDateString('en-US', { month: 'short' }),
      minutes,
      taskCount,
      level,
    })
  }

  return heatmap
}

/**
 * Calculates focus distribution breakdown grouped by task list.
 */
export function calculateFocusByList(sessions = [], tasks = [], lists = []) {
  const safeSessions = Array.isArray(sessions) ? sessions : []
  const safeTasks = Array.isArray(tasks) ? tasks : []
  const safeLists = Array.isArray(lists) ? lists : []

  // Create taskId -> listId lookup
  const taskListLookup = new Map()
  for (const t of safeTasks) {
    if (t?.id) {
      taskListLookup.set(t.id, t.listId || 'tasks')
    }
  }

  // Create listId -> listName lookup
  const listNameLookup = new Map()
  listNameLookup.set('tasks', 'General Tasks')
  listNameLookup.set('my-day', 'My Day')
  for (const l of safeLists) {
    if (l?.id) {
      listNameLookup.set(l.id, l.name || 'Custom List')
    }
  }

  const minsByList = new Map()
  let grandTotalMins = 0

  for (const s of safeSessions) {
    if (!isFocusSessionRecord(s)) continue
    const mins = getSessionDurationMinutes(s)
    if (mins <= 0) continue

    const listId = (s.taskId && taskListLookup.get(s.taskId)) || 'tasks'
    minsByList.set(listId, (minsByList.get(listId) || 0) + mins)
    grandTotalMins += mins
  }

  const result = []
  for (const [listId, mins] of minsByList.entries()) {
    const name = listNameLookup.get(listId) || 'Tasks'
    const pct = grandTotalMins > 0 ? Math.round((mins / grandTotalMins) * 100) : 0
    result.push({
      listId,
      name,
      minutes: Math.round(mins),
      hours: (mins / 60).toFixed(1),
      percentage: pct,
    })
  }

  return result.sort((a, b) => b.minutes - a.minutes)
}

/**
 * Calculates focus distribution breakdown grouped by specific task.
 */
export function calculateFocusByTask(sessions = [], tasks = []) {
  const safeSessions = Array.isArray(sessions) ? sessions : []
  const safeTasks = Array.isArray(tasks) ? tasks : []

  const taskTitleLookup = new Map()
  for (const t of safeTasks) {
    if (t?.id) {
      taskTitleLookup.set(t.id, t.title || 'Untitled Task')
    }
  }

  const minsByTask = new Map()
  const sessionsByTask = new Map()
  let grandTotalMins = 0

  for (const s of safeSessions) {
    if (!isFocusSessionRecord(s)) continue
    const mins = getSessionDurationMinutes(s)
    if (mins <= 0) continue

    const title = s.taskId ? (taskTitleLookup.get(s.taskId) || s.taskName || 'Completed Task') : (s.taskName || 'Free Focus')

    minsByTask.set(title, (minsByTask.get(title) || 0) + mins)
    sessionsByTask.set(title, (sessionsByTask.get(title) || 0) + 1)
    grandTotalMins += mins
  }

  const result = []
  for (const [title, mins] of minsByTask.entries()) {
    const count = sessionsByTask.get(title) || 1
    const pct = grandTotalMins > 0 ? Math.round((mins / grandTotalMins) * 100) : 0
    result.push({
      title,
      minutes: Math.round(mins),
      hours: (mins / 60).toFixed(1),
      count,
      percentage: pct,
    })
  }

  return result.sort((a, b) => b.minutes - a.minutes).slice(0, 10)
}

/**
 * Calculates session distribution breakdown distinguishing timer types:
 * Pomodoro Focus, Focus Stopwatch, Breaks, Normal Stopwatch.
 */
export function calculateSessionBreakdown(sessions = []) {
  const safeSessions = Array.isArray(sessions) ? sessions.filter(Boolean) : []
  let pomodoroMinutes = 0
  let pomodoroCount = 0
  let focusStopwatchMinutes = 0
  let focusStopwatchCount = 0
  let breakMinutes = 0
  let breakCount = 0
  let normalStopwatchMinutes = 0
  let normalStopwatchCount = 0

  for (const s of safeSessions) {
    const mins = getSessionDurationMinutes(s)
    const t = s.sessionType
    if (t === 'focus_stopwatch') {
      focusStopwatchMinutes += mins
      focusStopwatchCount++
    } else if (t === 'normal_stopwatch') {
      normalStopwatchMinutes += mins
      normalStopwatchCount++
    } else if (t === 'short_break' || t === 'long_break' || t === 'break') {
      breakMinutes += mins
      breakCount++
    } else if (t === 'focus' || t === 'focus_session' || t === 'pomodoro_focus') {
      pomodoroMinutes += mins
      pomodoroCount++
    }
  }

  return {
    pomodoro: { minutes: Math.round(pomodoroMinutes * 10) / 10, count: pomodoroCount },
    focusStopwatch: { minutes: Math.round(focusStopwatchMinutes * 10) / 10, count: focusStopwatchCount },
    breaks: { minutes: Math.round(breakMinutes * 10) / 10, count: breakCount },
    normalStopwatch: { minutes: Math.round(normalStopwatchMinutes * 10) / 10, count: normalStopwatchCount },
  }
}

