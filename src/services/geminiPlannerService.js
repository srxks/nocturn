import { supabase } from '../lib/supabase.js'

export const GEMINI_MODEL = 'gemini-3.6-flash'

/**
 * Validates and normalizes Gemini Plan My Day response structure.
 */
export function validatePlanResponse(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, plan: null, error: 'Invalid plan response format' }
  }

  const summary = typeof data.summary === 'string' && data.summary.trim()
    ? data.summary.trim()
    : 'Custom daily focus and activity plan.'

  // Recommended timer settings
  const rt = data.recommendedTimer || {}
  const focusDuration = Math.max(15, Number(rt.focusDuration) || 50)
  const shortBreakDuration = Math.max(3, Number(rt.shortBreakDuration) || 10)
  const longBreakDuration = Math.max(10, Number(rt.longBreakDuration) || 20)
  const sessions = Math.max(1, Number(rt.sessions) || 4)

  const recommendedTimer = {
    focusDuration,
    shortBreakDuration,
    longBreakDuration,
    sessions,
  }

  // Time blocks
  const rawBlocks = Array.isArray(data.blocks) ? data.blocks : []
  const blocks = []

  let autoStartHour = 9
  let autoStartMin = 0

  for (let i = 0; i < rawBlocks.length; i++) {
    const b = rawBlocks[i]
    if (!b || typeof b !== 'object') continue

    const title = typeof b.title === 'string' && b.title.trim() ? b.title.trim() : ('Activity ' + (i + 1))
    const durationMinutes = Math.max(5, Number(b.durationMinutes) || Number(b.duration) || 30)

    let startTime = typeof b.startTime === 'string' && b.startTime.includes(':')
      ? b.startTime.trim()
      : (String(autoStartHour).padStart(2, '0') + ':' + String(autoStartMin).padStart(2, '0'))

    // Derive end time if missing
    let endTime = typeof b.endTime === 'string' && b.endTime.includes(':') ? b.endTime.trim() : null
    if (!endTime && startTime) {
      const [sh, sm] = startTime.split(':').map(Number)
      const totalMins = (isNaN(sh) ? 9 : sh) * 60 + (isNaN(sm) ? 0 : sm) + durationMinutes
      const eh = Math.floor(totalMins / 60) % 24
      const em = totalMins % 60
      endTime = String(eh).padStart(2, '0') + ':' + String(em).padStart(2, '0')
    }

    // Advance auto time
    const [eh, em] = (endTime || '10:00').split(':').map(Number)
    autoStartHour = isNaN(eh) ? 10 : eh
    autoStartMin = isNaN(em) ? 0 : em

    let type = 'task'
    if (b.type === 'focus' || b.type === 'break' || b.type === 'event') {
      type = b.type
    } else if (title.toLowerCase().includes('break') || title.toLowerCase().includes('lunch') || title.toLowerCase().includes('rest')) {
      type = 'break'
    } else if (title.toLowerCase().includes('study') || title.toLowerCase().includes('focus') || title.toLowerCase().includes('project') || title.toLowerCase().includes('dsa') || title.toLowerCase().includes('code')) {
      type = 'focus'
    } else if (title.toLowerCase().includes('class') || title.toLowerCase().includes('meeting') || title.toLowerCase().includes('gym')) {
      type = 'event'
    }

    const isExisting = Boolean(b.isExisting || b.taskId)
    const taskId = b.taskId || null
    const priority = ['high', 'medium', 'low'].includes(b.priority) ? b.priority : 'medium'
    const notes = typeof b.notes === 'string' ? b.notes.trim() : ''

    blocks.push({
      id: b.id || ('block-' + Date.now() + '-' + i),
      title,
      startTime,
      endTime: endTime || '10:00',
      durationMinutes,
      type,
      isExisting,
      taskId,
      priority,
      notes,
    })
  }

  // Suggested new tasks
  const rawTasks = Array.isArray(data.suggestedNewTasks) ? data.suggestedNewTasks : []
  const suggestedNewTasks = []

  for (const t of rawTasks) {
    if (t && typeof t.title === 'string' && t.title.trim()) {
      suggestedNewTasks.push({
        title: t.title.trim(),
        priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
        estimatedMinutes: Math.max(5, Number(t.estimatedMinutes) || 30),
      })
    }
  }

  // Also include any new tasks from blocks that are not existing and not in suggestedNewTasks
  for (const b of blocks) {
    if (b.type !== 'break' && b.type !== 'event' && !b.isExisting && !b.taskId) {
      if (!suggestedNewTasks.some((t) => t.title.toLowerCase() === b.title.toLowerCase())) {
        suggestedNewTasks.push({
          title: b.title,
          priority: b.priority || 'medium',
          estimatedMinutes: b.durationMinutes || 30,
        })
      }
    }
  }

  return {
    valid: blocks.length > 0,
    plan: {
      summary,
      recommendedTimer,
      blocks,
      suggestedNewTasks,
    },
  }
}

