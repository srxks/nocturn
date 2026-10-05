/**
 * taskInputParser.js
 *
 * Deterministic natural language task input parser for Nocturn.
 * Detects priorities, due dates, strict deadlines, reminder times, durations, recurrence, and labels from freeform text.
 *
 * Supported patterns:
 * - "Study tomorrow" -> cleanTitle: "Study", day: "tomorrow", dateKey: ...
 * - "Submit assignment Friday" -> cleanTitle: "Submit assignment", day: "Friday", dateKey: ...
 * - "Finish DSP on Oct 7" -> cleanTitle: "Finish DSP", day: "Oct 7", dateKey: "2026-10-07"
 * - "Meeting next Monday at 5 PM" -> cleanTitle: "Meeting", day: "next Monday", time: "17:00", formattedTime: "5:00 PM"
 * - "Call mom tomorrow at 6" -> cleanTitle: "Call mom", day: "tomorrow", time: "18:00", formattedTime: "6:00 PM"
 * - "Project due 12 October" -> cleanTitle: "Project", day: "12 October", dateKey: "2026-10-12"
 * - "Finish this by Friday" -> cleanTitle: "Finish this", day: "Friday"
 * - "Submit paper deadline Oct 15" -> cleanTitle: "Submit paper", isDeadline: true, deadlineKey: "2026-10-15"
 */

import { formatDateKey } from './calendarService.js'

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const MONTH_MAP = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
}

