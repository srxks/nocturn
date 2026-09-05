import { db } from '../db/db'
import { formatDateKey } from './calendarService'

const todayKey = formatDateKey(new Date())

export async function getTasks() {
  try {
    return await db.tasks.toArray()
  } catch (err) {
    console.error('taskService.getTasks failed:', err)
    return []
  }
}

export async function createTask(
  title,
  listId = 'tasks',
  dueDate = null,
  priority = 'medium',
  starred = false
) {
  try {
    const isMyDayList = listId === 'my-day'
    const actualListId =
      isMyDayList || listId === 'all' || listId === 'completed' ? 'tasks' : listId

    const resolvedDueDate = dueDate || (isMyDayList ? todayKey : null)
    const isDueToday = resolvedDueDate === todayKey
    const myDayDate = isMyDayList || isDueToday ? todayKey : null

    const newTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      completed: false,
      listId: actualListId,
      dueDate: resolvedDueDate,
      myDayDate: myDayDate,
      inMyDay: Boolean(myDayDate || isDueToday),
      reminder: null,
      recurrence: 'none',
      priority,
      starred: starred || false,
      notes: '',
      subtasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.tasks.add(newTask)
    return newTask
  } catch (err) {
    console.error('taskService.createTask failed:', err)
    throw err
  }
}

export async function updateTask(id, fields) {
  try {
    const target = await db.tasks.get(id)
    if (!target) return null

    let updatedFields = { ...fields, updatedAt: new Date().toISOString() }

    if (fields.inMyDay !== undefined) {
      updatedFields.myDayDate = fields.inMyDay ? todayKey : null
    }

    await db.tasks.update(id, updatedFields)
    return { ...target, ...updatedFields }
  } catch (err) {
    console.error('taskService.updateTask failed:', err)
    throw err
  }
}

export async function deleteTask(id) {
  try {
    await db.tasks.delete(id)
    return true
  } catch (err) {
    console.error('taskService.deleteTask failed:', err)
    throw err
  }
}

export async function deleteMultipleTasks(ids = []) {
  try {
    if (ids.length > 0) {
      await db.tasks.bulkDelete(ids)
    }
    return ids.length
  } catch (err) {
    console.error('taskService.deleteMultipleTasks failed:', err)
    throw err
  }
}