/**
 * Intelligent Rule-Based Offline Fallback Planner
 * Generates an organized schedule when internet or AI service is unavailable.
 */
export function generateOfflinePlan(userPrompt = '', existingTasks = [], currentTime = new Date()) {
  const promptLower = userPrompt.toLowerCase()
  const blocks = []
  const suggestedNewTasks = []

  let currentMinutes = currentTime.getHours() * 60 + Math.ceil(currentTime.getMinutes() / 15) * 15
  if (currentMinutes < 9 * 60) currentMinutes = 9 * 60

  const formatTime = (mins) => {
    const h = Math.floor(mins / 60) % 24
    const m = mins % 60
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
  }

  // 1. Check for fixed events mentioned in prompt (e.g. class 9 to 2, gym at 6)
  if (promptLower.includes('class') || promptLower.includes('lecture')) {
    const start = 9 * 60
    const end = 14 * 60
    blocks.push({
      id: 'event-class-' + Date.now(),
      title: 'Attend Classes / Lectures',
      startTime: formatTime(start),
      endTime: formatTime(end),
      durationMinutes: 300,
      type: 'event',
      isExisting: false,
      priority: 'high',
      notes: 'Scheduled academic block',
    })
    currentMinutes = Math.max(currentMinutes, end)
  }

  // Lunch break after morning / class
  if (currentMinutes >= 13 * 60 && currentMinutes <= 15 * 60) {
    const lunchStart = currentMinutes
    const lunchEnd = lunchStart + 45
    blocks.push({
      id: 'break-lunch-' + Date.now(),
      title: 'Lunch & Rest Break',
      startTime: formatTime(lunchStart),
      endTime: formatTime(lunchEnd),
      durationMinutes: 45,
      type: 'break',
      isExisting: false,
      priority: 'low',
    })
    currentMinutes = lunchEnd
  }

  // 2. Schedule existing incomplete tasks
  const relevantExisting = existingTasks.filter((t) => !t.completed).slice(0, 4)
  for (let i = 0; i < relevantExisting.length; i++) {
    const task = relevantExisting[i]
    const dur = 50
    const start = currentMinutes
    const end = start + dur

    blocks.push({
      id: 'block-exist-' + task.id,
      title: task.title,
      startTime: formatTime(start),
      endTime: formatTime(end),
      durationMinutes: dur,
      type: 'focus',
      isExisting: true,
      taskId: task.id,
      priority: task.priority || 'medium',
      notes: task.description || '',
    })
    currentMinutes = end

    // Add short break after focus block
    if (i < relevantExisting.length - 1) {
      blocks.push({
        id: 'break-short-' + Date.now() + '-' + i,
        title: 'Short Break',
        startTime: formatTime(currentMinutes),
        endTime: formatTime(currentMinutes + 10),
        durationMinutes: 10,
        type: 'break',
        isExisting: false,
        priority: 'low',
      })
      currentMinutes += 10
    }
  }

  // 3. Detect prompt items not in existing tasks
  const promptKeywords = [
    { key: 'dsa', title: 'Study DSA (Data Structures & Algorithms)', dur: 60, type: 'focus', prio: 'high' },
    { key: 'project', title: 'Work on Project Development', dur: 75, type: 'focus', prio: 'high' },
    { key: 'vocab', title: 'Daily GRE Vocabulary Revision', dur: 30, type: 'task', prio: 'medium' },
    { key: 'assignment', title: 'Complete Today Assignments', dur: 45, type: 'task', prio: 'medium' },
    { key: 'gym', title: 'Workout / Gym Session', dur: 60, type: 'event', prio: 'medium' },
  ]

  for (const item of promptKeywords) {
    if (promptLower.includes(item.key) && !blocks.some((b) => b.title.toLowerCase().includes(item.key))) {
      let itemStart = currentMinutes
      if (item.key === 'gym' && (promptLower.includes('gym at 6') || promptLower.includes('gym at 18'))) {
        itemStart = 18 * 60
      }
      const itemEnd = itemStart + item.dur

      blocks.push({
        id: 'block-new-' + Date.now() + '-' + item.key,
        title: item.title,
        startTime: formatTime(itemStart),
        endTime: formatTime(itemEnd),
        durationMinutes: item.dur,
        type: item.type,
        isExisting: false,
        taskId: null,
        priority: item.prio,
      })

      if (item.type !== 'event') {
        suggestedNewTasks.push({
          title: item.title,
          priority: item.prio,
          estimatedMinutes: item.dur,
        })
      }

      currentMinutes = Math.max(currentMinutes, itemEnd)
    }
  }

  // Sort blocks chronologically
  blocks.sort((a, b) => {
    const [ha, ma] = a.startTime.split(':').map(Number)
    const [hb, mb] = b.startTime.split(':').map(Number)
    return (ha * 60 + ma) - (hb * 60 + mb)
  })

  return {
    summary: 'Productivity plan with scheduled commitments, focused deep-work blocks, and recovery.',
    recommendedTimer: {
      focusDuration: 50,
      shortBreakDuration: 10,
      longBreakDuration: 20,
      sessions: 4,
    },
    blocks,
    suggestedNewTasks,
  }
}

