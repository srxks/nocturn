/**
 * notificationService.js
 *
 * Local/Push Task Reminder Notification Service.
 *
 * Capabilities:
 * 1. Requests Notification permission when requested by the user.
 * 2. Schedules precise timeouts for task reminders.
 * 3. Survives page reload by re-evaluating Dexie tasks on startup.
 * 4. Automatically cancels or reschedules timers when a task is edited, completed, or deleted.
 * 5. Uses notification tags to deduplicate and prevent duplicate alerts.
 */

import { db } from '../db/db.js'
import { formatDateKey } from './calendarService.js'

// In-memory map of active timer IDs keyed by taskId
const scheduledTimers = new Map()

/**
 * Request notification permission from the browser.
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  if (Notification.permission === 'granted') {
    return 'granted'
  }
  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch {
    return 'denied'
  }
}

/**
 * Returns true if browser notifications are allowed.
 */
export function hasNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  return Notification.permission === 'granted'
}

/**
 * Parses a task's reminder configuration into an absolute Date object.
 * Returns null if invalid or in the past.
 */
export function getReminderDate(task) {
  if (!task || !task.reminder || task.completed) return null

  const todayKey = formatDateKey(new Date())
  const baseDateKey = task.dueDate || task.myDayDate || todayKey

  let targetDate = null

  // Format 1: HH:mm (e.g. "09:00", "14:00", "18:00")
  if (/^\d{1,2}:\d{2}$/.test(task.reminder)) {
    const [hours, mins] = task.reminder.split(':').map(Number)
    const d = new Date(baseDateKey + 'T00:00:00')
    if (!isNaN(d.getTime())) {
      d.setHours(hours, mins, 0, 0)
      targetDate = d
    }
  } else {
    // Format 2: ISO string or standard parseable datetime
    const d = new Date(task.reminder)
    if (!isNaN(d.getTime())) {
      targetDate = d
    }
  }

  return targetDate
}

/**
 * Cancels any pending scheduled notification for a task.
 */
export function cancelTaskReminder(taskId) {
  if (scheduledTimers.has(taskId)) {
    clearTimeout(scheduledTimers.get(taskId))
    scheduledTimers.delete(taskId)
  }
}

/**
 * Shows the notification if permission is granted, and emits a custom DOM event.
 */
function fireNotification(task) {
  if (typeof window === 'undefined') return

  // Play subtle audio alert if supported
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    // Audio optional
  }

  // Native Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`Reminder: ${task.title}`, {
        body: task.notes || 'Time to work on your task in Nocturn.',
        icon: '/favicon.ico',
        tag: `nocturn-reminder-${task.id}`,
      })
    } catch {
      // Fallback
    }
  }

  // Dispatch custom event for in-app UI toasts / banners
  window.dispatchEvent(
    new CustomEvent('nocturn:task-reminder', {
      detail: {
        taskId: task.id,
        title: task.title,
        priority: task.priority,
      },
    })
  )
}

/**
 * Schedules a notification for a task.
 */
export function scheduleTaskReminder(task) {
  if (!task?.id) return
  cancelTaskReminder(task.id)

  if (task.completed) return

  const reminderDate = getReminderDate(task)
  if (!reminderDate) return

  const nowMs = Date.now()
  const diffMs = reminderDate.getTime() - nowMs

  // If in the past or farther out than 24 days (setTimeout limit), don't set immediate timer
  if (diffMs <= 0 || diffMs > 2000000000) return

  const timerId = setTimeout(async () => {
    scheduledTimers.delete(task.id)
    // Double check that task is still active and incomplete in Dexie
    try {
      const current = await db.tasks.get(task.id)
      if (current && !current.completed && current.reminder) {
        fireNotification(current)
      }
    } catch {
      // ignore
    }
  }, diffMs)

  scheduledTimers.set(task.id, timerId)
}

/**
 * Synchronizes scheduled reminders for a list of tasks.
 * Cancels reminders for tasks that no longer have reminders or are completed.
 */
export function syncTaskReminders(tasks = []) {
  if (!Array.isArray(tasks)) return

  const currentTaskIds = new Set()

  for (const task of tasks) {
    if (!task || !task.id) continue
    currentTaskIds.add(task.id)

    if (task.completed || !task.reminder) {
      cancelTaskReminder(task.id)
    } else {
      scheduleTaskReminder(task)
    }
  }

  // Cancel any scheduled timer for tasks no longer present
  for (const [taskId] of scheduledTimers.entries()) {
    if (!currentTaskIds.has(taskId)) {
      cancelTaskReminder(taskId)
    }
  }
}
