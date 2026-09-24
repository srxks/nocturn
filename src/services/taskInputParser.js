/**
 * taskInputParser.js
 *
 * Deterministic natural language task input parser for Nocturn.
 * Detects priorities, due dates, reminder times, durations, recurrence, and labels from freeform text.
 *
 * Examples:
 * - "Finish DSP assignment tomorrow 6pm p1 #college"
 *   -> { cleanTitle: "Finish DSP assignment", priority: "high", day: "tomorrow", dateKey: "...", time: "18:00", formattedTime: "6:00 PM", labels: ["college"], duration: null, recurrence: null }
 * - "Study probability Friday 7pm for 90m #study"
 *   -> { cleanTitle: "Study probability", priority: null, day: "Friday", dateKey: "...", time: "19:00", formattedTime: "7:00 PM", labels: ["study"], duration: 90, recurrence: null }
 * - "Submit lab report next Monday !high"
 *   -> { cleanTitle: "Submit lab report", priority: "high", day: "Monday", dateKey: "...", ... }
 * - "Workout every weekday at 7am for 45m"
 *   -> { cleanTitle: "Workout", recurrence: "weekdays", time: "07:00", duration: 45, ... }
 */

import { formatDateKey } from './calendarService.js'

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export function parseNaturalTaskInput(input) {
  if (!input || typeof input !== 'string') {
    return {
      cleanTitle: '',
      priority: null,
      day: null,
      dateKey: null,
      time: null,
      formattedTime: null,
      duration: null,
      recurrence: null,
      labels: [],
    }
  }

  let text = input.trim()
  let priority = null
  let day = null
  let dateKey = null
  let time = null
  let formattedTime = null
  let duration = null
  let recurrence = null
  const labels = []

  const now = new Date()

  // 1. Labels / Hashtags extraction: e.g. #college, #coding, #study
  const tagMatches = text.match(/(?:^|\s)#([a-zA-Z0-9_\-]+)/g)
  if (tagMatches) {
    for (const match of tagMatches) {
      const tag = match.trim().replace(/^#/, '').toLowerCase()
      if (tag && !labels.includes(tag)) {
        labels.push(tag)
      }
      text = text.replace(match, ' ')
    }
  }

  // 2. Recurrence detection: e.g. "every weekday", "every day", "daily", "every week", "every monday"
  const recurrenceWeekdayMatch = text.match(/\b(?:every\s+weekday|weekdays)\b/i)
  const recurrenceDailyMatch = text.match(/\b(?:every\s+day|daily)\b/i)
  const recurrenceWeeklyMatch = text.match(/\b(?:every\s+week|weekly)\b/i)
  const recurrenceMonthlyMatch = text.match(/\b(?:every\s+month|monthly)\b/i)
  const recurrenceSpecificDayMatch = text.match(/\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)

  if (recurrenceWeekdayMatch) {
    recurrence = 'weekdays'
    text = text.replace(recurrenceWeekdayMatch[0], ' ')
  } else if (recurrenceDailyMatch) {
    recurrence = 'daily'
    text = text.replace(recurrenceDailyMatch[0], ' ')
  } else if (recurrenceSpecificDayMatch) {
    recurrence = 'weekly'
    text = text.replace(recurrenceSpecificDayMatch[0], ' ')
  } else if (recurrenceWeeklyMatch) {
    recurrence = 'weekly'
    text = text.replace(recurrenceWeeklyMatch[0], ' ')
  } else if (recurrenceMonthlyMatch) {
    recurrence = 'monthly'
    text = text.replace(recurrenceMonthlyMatch[0], ' ')
  }

  // 3. Duration detection: e.g. "for 90m", "for 90 mins", "for 1.5h", "for 2 hours", "30m", "45m", "1h"
  const durationForMatch = text.match(/\b(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:m|min|mins|minutes|h|hr|hrs|hours)\b/i)
  if (durationForMatch) {
    const rawVal = parseFloat(durationForMatch[1])
    const unitStr = durationForMatch[0].toLowerCase()
    if (unitStr.includes('h')) {
      duration = Math.round(rawVal * 60)
    } else {
      duration = Math.round(rawVal)
    }
    text = text.replace(durationForMatch[0], ' ')
  }

  // 4. Priority detection: !high, !urgent, urgent, high priority, p1, !p1, p2, p3, low priority
  const highMatch = text.match(/(?:^|\s)(?:!(?:high|urgent|p1)|(?:\b(?:p1|p-1|urgent|high\s+priority)\b))/i)
  const medMatch = text.match(/(?:^|\s)(?:!(?:med|medium|p2)|(?:\b(?:p2|p-2|medium\s+priority)\b))/i)
  const lowMatch = text.match(/(?:^|\s)(?:!(?:low|p3)|(?:\b(?:p3|p-3|low\s+priority)\b))/i)

  if (highMatch) {
    priority = 'high'
    text = text.replace(highMatch[0], ' ')
  } else if (medMatch) {
    priority = 'medium'
    text = text.replace(medMatch[0], ' ')
  } else if (lowMatch) {
    priority = 'low'
    text = text.replace(lowMatch[0], ' ')
  }

  // 5. Date detection:
  // - "tonight"
  // - "tomorrow", "tmrw"
  // - "today"
  // - "in X days"
  // - "next week"
  // - "next <weekday>" or "<weekday>" (e.g. Friday, Monday)
  const tonightMatch = text.match(/\btonight\b/i)
  const tomorrowMatch = text.match(/\b(tomorrow|tmrw)\b/i)
  const todayMatch = text.match(/\btoday\b/i)
  const inDaysMatch = text.match(/\bin\s+(\d+)\s+days?\b/i)
  const nextWeekMatch = text.match(/\bnext\s+week\b/i)
  const weekdayMatch = text.match(/\b(?:(next)\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)

  if (tonightMatch) {
    day = 'today'
    dateKey = formatDateKey(now)
    if (!time) {
      time = '20:00'
      formattedTime = '8:00 PM'
    }
    text = text.replace(tonightMatch[0], ' ')
  } else if (tomorrowMatch) {
    day = 'tomorrow'
    const target = new Date(now)
    target.setDate(now.getDate() + 1)
    dateKey = formatDateKey(target)
    text = text.replace(tomorrowMatch[0], ' ')
  } else if (todayMatch) {
    day = 'today'
    dateKey = formatDateKey(now)
    text = text.replace(todayMatch[0], ' ')
  } else if (inDaysMatch) {
    const daysOffset = parseInt(inDaysMatch[1], 10)
    const target = new Date(now)
    target.setDate(now.getDate() + daysOffset)
    day = `in ${daysOffset} days`
    dateKey = formatDateKey(target)
    text = text.replace(inDaysMatch[0], ' ')
  } else if (nextWeekMatch) {
    const target = new Date(now)
    target.setDate(now.getDate() + 7)
    day = 'next week'
    dateKey = formatDateKey(target)
    text = text.replace(nextWeekMatch[0], ' ')
  } else if (weekdayMatch) {
    const isNext = Boolean(weekdayMatch[1])
    const targetDayName = weekdayMatch[2].toLowerCase()
    const targetDayIdx = DAY_NAMES.indexOf(targetDayName)
    const currentDayIdx = now.getDay()

    let diff = (targetDayIdx - currentDayIdx + 7) % 7
    if (diff === 0 || isNext) diff += 7 // "next Friday" or today's day defaults to next week

    const target = new Date(now)
    target.setDate(now.getDate() + diff)
    day = weekdayMatch[0].trim()
    dateKey = formatDateKey(target)
    text = text.replace(weekdayMatch[0], ' ')
  }

  // 6. Time detection:
  // - "morning" (9am)
  // - "afternoon" (2pm)
  // - "evening" (6pm)
  // - "at 5pm", "5pm", "6:30pm", "10am", "16:00"
  if (!time) {
    const morningMatch = text.match(/\b(?:in\s+the\s+)?morning\b/i)
    const afternoonMatch = text.match(/\b(?:in\s+the\s+)?afternoon\b/i)
    const eveningMatch = text.match(/\b(?:in\s+the\s+)?evening\b/i)

    if (morningMatch) {
      time = '09:00'
      formattedTime = '9:00 AM'
      text = text.replace(morningMatch[0], ' ')
    } else if (afternoonMatch) {
      time = '14:00'
      formattedTime = '2:00 PM'
      text = text.replace(afternoonMatch[0], ' ')
    } else if (eveningMatch) {
      time = '18:00'
      formattedTime = '6:00 PM'
      text = text.replace(eveningMatch[0], ' ')
    }
  }

  if (!time) {
    const time12Match = text.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
    const time24Match = !time12Match ? text.match(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i) : null

    if (time12Match) {
      let hours = parseInt(time12Match[1], 10)
      const minutes = time12Match[2] ? parseInt(time12Match[2], 10) : 0
      const meridian = time12Match[3].toLowerCase()

      if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes < 60) {
        if (meridian === 'pm' && hours < 12) hours += 12
        if (meridian === 'am' && hours === 12) hours = 0
        const hh = String(hours).padStart(2, '0')
        const mm = String(minutes).padStart(2, '0')
        time = `${hh}:${mm}`

        const dispH = hours % 12 || 12
        const dispM = minutes > 0 ? `:${String(minutes).padStart(2, '0')}` : ':00'
        formattedTime = `${dispH}${dispM} ${meridian.toUpperCase()}`

        text = text.replace(time12Match[0], ' ')
      }
    } else if (time24Match) {
      const hours = parseInt(time24Match[1], 10)
      const minutes = parseInt(time24Match[2], 10)
      const hh = String(hours).padStart(2, '0')
      const mm = String(minutes).padStart(2, '0')
      time = `${hh}:${mm}`
      const dispH = hours % 12 || 12
      const dispM = `:${String(minutes).padStart(2, '0')}`
      const meridian = hours >= 12 ? 'PM' : 'AM'
      formattedTime = `${dispH}${dispM} ${meridian}`
      text = text.replace(time24Match[0], ' ')
    }
  }

  const cleanTitle = text.replace(/\s+/g, ' ').trim()

  return {
    cleanTitle: cleanTitle || input.trim(),
    priority,
    day,
    dateKey,
    time,
    formattedTime,
    duration,
    recurrence,
    labels,
  }
}
