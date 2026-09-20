/**
 * taskInputParser.js
 *
 * Natural language task input parser for Nocturn.
 * Detects priorities, due dates, and reminder times from freeform text.
 *
 * Examples:
 * - "Finish electronics assignment tomorrow at 5pm !high"
 *   -> { cleanTitle: "Finish electronics assignment", priority: "high", day: "tomorrow", time: "17:00", formattedTime: "5:00 PM" }
 * - "Team standup today at 10am !med"
 *   -> { cleanTitle: "Team standup", priority: "medium", day: "today", time: "10:00", formattedTime: "10:00 AM" }
 */

export function parseNaturalTaskInput(input) {
  if (!input || typeof input !== 'string') {
    return { cleanTitle: '', priority: null, day: null, time: null, formattedTime: null }
  }

  let text = input
  let priority = null
  let day = null
  let time = null
  let formattedTime = null

  // Priority detection: !high, !urgent, !p1, !med, !medium, !p2, !low, !p3
  const highMatch = text.match(/(?:^|\s)!(high|urgent|p1)\b/i)
  const medMatch = text.match(/(?:^|\s)!(med|medium|p2)\b/i)
  const lowMatch = text.match(/(?:^|\s)!(low|p3)\b/i)

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

  // Date detection: today, tomorrow, tmrw
  const tomorrowMatch = text.match(/\b(tomorrow|tmrw)\b/i)
  const todayMatch = text.match(/\btoday\b/i)

  if (tomorrowMatch) {
    day = 'tomorrow'
    text = text.replace(tomorrowMatch[0], ' ')
  } else if (todayMatch) {
    day = 'today'
    text = text.replace(todayMatch[0], ' ')
  }

  // Time detection: e.g. "at 5pm", "5pm", "at 5:30pm", "10am", "at 17:00"
  const time12Match = text.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
  const time24Match = !time12Match ? text.match(/\bat\s+([01]?\d|2[0-3]):([0-5]\d)\b/i) : null

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

  const cleanTitle = text.replace(/\s+/g, ' ').trim()

  return {
    cleanTitle,
    priority,
    day,
    time,
    formattedTime,
  }
}
