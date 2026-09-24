import { supabase, isSupabaseConfigured, isGuestUserId } from './supabaseClient.js'
import { toUuid } from './idUtils.js'
import { dedupeRequest } from '../services/syncCoordinator.js'
import { classifyAndReportError } from '../services/networkStateService.js'

/**
 * Maps Supabase database row to frontend Task object.
 */
export function mapRowToTask(row, subtaskRows = []) {
  if (!row) return null

  let inMyDay = false
  let myDayDate = null
  let deadline = null
  let estimatedDuration = null
  let labels = []
  let dependencies = []
  let notes = row.notes || ''

  if (row.description && typeof row.description === 'string' && (row.description.startsWith('{"inMyDay":') || row.description.startsWith('{"nocturnMeta":'))) {
    try {
      const parsed = JSON.parse(row.description)
      if (parsed) {
        if (parsed.inMyDay === true) inMyDay = true
        if (parsed.myDayDate) myDayDate = parsed.myDayDate
        if (parsed.deadline) deadline = parsed.deadline
        if (parsed.estimatedDuration) estimatedDuration = parsed.estimatedDuration
        if (Array.isArray(parsed.labels)) labels = parsed.labels
        if (Array.isArray(parsed.dependencies)) dependencies = parsed.dependencies
        if (!notes && parsed.text) notes = parsed.text
      }
    } catch { /* ignore */ }
  } else if (row.in_my_day !== undefined) {
    inMyDay = Boolean(row.in_my_day)
    myDayDate = row.my_day_date || null
  }

  let reminder = null
  if (row.reminder_at) {
    try {
      const d = new Date(row.reminder_at)
      if (!isNaN(d.getTime())) {
        const hours = String(d.getHours()).padStart(2, '0')
        const mins = String(d.getMinutes()).padStart(2, '0')
        reminder = `${hours}:${mins}`
      }
    } catch { /* ignore */ }
  }

  return {
    id: row.id,
    userId: row.user_id,
    listId: row.list_id || 'tasks',
    title: row.title || '',
    notes: notes || (row.description && !row.description.startsWith('{') ? row.description : ''),
    completed: Boolean(row.completed),
    starred: Boolean(row.priority === 'high'),
    priority: row.priority || 'medium',
    dueDate: row.due_date ? row.due_date.split('T')[0] : null,
    deadline: deadline || null,
    estimatedDuration: Number.isFinite(Number(estimatedDuration)) ? Number(estimatedDuration) : null,
    labels: Array.isArray(labels) ? labels : [],
    dependencies: Array.isArray(dependencies) ? dependencies : [],
    myDayDate: myDayDate,
    inMyDay: inMyDay,
    reminder: reminder,
    recurrence: row.recurrence || 'none',
    position: typeof row.position === 'number' ? row.position : 0,
    subtasks: subtaskRows.map((s) => ({
      id: s.id,
      title: s.title,
      completed: Boolean(s.completed),
      position: typeof s.position === 'number' ? s.position : 0,
    })),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  }
}

/**
 * Maps frontend Task object to Supabase database row.
 * Matches exact public.tasks columns.
 */
