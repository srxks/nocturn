import { formatDateKey } from '../services/calendarService'

/**
 * Filter incomplete tasks for Plan My Day.
 * Includes:
 * 1. Tasks scheduled for today (inMyDay, dueDate === todayKey, myDayDate === todayKey)
 * 2. Overdue incomplete tasks (dueDate < todayKey)
 * Excludes:
 * - Completed tasks
 * - Future tasks (dueDate > todayKey and !inMyDay)
 */
export function getPlanMyDayTaskInput(tasks) {
  const todayKey = formatDateKey(new Date())

  return (tasks || []).filter((t) => {
    if (t.completed) return false

    const isDueToday = Boolean(t.inMyDay || t.dueDate === todayKey || t.myDayDate === todayKey)
    const isOverdue = Boolean(t.dueDate && t.dueDate < todayKey)

    return isDueToday || isOverdue
  })
}

/**
 * Filter overdue carried-forward tasks specifically for Missed Tasks callout banner.
 */
export function getOverdueCarriedForwardTasks(tasks) {
  const todayKey = formatDateKey(new Date())

  return (tasks || []).filter((t) => {
    if (t.completed) return false
    return Boolean(t.dueDate && t.dueDate < todayKey)
  })
}

/**
 * Estimate task duration in minutes based on priority or subtasks.
 */
export function getEstimatedDuration(task) {
  if (task?.estimatedDuration && typeof task.estimatedDuration === 'number') {
    return task.estimatedDuration
  }
  if (task?.subtasks && task.subtasks.length > 0) {
    return Math.min(120, Math.max(30, task.subtasks.length * 15 + 15))
  }
  if (task?.priority === 'high') return 60
  if (task?.priority === 'medium') return 45
  if (task?.priority === 'low') return 30
  return 45
}

/**
 * Convert minutes from 00:00 into 'HH:MM' string.
 */
export function minutesToTimeString(minutes) {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const hours = Math.floor(normalized / 60)
  const mins = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * Parse 'HH:MM' string into total minutes from midnight.
 */
export function timeStringToMinutes(timeStr) {
  if (!timeStr) return 9 * 60 // Default to 09:00 AM
  const [hStr, mStr] = timeStr.split(':')
  const h = parseInt(hStr, 10) || 0
  const m = parseInt(mStr, 10) || 0
  return h * 60 + m
}

/**
 * Format start time and duration into 'HH:MM – HH:MM' range string.
 */
export function formatTimeRange(startTimeStr, durationMinutes) {
  const startMins = timeStringToMinutes(startTimeStr)
  const endMins = startMins + (durationMinutes || 30)
  return `${startTimeStr} – ${minutesToTimeString(endMins)}`
}

/**
 * Smart Schedule Generator based on Planning Style and User Instructions.
 *
 * Priorities:
 * 1. Overdue tasks
 * 2. Today's tasks
 * 3. Priority level (high -> medium -> low)
 */
export function generateSmartSchedule(
  taskInput,
  planningStyle = 'balanced',
  userInstruction = '',
  startHour = 9
) {
  if (!taskInput || taskInput.length === 0) return []

  const todayKey = formatDateKey(new Date())

  // Sort tasks deterministically: Overdue first, then High priority -> Medium -> Low
  const priorityOrder = { high: 1, medium: 2, low: 3 }
  const sortedTasks = [...taskInput].sort((a, b) => {
    const isOverdueA = a.dueDate && a.dueDate < todayKey ? 0 : 1
    const isOverdueB = b.dueDate && b.dueDate < todayKey ? 0 : 1
    if (isOverdueA !== isOverdueB) return isOverdueA - isOverdueB

    const pA = priorityOrder[a.priority] || 2
    const pB = priorityOrder[b.priority] || 2
    if (pA !== pB) return pA - pB

    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  })

  // Buffer configurations based on Planning Style
  const styleConfigs = {
    relaxed: { breakInterval: 1, breakDuration: 20, maxMinutesPerDay: 300 },
    balanced: { breakInterval: 2, breakDuration: 15, maxMinutesPerDay: 420 },
    focused: { breakInterval: 3, breakDuration: 10, maxMinutesPerDay: 480 },
    intense: { breakInterval: 4, breakDuration: 5, maxMinutesPerDay: 540 },
  }
  const config = styleConfigs[planningStyle] || styleConfigs.balanced

  let currentMinutes = startHour * 60
  const schedule = []

  // Check if user instruction mentions a specific meeting or reserved block time e.g. "3 PM" or "15:00"
  let reservedTimeMins = null
  let reservedTitle = 'User Meeting / Event'
  const instructionLower = userInstruction.toLowerCase()

  if (instructionLower.includes('3 pm') || instructionLower.includes('15:00') || instructionLower.includes('3pm')) {
    reservedTimeMins = 15 * 60 // 3:00 PM = 15:00
    if (instructionLower.includes('meeting')) reservedTitle = 'Scheduled Meeting'
  } else if (instructionLower.includes('2 pm') || instructionLower.includes('14:00') || instructionLower.includes('2pm')) {
    reservedTimeMins = 14 * 60 // 2:00 PM
  } else if (instructionLower.includes('10 am') || instructionLower.includes('10:00') || instructionLower.includes('10am')) {
    reservedTimeMins = 10 * 60 // 10:00 AM
  }

  let totalScheduledTaskMinutes = 0

  sortedTasks.forEach((task, index) => {
    // Respect time capacity limit based on planning style
    if (totalScheduledTaskMinutes >= config.maxMinutesPerDay) return

    const duration = getEstimatedDuration(task)

    // Insert reserved block if current time crosses reserved time
    if (reservedTimeMins && currentMinutes < reservedTimeMins && currentMinutes + duration > reservedTimeMins) {
      const resStart = minutesToTimeString(reservedTimeMins)
      schedule.push({
        id: `reserved-${reservedTimeMins}`,
        taskId: null,
        title: reservedTitle,
        startTime: resStart,
        duration: 45,
        type: 'break',
        isReserved: true,
      })
      currentMinutes = Math.max(currentMinutes + duration, reservedTimeMins + 45)
    }

    const startTimeStr = minutesToTimeString(currentMinutes)
    schedule.push({
      id: `sched-${task.id}`,
      taskId: task.id,
      taskObj: task,
      title: task.title,
      startTime: startTimeStr,
      duration: duration,
      priority: task.priority || 'medium',
      dueDate: task.dueDate,
      type: 'focus',
    })

    currentMinutes += duration
    totalScheduledTaskMinutes += duration

    // Insert break based on planning style
    if ((index + 1) % config.breakInterval === 0 && index < sortedTasks.length - 1) {
      const breakStart = minutesToTimeString(currentMinutes)
      schedule.push({
        id: `break-${index}-${Date.now()}`,
        taskId: null,
        title: planningStyle === 'relaxed' ? 'Extended Rest & Recharge' : 'Short Break & Hydration',
        startTime: breakStart,
        duration: config.breakDuration,
        type: 'break',
      })
      currentMinutes += config.breakDuration
    }
  })

  return schedule
}

/**
 * Recalculate schedule timings sequentially when blocks are edited or reordered.
 */
export function recalculateScheduleTimings(schedule) {
  if (!schedule || schedule.length === 0) return []
  let currentMinutes = timeStringToMinutes(schedule[0].startTime)

  return schedule.map((block) => {
    const startTime = minutesToTimeString(currentMinutes)
    const updated = { ...block, startTime }
    currentMinutes += block.duration
    return updated
  })
}