/**
 * Generates an intelligent daily plan using Gemini server-side layer with robust fallbacks.
 */
export async function generateDailyPlan({ userPrompt = '', existingTasks = [], currentTime = new Date() }) {
  const timeStr = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  const todayStr = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  const cleanExistingTasks = (existingTasks || [])
    .filter((t) => !t.completed)
    .slice(0, 15)
    .map((t) => ({ id: t.id, title: t.title, priority: t.priority || 'medium' }))

  const existingText = cleanExistingTasks.length > 0
    ? JSON.stringify(cleanExistingTasks, null, 2)
    : 'None currently scheduled.'

  const promptText = `You are Nocturn AI, an expert productivity planner.
Current time: ${timeStr}
Today: ${todayStr}

Existing user tasks (schedule these alongside user requirements; preserve their exact taskId and set isExisting: true):
${existingText}

User daily planning request:
"${userPrompt || 'Plan an efficient focus schedule for today'}"

Generate a realistic, time-blocked daily schedule that balances productivity, focus, and recovery.
Requirements:
1. Schedule sequential time blocks starting from the current time or morning through evening.
2. Distinctly categorize each block type:
   - "focus": deep work, study, intense tasks
   - "task": routine tasks, homework, revision
   - "break": lunch, rest, walking, recovery
   - "event": classes, meetings, gym, commutes
3. For existing tasks scheduled, preserve their exact taskId and set isExisting: true.
4. For newly proposed tasks from the user prompt that are not in existing tasks, set isExisting: false, taskId: null, AND list them in suggestedNewTasks.
5. Provide a realistic focus structure recommendation in recommendedTimer:
   - focusDuration (minutes, e.g. 50, 60, 25, 90)
   - shortBreakDuration (minutes, e.g. 10, 5)
   - longBreakDuration (minutes, e.g. 20, 15)
   - sessions (number of focus cycles, e.g. 4, 2)

Return ONLY a valid JSON object with keys:
{
  "summary": "Concise overview sentence of the plan",
  "recommendedTimer": { "focusDuration": 50, "shortBreakDuration": 10, "longBreakDuration": 20, "sessions": 4 },
  "blocks": [
    { "id": "b1", "title": "...", "startTime": "09:00", "endTime": "10:00", "durationMinutes": 60, "type": "focus", "isExisting": false, "taskId": null, "priority": "high", "notes": "" }
  ],
  "suggestedNewTasks": [
    { "title": "...", "priority": "high", "estimatedMinutes": 60 }
  ]
}`

  // 1. Try Supabase Edge Function 'generate-plan'
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('generate-plan', {
        body: {
          prompt: promptText,
          model: GEMINI_MODEL,
          existingTasks: cleanExistingTasks,
          userPrompt,
        },
      })
      if (!error && data?.plan) {
        const validation = validatePlanResponse(data.plan)
        if (validation.valid) return validation.plan
      }
    } catch {
      // Continue to API fallback
    }
  }

  // 2. Call backend proxy endpoint /api/plan-day
  const apiEndpoint = '/api/plan-day'
  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptText,
        model: GEMINI_MODEL,
        existingTasks: cleanExistingTasks,
        userPrompt,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      const rawPlan = data.plan || data
      const validation = validatePlanResponse(rawPlan)
      if (validation.valid) return validation.plan
    }
  } catch {
    // Edge function / server proxy unavailable
  }

  // 3. Fallback to intelligent rule-based offline plan
  return generateOfflinePlan(userPrompt, existingTasks, currentTime)
}