const MONTH_REGEX_PART = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)'

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
      isDeadline: false,
      deadlineKey: null,
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
  let isDeadline = false
  let deadlineKey = null
  const labels = []

  const now = new Date()

  // 1. Labels / Hashtags extraction: e.g. #college, #coding, #study
  const tagMatches = text.match(/(?:^|\s)#([a-zA-Z0-9_-]+)/g)
  if (tagMatches) {
    for (const match of tagMatches) {
      const tag = match.trim().replace(/^#/, '').toLowerCase()
      if (tag && !labels.includes(tag)) {
        labels.push(tag)
      }
      text = text.replace(match, ' ')
    }
  }

  // 2. Recurrence detection
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

  // 3. Duration detection: e.g. "for 90m", "for 1.5h", "45m"
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

  // 4. Priority detection: !high, !urgent, p1, p2, p3
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

  // 5. Strict Deadline trigger detection (e.g. "deadline Friday", "deadline: tomorrow", "hard deadline Oct 10")
  const deadlinePrefixMatch = text.match(/\b(?:hard\s+)?deadline(?::|\s+is|\s+on|\s+by|\s+)?\s*/i)
  if (deadlinePrefixMatch) {
    isDeadline = true
    text = text.replace(deadlinePrefixMatch[0], ' ')
  }

  // 6. Time detection (Do this before relative dates to grab "at 5 PM" or "at 6")
  // 6a. Named times of day
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

  // 6b. Standard 12h time with meridian (e.g. "at 5 PM", "5:30pm", "10am")
  if (!time) {
    const time12Match = text.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
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
    }
  }

  // 6c. Military 24h format (e.g. "16:00", "09:30")
  if (!time) {
    const time24Match = text.match(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i)
    if (time24Match) {
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

  // 6d. Conversational "at <hour>" without meridian (e.g. "Call mom tomorrow at 6")
  if (!time) {
    const atHourMatch = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/i)
    if (atHourMatch) {
      let hours = parseInt(atHourMatch[1], 10)
      const minutes = atHourMatch[2] ? parseInt(atHourMatch[2], 10) : 0
      if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes < 60) {
        // Conversational heuristic: hours 1..7 default to PM (afternoon/evening), 8..11 default to AM
        const meridian = hours >= 8 && hours <= 11 ? 'AM' : 'PM'
        if (meridian === 'PM' && hours < 12) hours += 12
        if (meridian === 'AM' && hours === 12) hours = 0

        const hh = String(hours).padStart(2, '0')
        const mm = String(minutes).padStart(2, '0')
        time = `${hh}:${mm}`

        const dispH = hours % 12 || 12
        const dispM = minutes > 0 ? `:${String(minutes).padStart(2, '0')}` : ':00'
        formattedTime = `${dispH}${dispM} ${meridian}`

        text = text.replace(atHourMatch[0], ' ')
      }
    }
  }

  // 7. Date Detection
  // Common prefixes before dates: "due on", "due by", "due", "by", "on"
  const datePrefixRegex = '(?:due\\s+(?:on\\s+|by\\s+)?|by\\s+|on\\s+)?'

  // 7a. Named Month dates: e.g. "Oct 7", "October 7th", "on Oct 7", "due 12 October", "7th October 2026"
  // Pattern 1: Month Day (e.g. "Oct 7", "October 7th")
  const monthDayRegex = new RegExp(`\\b${datePrefixRegex}(${MONTH_REGEX_PART})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(\\d{4}))?\\b`, 'i')
  const monthDayMatch = text.match(monthDayRegex)

  // Pattern 2: Day Month (e.g. "12 October", "7th Oct")
  const dayMonthRegex = new RegExp(`\\b${datePrefixRegex}(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_REGEX_PART})(?:\\s+(\\d{4}))?\\b`, 'i')
  const dayMonthMatch = !monthDayMatch ? text.match(dayMonthRegex) : null

  if (monthDayMatch) {
    const monthKey = monthDayMatch[1].toLowerCase()
    const monthIdx = MONTH_MAP[monthKey]
    const dayNum = parseInt(monthDayMatch[2], 10)
    const yearNum = monthDayMatch[3] ? parseInt(monthDayMatch[3], 10) : now.getFullYear()

    if (monthIdx !== undefined && dayNum >= 1 && dayNum <= 31) {
      const target = new Date(yearNum, monthIdx, dayNum)
      // If no year specified and date is in the past by > 3 months, assume next year
      if (!monthDayMatch[3] && target.getTime() < now.getTime() - 90 * 24 * 3600 * 1000) {
        target.setFullYear(yearNum + 1)
      }
      dateKey = formatDateKey(target)
      day = `${monthDayMatch[1]} ${dayNum}`
      text = text.replace(monthDayMatch[0], ' ')
    }
  } else if (dayMonthMatch) {
    const dayNum = parseInt(dayMonthMatch[1], 10)
    const monthKey = dayMonthMatch[2].toLowerCase()
    const monthIdx = MONTH_MAP[monthKey]
    const yearNum = dayMonthMatch[3] ? parseInt(dayMonthMatch[3], 10) : now.getFullYear()

    if (monthIdx !== undefined && dayNum >= 1 && dayNum <= 31) {
      const target = new Date(yearNum, monthIdx, dayNum)
      if (!dayMonthMatch[3] && target.getTime() < now.getTime() - 90 * 24 * 3600 * 1000) {
        target.setFullYear(yearNum + 1)
      }
      dateKey = formatDateKey(target)
      day = `${dayNum} ${dayMonthMatch[2]}`
      text = text.replace(dayMonthMatch[0], ' ')
    }
  }

  // 7b. ISO / Numeric dates: e.g. "2026-10-12", "12/10", "10-12-2026"
  if (!dateKey) {
    const isoDateMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
    if (isoDateMatch) {
      dateKey = isoDateMatch[0]
      day = dateKey
      text = text.replace(isoDateMatch[0], ' ')
    }
  }

  if (!dateKey) {
    const slashDateMatch = text.match(new RegExp(`\\b${datePrefixRegex}(\\d{1,2})[/.-](\\d{1,2})(?:[/.-](\\d{2,4}))?\\b`, 'i'))
    if (slashDateMatch) {
      const p1 = parseInt(slashDateMatch[1], 10)
      const p2 = parseInt(slashDateMatch[2], 10)
      let yr = slashDateMatch[3] ? parseInt(slashDateMatch[3], 10) : now.getFullYear()
      if (yr < 100) yr += 2000

      // If p1 > 12, assume DD/MM; else MM/DD
      let m = p1 <= 12 ? p1 - 1 : p2 - 1
      let d = p1 <= 12 ? p2 : p1

      if (m >= 0 && m <= 11 && d >= 1 && d <= 31) {
        const target = new Date(yr, m, d)
        dateKey = formatDateKey(target)
        day = `${d}/${m + 1}`
        text = text.replace(slashDateMatch[0], ' ')
      }
    }
  }

  // 7c. Relative keywords: tonight, tomorrow, tmrw, today
  if (!dateKey) {
    const tonightMatch = text.match(new RegExp(`\\b${datePrefixRegex}tonight\\b`, 'i'))
    const tomorrowMatch = text.match(new RegExp(`\\b${datePrefixRegex}(tomorrow|tmrw)\\b`, 'i'))
    const todayMatch = text.match(new RegExp(`\\b${datePrefixRegex}today\\b`, 'i'))

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
    }
  }

  // 7d. Relative intervals: "in X days", "in X weeks"
  if (!dateKey) {
    const inDaysMatch = text.match(new RegExp(`\\b${datePrefixRegex}in\\s+(\\d+)\\s+(day|days|week|weeks|month|months)\\b`, 'i'))
    if (inDaysMatch) {
      const count = parseInt(inDaysMatch[1], 10)
      const unit = inDaysMatch[2].toLowerCase()
      const target = new Date(now)

      if (unit.startsWith('week')) {
        target.setDate(now.getDate() + count * 7)
        day = `in ${count} week${count > 1 ? 's' : ''}`
      } else if (unit.startsWith('month')) {
        target.setMonth(now.getMonth() + count)
        day = `in ${count} month${count > 1 ? 's' : ''}`
      } else {
        target.setDate(now.getDate() + count)
        day = `in ${count} day${count > 1 ? 's' : ''}`
      }

      dateKey = formatDateKey(target)
      text = text.replace(inDaysMatch[0], ' ')
    }
  }

  // 7e. Next week keyword
  if (!dateKey) {
    const nextWeekMatch = text.match(new RegExp(`\\b${datePrefixRegex}next\\s+week\\b`, 'i'))
    if (nextWeekMatch) {
      const target = new Date(now)
      target.setDate(now.getDate() + 7)
      day = 'next week'
      dateKey = formatDateKey(target)
      text = text.replace(nextWeekMatch[0], ' ')
    }
  }

  // 7f. Weekdays: e.g. "Friday", "next Monday", "by Friday", "due on Tuesday"
  if (!dateKey) {
    const weekdayRegex = new RegExp(`\\b${datePrefixRegex}(?:(this|next)\\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\b`, 'i')
    const weekdayMatch = text.match(weekdayRegex)

    if (weekdayMatch) {
      const qualifier = weekdayMatch[1]?.toLowerCase()
      const targetDayName = weekdayMatch[2].toLowerCase()
      const targetDayIdx = DAY_NAMES.indexOf(targetDayName)
      const currentDayIdx = now.getDay()

      let diff = (targetDayIdx - currentDayIdx + 7) % 7
      if (diff === 0 || qualifier === 'next') {
        diff += 7 // "next Friday" or today's day defaults to next week
      }

      const target = new Date(now)
      target.setDate(now.getDate() + diff)
      day = qualifier === 'next' ? `next ${weekdayMatch[2]}` : weekdayMatch[2]
      // Capitalize day
      day = day.charAt(0).toUpperCase() + day.slice(1)
      dateKey = formatDateKey(target)
      text = text.replace(weekdayMatch[0], ' ')
    }
  }

  if (isDeadline && dateKey) {
    deadlineKey = dateKey
  }

  // 8. Clean up trailing/leading prepositions or punctuation from cleanTitle
  let cleanTitle = text
    .replace(/\s+/g, ' ')
    .replace(/\b(due\s+on|due\s+by|due|by|on|at|for)\s*$/i, '')
    .replace(/^\s*(due\s+on|due\s+by|due|by|on|at|for)\b/i, '')
    .trim()

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
    isDeadline,
    deadlineKey,
  }
}