export function mapTaskToRow(task, userId) {
  // Use the task's own UUID if it already is one; otherwise derive a stable UUID
  const validId = toUuid(task.id)

  // list_id: null for system lists (tasks / my-day / all / completed)
  const isSystemList =
    !task.listId ||
    task.listId === 'tasks' ||
    task.listId === 'my-day' ||
    task.listId === 'all' ||
    task.listId === 'completed'
  const validListId = isSystemList ? null : toUuid(task.listId)

  let reminderAt = null
  if (task.reminder) {
    if (/^\d{1,2}:\d{2}$/.test(task.reminder)) {
      const todayKey = new Date().toISOString().split('T')[0]
      const baseDate = task.dueDate || todayKey
      const d = new Date(`${baseDate}T${task.reminder}:00`)
      if (!isNaN(d.getTime())) reminderAt = d.toISOString()
    } else {
      try {
        const d = new Date(task.reminder)
        if (!isNaN(d.getTime())) reminderAt = d.toISOString()
      } catch { /* ignore */ }
    }
  }

  let dueDate = null
  if (task.dueDate) {
    try {
      const d = new Date(task.dueDate)
      if (!isNaN(d.getTime())) dueDate = d.toISOString()
    } catch { /* ignore */ }
  }

  let cleanNotes = task.notes || ''
  if (!cleanNotes && task.description && typeof task.description === 'string') {
    if (task.description.startsWith('{"inMyDay":')) {
      try {
        const parsed = JSON.parse(task.description)
        cleanNotes = parsed.text || ''
      } catch {
        cleanNotes = ''
      }
    } else {
      cleanNotes = task.description
    }
  }

  let description = cleanNotes
  const hasMeta =
    task.inMyDay ||
    task.deadline ||
    task.estimatedDuration ||
    (Array.isArray(task.labels) && task.labels.length > 0) ||
    (Array.isArray(task.dependencies) && task.dependencies.length > 0)

  if (hasMeta) {
    description = JSON.stringify({
      nocturnMeta: true,
      inMyDay: Boolean(task.inMyDay),
      myDayDate: task.myDayDate || null,
      deadline: task.deadline || null,
      estimatedDuration: task.estimatedDuration || null,
      labels: Array.isArray(task.labels) ? task.labels : [],
      dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
      text: cleanNotes,
    })
  }

  return {
    id: validId,
    user_id: userId,
    list_id: validListId,
    title: task.title || '',
    description: description,
    completed: Boolean(task.completed),
    priority: task.starred ? 'high' : (task.priority || 'medium'),
    due_date: dueDate,
    reminder_at: reminderAt,
    recurrence: task.recurrence || 'none',
    notes: cleanNotes,
    position: typeof task.position === 'number' ? task.position : 0,
    created_at: task.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/**
 * Fetches all tasks (and their subtasks) for the current user from Supabase.
 */
export async function fetchUserTasks(userId) {
  if (!isSupabaseConfigured || !supabase || isGuestUserId(userId)) return []

  return dedupeRequest(`tasks:${userId}`, async () => {
    try {
      const { data: taskData, error: taskErr } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (taskErr) {
        classifyAndReportError(taskErr)
        throw new Error(`[tasks] SELECT failed: ${taskErr.message}`)
      }

      // Fetch subtasks for this user
      const subtasksByTaskId = new Map()
      try {
        const { data: subtaskData, error: subtaskErr } = await supabase
          .from('subtasks')
          .select('*')
          .eq('user_id', userId)

        if (!subtaskErr && Array.isArray(subtaskData)) {
          for (const st of subtaskData) {
            const list = subtasksByTaskId.get(st.task_id) || []
            list.push(st)
            subtasksByTaskId.set(st.task_id, list)
          }
        } else if (subtaskErr && subtaskErr.code !== '42P01') {
          console.warn('[subtasks] SELECT notice:', subtaskErr.message)
        }
      } catch { /* subtasks table gracefully handled */ }

      return (taskData || []).map((row) =>
        mapRowToTask(row, subtasksByTaskId.get(row.id) || [])
      )
    } catch (err) {
      classifyAndReportError(err)
      throw err
    }
  })
}

/**
 * Upserts a single task (and its subtasks) to Supabase.
 * Returns the mapped task on success, null on failure.
 */
export async function upsertTaskRemote(task, userId) {
  if (!isSupabaseConfigured || !supabase || isGuestUserId(userId)) return null

  try {
    const row = mapTaskToRow(task, userId)
    const { data, error } = await supabase
      .from('tasks')
      .upsert(row, { onConflict: 'id' })
      .select()

    if (error) {
      console.error('[tasks] UPSERT failed:', {
        table: 'tasks', operation: 'UPSERT',
        recordId: row.id, listId: row.list_id, userId,
        code: error.code, message: error.message,
        details: error.details, hint: error.hint,
      })
      return null
    }

    // Sync subtasks
    if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      try {
        const subtaskRows = task.subtasks.map((st, index) => ({
          id: toUuid(st.id),
          task_id: row.id,
          user_id: userId,
          title: st.title || '',
          completed: Boolean(st.completed),
          position: typeof st.position === 'number' ? st.position : index,
          created_at: st.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
        const { error: subErr } = await supabase
          .from('subtasks')
          .upsert(subtaskRows, { onConflict: 'id' })

        if (subErr && subErr.code !== '42P01') {
          console.warn('[subtasks] UPSERT notice:', subErr.message)
        }
      } catch { /* subtasks table gracefully handled */ }
    }

    return mapRowToTask(data?.[0], task.subtasks || [])
  } catch (err) {
    console.error('[tasks] UPSERT exception:', err)
    return null
  }
}

/**
 * Deletes a task from Supabase.
 */
export async function deleteTaskRemote(taskId, userId) {
  if (!isSupabaseConfigured || !supabase || isGuestUserId(userId)) return false

  try {
    const validId = toUuid(taskId)
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', validId)
      .eq('user_id', userId)

    if (error) {
      console.error('[tasks] DELETE failed:', {
        table: 'tasks', operation: 'DELETE',
        recordId: validId, userId,
        code: error.code, message: error.message,
        details: error.details, hint: error.hint,
      })
      return false
    }
    return true
  } catch (err) {
    console.error('[tasks] DELETE exception:', err)
    return false
  }
}

/**
 * Upserts a single subtask to Supabase.
 */
export async function upsertSubtaskRemote(subtask, taskId, userId, position = 0) {
  if (!isSupabaseConfigured || !supabase || isGuestUserId(userId)) return null

  try {
    const row = {
      id: toUuid(subtask.id),
      task_id: toUuid(taskId),
      user_id: userId,
      title: subtask.title || '',
      completed: Boolean(subtask.completed),
      position: typeof position === 'number' ? position : 0,
      created_at: subtask.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('subtasks')
      .upsert(row, { onConflict: 'id' })
      .select()

    if (error && error.code !== '42P01') {
      console.error('[subtasks] UPSERT failed:', {
        table: 'subtasks', operation: 'UPSERT',
        recordId: row.id, taskId: row.task_id, userId,
        code: error.code, message: error.message,
        details: error.details, hint: error.hint,
      })
      return null
    }
    return data?.[0] || null
  } catch (err) {
    console.error('[subtasks] UPSERT exception:', err)
    return null
  }
}

/**
 * Deletes a subtask from Supabase.
 */
export async function deleteSubtaskRemote(subtaskId, userId) {
  if (!isSupabaseConfigured || !supabase || isGuestUserId(userId)) return false

  try {
    const validId = toUuid(subtaskId)
    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', validId)
      .eq('user_id', userId)

    if (error && error.code !== '42P01') {
      console.error('[subtasks] DELETE failed:', {
        table: 'subtasks', operation: 'DELETE',
        recordId: validId, userId,
        code: error.code, message: error.message,
        details: error.details, hint: error.hint,
      })
      return false
    }
    return true
  } catch (err) {
    console.error('[subtasks] DELETE exception:', err)
    return false
  }
}
