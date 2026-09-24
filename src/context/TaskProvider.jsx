import { useEffect, useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ensureSeedData } from '../db/db'
import { TaskContext } from './TaskContext'
import { formatDateKey } from '../services/calendarService'
import { useAuth } from './useAuth'
import { upsertTaskRemote, deleteTaskRemote, upsertSubtaskRemote, deleteSubtaskRemote, mapTaskToRow } from '../lib/tasks'
import { upsertListRemote, deleteListRemote, mapListToRow } from '../lib/lists'
import { isRealtimeWrite } from '../services/realtimeService'
import { recordTombstone, clearTombstone } from '../services/conflictService'
import { enqueueMutation } from '../services/syncQueue'
import { toUuid } from '../lib/idUtils'
import { syncTaskReminders, cancelTaskReminder } from '../services/notificationService'
import { playTaskCompleteSound } from '../services/soundService'
import { useToast } from './useToast'

const todayKey = formatDateKey(new Date())

function calculateNextRecurrenceDate(currentDateStr, recurrence) {
  const baseDate = currentDateStr ? new Date(currentDateStr + 'T00:00:00') : new Date()
  const date = isNaN(baseDate.getTime()) ? new Date() : baseDate

  if (recurrence === 'daily') {
    date.setDate(date.getDate() + 1)
  } else if (recurrence === 'weekly') {
    date.setDate(date.getDate() + 7)
  } else if (recurrence === 'monthly') {
    date.setMonth(date.getMonth() + 1)
  }
  return formatDateKey(date)
}

export function TaskProvider({ children }) {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [activeListId, setActiveListId] = useState('my-day')
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState([])

  useEffect(() => {
    ensureSeedData()
  }, [])

  // NOTE: Initial cloud sync and realtime subscriptions are handled centrally
  // by AuthProvider and syncCoordinator. Dexie is the local reactive source of truth,
  // watched below via useLiveQuery. No duplicate REST fetches are needed here.

  // Dexie live queries — auto-update whenever Dexie data changes (local OR realtime)
  const liveTasks = useLiveQuery(async () => {
    const all = await db.tasks.toArray()
    if (user?.id) {
      return all.filter((t) => !t.userId || t.userId === user.id)
    }
    return all
  }, [user?.id])

  const liveLists = useLiveQuery(async () => {
    const all = await db.lists.toArray()
    if (user?.id) {
      return all.filter((l) => !l.userId || l.userId === user.id)
    }
    return all
  }, [user?.id])

  const tasks = useMemo(() => liveTasks || [], [liveTasks])
  const lists = useMemo(() => liveLists || [], [liveLists])
  const isLoading = liveTasks === undefined || liveLists === undefined

  // Derived selected task object
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) || null : null
  const setSelectedTask = (taskOrNull) => {
    if (!taskOrNull) {
      setSelectedTaskId(null)
    } else {
      setSelectedTaskId(taskOrNull.id)
    }
  }

  // Synchronize scheduled notifications for active task reminders
  useEffect(() => {
    syncTaskReminders(tasks)
  }, [tasks])

  // Helper: skip outbound Supabase call when the Dexie write came from realtime
  const shouldSkipRemote = () => isRealtimeWrite()

  // 1. Task Operations
  const addTask = async (
    title,
    listId = 'tasks',
    dueDate = null,
    priority = 'medium',
    starred = false,
    inMyDayOverride = null,
    source = 'user',
    reminder = null,
    extraFields = {}
  ) => {
    const isMyDayList = listId === 'my-day'
    const actualListId =
      isMyDayList || listId === 'all' || listId === 'completed' || listId === 'upcoming'
        ? 'tasks'
        : listId

    // Strictly ONLY tasks explicitly created in / added to My Day belong in My Day.
    // Having a due date (today, tomorrow, etc.) does NOT automatically put it in My Day.
    const shouldBeInMyDay = inMyDayOverride !== null ? Boolean(inMyDayOverride) : isMyDayList
    const myDayDate = shouldBeInMyDay ? todayKey : null

    const resolvedPriority = starred ? 'high' : priority

    const newTask = {
      id: crypto.randomUUID(),
      userId: user?.id || null,
      title,
      completed: false,
      listId: actualListId,
      dueDate: dueDate || null,
      deadline: extraFields.deadline || null,
      estimatedDuration: Number.isFinite(Number(extraFields.estimatedDuration)) ? Number(extraFields.estimatedDuration) : null,
      labels: Array.isArray(extraFields.labels) ? extraFields.labels : [],
      dependencies: Array.isArray(extraFields.dependencies) ? extraFields.dependencies : [],
      myDayDate: myDayDate,
      inMyDay: shouldBeInMyDay,
      source: source || 'user',
      reminder: reminder || null,
      recurrence: extraFields.recurrence || 'none',
      priority: resolvedPriority,
      starred: Boolean(starred || resolvedPriority === 'high'),
      notes: extraFields.notes || '',
      subtasks: Array.isArray(extraFields.subtasks) ? extraFields.subtasks : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.tasks.add(newTask)

    if (user?.id && !shouldSkipRemote()) {
      // Ensure parent list exists remotely before task upsert (FK constraint)
      if (actualListId && actualListId !== 'tasks') {
        const parentList = await db.lists.get(actualListId)
        if (parentList && !parentList.system) {
          const listRes = await upsertListRemote(parentList, user.id)
          if (!listRes) {
            console.error('[TaskProvider] Parent task list failed to sync:', actualListId)
            const listRow = mapListToRow(parentList, user.id)
            if (listRow) enqueueMutation('upsert', 'task_lists', listRow)
          }
        }
      }

      const res = await upsertTaskRemote(newTask, user.id)
      if (!res) {
        const row = mapTaskToRow(newTask, user.id)
        if (row) enqueueMutation('upsert', 'tasks', row)
      }
    }

    return newTask
  }

  const completeTaskFromTimer = async (id) => {
    if (!id) return null
    const target = await db.tasks.get(id)
    if (!target) return null
    if (target.completed) return target

    cancelTaskReminder(id)
    const updatedFields = {
      completed: true,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const updatedTask = { ...target, ...updatedFields }
    await db.tasks.update(id, updatedFields)

    if (user?.id && !shouldSkipRemote()) {
      const res = await upsertTaskRemote(updatedTask, user.id)
      if (!res) {
        const row = mapTaskToRow(updatedTask, user.id)
        if (row) enqueueMutation('upsert', 'tasks', row)
      }
    }
    return updatedTask
  }

  const updateTask = async (id, fields) => {
    const target = await db.tasks.get(id)
    if (!target) return

    let updatedFields = { ...fields, updatedAt: new Date().toISOString() }

    if (fields.priority !== undefined) {
      updatedFields.starred = fields.priority === 'high'
    } else if (fields.starred !== undefined) {
      updatedFields.priority = fields.starred ? 'high' : (target.priority === 'high' ? 'medium' : target.priority)
    }

    if (fields.inMyDay !== undefined) {
      updatedFields.myDayDate = fields.inMyDay ? todayKey : null
    }

    const updatedTask = { ...target, ...updatedFields }
    await db.tasks.update(id, updatedFields)

    if (user?.id && !shouldSkipRemote()) {
      const res = await upsertTaskRemote(updatedTask, user.id)
      if (!res) {
        const row = mapTaskToRow(updatedTask, user.id)
        if (row) enqueueMutation('upsert', 'tasks', row)
      }
    }
  }

  const toggleTask = async (id) => {
    const target = await db.tasks.get(id)
    if (!target) return

    const willBeCompleted = !target.completed
    if (willBeCompleted) {
      cancelTaskReminder(id)
    }
    const isRecurring = target.recurrence && target.recurrence !== 'none'
    const shouldGenerateNext = willBeCompleted && isRecurring && !target.hasGeneratedNext

    const updatedFields = {
      completed: willBeCompleted,
      hasGeneratedNext: willBeCompleted ? true : target.hasGeneratedNext,
      updatedAt: new Date().toISOString(),
    }

    const updatedTask = { ...target, ...updatedFields }
    await db.tasks.update(id, updatedFields)

    if (user?.id && !shouldSkipRemote()) {
      const res = await upsertTaskRemote(updatedTask, user.id)
      if (!res) {
        const row = mapTaskToRow(updatedTask, user.id)
        if (row) enqueueMutation('upsert', 'tasks', row)
      }
    }

    if (willBeCompleted) {
      playTaskCompleteSound()
      addToast(`Completed "${target.title}"`, {
        type: 'success',
        duration: 4500,
        action: {
          label: 'Undo',
          onClick: () => toggleTask(id),
        },
      })
    }

    if (shouldGenerateNext) {
      const nextDueDateKey = calculateNextRecurrenceDate(target.dueDate || todayKey, target.recurrence)
      const isNextDueToday = nextDueDateKey === todayKey
      const newOccurrence = {
        ...target,
        id: crypto.randomUUID(),
        completed: false,
        hasGeneratedNext: false,
        dueDate: nextDueDateKey,
        myDayDate: isNextDueToday ? todayKey : null,
        inMyDay: isNextDueToday,
        subtasks: target.subtasks ? target.subtasks.map((s) => ({ ...s, completed: false })) : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await db.tasks.add(newOccurrence)

      if (user?.id && !shouldSkipRemote()) {
        const resOcc = await upsertTaskRemote(newOccurrence, user.id)
        if (!resOcc) {
          const row = mapTaskToRow(newOccurrence, user.id)
          if (row) enqueueMutation('upsert', 'tasks', row)
        }
      }
    }
  }

  const toggleStar = async (id) => {
    const target = await db.tasks.get(id)
    if (!target) return
    const nextStarred = !target.starred
    const updatedFields = {
      starred: nextStarred,
      priority: nextStarred ? 'high' : (target.priority === 'high' ? 'medium' : target.priority),
      updatedAt: new Date().toISOString(),
    }
    const updatedTask = { ...target, ...updatedFields }
    await db.tasks.update(id, updatedFields)

    if (user?.id && !shouldSkipRemote()) {
      const res = await upsertTaskRemote(updatedTask, user.id)
      if (!res) {
        const row = mapTaskToRow(updatedTask, user.id)
        if (row) enqueueMutation('upsert', 'tasks', row)
      }
    }
  }

  const toggleMyDay = async (id) => {
    const target = await db.tasks.get(id)
    if (!target) return
    const nextInMyDay = !(target.inMyDay || target.myDayDate === todayKey)
    const updatedFields = {
      inMyDay: nextInMyDay,
      myDayDate: nextInMyDay ? todayKey : null,
      updatedAt: new Date().toISOString(),
    }
    const updatedTask = { ...target, ...updatedFields }
    await db.tasks.update(id, updatedFields)

    if (user?.id && !shouldSkipRemote()) {
      const res = await upsertTaskRemote(updatedTask, user.id)
      if (!res) {
        const row = mapTaskToRow(updatedTask, user.id)
        if (row) enqueueMutation('upsert', 'tasks', row)
      }
    }
  }

  const editTask = async (id, newTitle) => {
    await updateTask(id, { title: newTitle })
  }

  const restoreTask = async (taskSnapshot) => {
    if (!taskSnapshot || !taskSnapshot.id) return
    try {
      await clearTombstone('tasks', taskSnapshot.id)
      await db.tasks.put(taskSnapshot)

      if (user?.id && !shouldSkipRemote()) {
        const res = await upsertTaskRemote(taskSnapshot, user.id)
        if (!res) {
          const row = mapTaskToRow(taskSnapshot, user.id)
          if (row) enqueueMutation('upsert', 'tasks', row)
        }
      }

      addToast(`Restored "${taskSnapshot.title}"`, 'success', 3000)
    } catch (err) {
      console.warn('[TaskProvider] Failed to restore task:', err)
      addToast('Failed to restore task', 'error', 3000)
    }
  }

  const deleteTask = async (id, showToastWithUndo = true) => {
    if (selectedTaskId === id) {
      setSelectedTaskId(null)
    }
    cancelTaskReminder(id)

    const target = await db.tasks.get(id)

    await db.tasks.delete(id)
    if (user?.id) {
      await recordTombstone('tasks', id, user.id)
    }

    if (user?.id && !shouldSkipRemote()) {
      const ok = await deleteTaskRemote(id, user.id)
      if (!ok) {
        enqueueMutation('delete', 'tasks', { id })
      }
    }

    if (target && showToastWithUndo) {
      addToast(`Deleted "${target.title}"`, {
        type: 'info',
        duration: 6000,
        action: {
          label: 'Undo',
          onClick: () => restoreTask(target),
        },
      })
    }
  }

  // 2. Subtask Operations
  const addSubtask = async (taskId, title) => {
    if (!title.trim()) return
    const target = await db.tasks.get(taskId)
    if (!target) return

    const newSub = {
      id: crypto.randomUUID(),
      title: title.trim(),
      completed: false,
    }
    const updatedSubtasks = [...(target.subtasks || []), newSub]

    const updatedTask = {
      ...target,
      subtasks: updatedSubtasks,
      updatedAt: new Date().toISOString(),
    }

    await db.tasks.update(taskId, {
      subtasks: updatedSubtasks,
      updatedAt: new Date().toISOString(),
    })

    if (user?.id && !shouldSkipRemote()) {
      const resTask = await upsertTaskRemote(updatedTask, user.id)
      if (!resTask) {
        const row = mapTaskToRow(updatedTask, user.id)
        if (row) enqueueMutation('upsert', 'tasks', row)
      }
      const resSub = await upsertSubtaskRemote(newSub, taskId, user.id)
      if (!resSub) {
        enqueueMutation('upsert', 'subtasks', {
          id: toUuid(newSub.id),
          task_id: toUuid(taskId),
          user_id: user.id,
          title: newSub.title || '',
          completed: false,
          position: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }
  }

  const toggleSubtask = async (taskId, subtaskId) => {
    const target = await db.tasks.get(taskId)
    if (!target || !target.subtasks) return

    const targetSub = target.subtasks.find((s) => s.id === subtaskId)
    const updatedSubtasks = target.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    )

    const updatedTask = {
      ...target,
      subtasks: updatedSubtasks,
      updatedAt: new Date().toISOString(),
    }

    await db.tasks.update(taskId, {
      subtasks: updatedSubtasks,
      updatedAt: new Date().toISOString(),
    })

    if (user?.id && !shouldSkipRemote()) {
      const resTask = await upsertTaskRemote(updatedTask, user.id)
      if (!resTask) {
        const row = mapTaskToRow(updatedTask, user.id)
        if (row) enqueueMutation('upsert', 'tasks', row)
      }
      if (targetSub) {
        const resSub = await upsertSubtaskRemote({ ...targetSub, completed: !targetSub.completed }, taskId, user.id)
        if (!resSub) {
          enqueueMutation('upsert', 'subtasks', {
            id: toUuid(targetSub.id),
            task_id: toUuid(taskId),
            user_id: user.id,
            title: targetSub.title || '',
            completed: !targetSub.completed,
            position: typeof targetSub.position === 'number' ? targetSub.position : 0,
            created_at: targetSub.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }
      }
    }
  }

  const deleteSubtask = async (taskId, subtaskId) => {
    const target = await db.tasks.get(taskId)
    if (!target || !target.subtasks) return

    const updatedSubtasks = target.subtasks.filter((s) => s.id !== subtaskId)
    const updatedTask = {
      ...target,
      subtasks: updatedSubtasks,
      updatedAt: new Date().toISOString(),
    }

    await db.tasks.update(taskId, {
      subtasks: updatedSubtasks,
      updatedAt: new Date().toISOString(),
    })

    if (user?.id) {
      await recordTombstone('subtasks', subtaskId, user.id)
    }

    if (user?.id && !shouldSkipRemote()) {
      const resTask = await upsertTaskRemote(updatedTask, user.id)
      if (!resTask) {
        const row = mapTaskToRow(updatedTask, user.id)
        if (row) enqueueMutation('upsert', 'tasks', row)
      }
      const okSub = await deleteSubtaskRemote(subtaskId, user.id)
      if (!okSub) {
        enqueueMutation('delete', 'subtasks', { id: subtaskId })
      }
    }
  }

  // 3. List Operations
  const createList = async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    const newList = {
      id: crypto.randomUUID(),
      userId: user?.id || null,
      name: trimmed,
      system: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await db.lists.add(newList)
    setActiveListId(newList.id)

    if (user?.id && !shouldSkipRemote()) {
      const res = await upsertListRemote(newList, user.id)
      if (!res) {
        const row = mapListToRow(newList, user.id)
        if (row) enqueueMutation('upsert', 'task_lists', row)
      }
    }
    return newList.id
  }

  const renameList = async (id, newName) => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const target = await db.lists.get(id)
    if (!target || target.system) return

    const updatedList = { ...target, name: trimmed, updatedAt: new Date().toISOString() }
    await db.lists.update(id, { name: trimmed, updatedAt: new Date().toISOString() })

    if (user?.id && !shouldSkipRemote()) {
      const res = await upsertListRemote(updatedList, user.id)
      if (!res) {
        const row = mapListToRow(updatedList, user.id)
        if (row) enqueueMutation('upsert', 'task_lists', row)
      }
    }
  }

  const deleteList = async (id) => {
    const target = await db.lists.get(id)
    if (!target || target.system) return

    const listTasks = await db.tasks.where('listId').equals(id).toArray()
    for (const t of listTasks) {
      const updated = { ...t, listId: 'tasks', updatedAt: new Date().toISOString() }
      await db.tasks.update(t.id, { listId: 'tasks', updatedAt: new Date().toISOString() })
      if (user?.id && !shouldSkipRemote()) {
        const res = await upsertTaskRemote(updated, user.id)
        if (!res) {
          const row = mapTaskToRow(updated, user.id)
          if (row) enqueueMutation('upsert', 'tasks', row)
        }
      }
    }

    await db.lists.delete(id)
    if (user?.id) {
      await recordTombstone('task_lists', id, user.id)
    }

    if (user?.id && !shouldSkipRemote()) {
      const ok = await deleteListRemote(id, user.id)
      if (!ok) {
        enqueueMutation('delete', 'task_lists', { id })
      }
    }
    if (activeListId === id) {
      setActiveListId('tasks')
    }
  }

  // 4. Bulk Task Operations
  const clearCompleted = async (listId) => {
    let toDelete
    if (listId === 'my-day') {
      toDelete = tasks.filter(
        (t) => t.completed && (t.inMyDay || t.dueDate === todayKey || t.myDayDate === todayKey)
      )
    } else if (listId === 'all' || listId === 'completed') {
      toDelete = tasks.filter((t) => t.completed)
    } else {
      toDelete = tasks.filter((t) => t.completed && t.listId === listId)
    }

    const ids = toDelete.map((t) => t.id)
    if (ids.length === 0) return 0

    if (selectedTaskId && ids.includes(selectedTaskId)) {
      setSelectedTaskId(null)
    }
    await db.tasks.bulkDelete(ids)

    for (const id of ids) {
      cancelTaskReminder(id)
      if (user?.id) {
        await recordTombstone('tasks', id, user.id)
      }
      if (user?.id && !shouldSkipRemote()) {
        const ok = await deleteTaskRemote(id, user.id)
        if (!ok) {
          enqueueMutation('delete', 'tasks', { id })
        }
      }
    }
    return ids.length
  }

  const clearList = async (listId) => {
    if (listId === 'my-day') {
      const myDayTasks = tasks.filter((t) => t.inMyDay || t.myDayDate === todayKey)
      for (const t of myDayTasks) {
        const updated = { ...t, inMyDay: false, myDayDate: null, updatedAt: new Date().toISOString() }
        await db.tasks.update(t.id, {
          inMyDay: false,
          myDayDate: null,
          updatedAt: new Date().toISOString(),
        })
        if (user?.id && !shouldSkipRemote()) {
          const res = await upsertTaskRemote(updated, user.id)
          if (!res) {
            const row = mapTaskToRow(updated, user.id)
            if (row) enqueueMutation('upsert', 'tasks', row)
          }
        }
      }
      return myDayTasks.length
    }

    let toDelete
    if (listId === 'all' || listId === 'completed') {
      toDelete = tasks
    } else {
      toDelete = tasks.filter((t) => t.listId === listId)
    }

    const ids = toDelete.map((t) => t.id)
    if (ids.length === 0) return 0

    if (selectedTaskId && ids.includes(selectedTaskId)) {
      setSelectedTaskId(null)
    }
    await db.tasks.bulkDelete(ids)

    for (const id of ids) {
      cancelTaskReminder(id)
      if (user?.id) {
        await recordTombstone('tasks', id, user.id)
      }
      if (user?.id && !shouldSkipRemote()) {
        const ok = await deleteTaskRemote(id, user.id)
        if (!ok) {
          enqueueMutation('delete', 'tasks', { id })
        }
      }
    }
    return ids.length
  }

  const deleteMultipleTasks = async (taskIds) => {
    if (!taskIds || taskIds.length === 0) return
    if (selectedTaskId && taskIds.includes(selectedTaskId)) {
      setSelectedTaskId(null)
    }
    await db.tasks.bulkDelete(taskIds)

    for (const id of taskIds) {
      cancelTaskReminder(id)
      if (user?.id) {
        await recordTombstone('tasks', id, user.id)
      }
      if (user?.id && !shouldSkipRemote()) {
        const ok = await deleteTaskRemote(id, user.id)
        if (!ok) {
          enqueueMutation('delete', 'tasks', { id })
        }
      }
    }
  }

  const duplicateTask = async (id, options = {}) => {
    const target = await db.tasks.get(id)
    if (!target) return null

    const {
      includeDate = true,
      includeSubtasks = true,
      includeRecurrence = true,
    } = options

    const clonedSubtasks = includeSubtasks && Array.isArray(target.subtasks)
      ? target.subtasks.map((s) => ({
          id: crypto.randomUUID(),
          title: s.title,
          completed: false,
        }))
      : []

    const duplicated = {
      ...target,
      id: crypto.randomUUID(),
      title: `${target.title} (Copy)`,
      completed: false,
      completedAt: null,
      hasGeneratedNext: false,
      dueDate: includeDate ? target.dueDate : null,
      myDayDate: includeDate ? target.myDayDate : null,
      inMyDay: includeDate ? target.inMyDay : false,
      deadline: includeDate ? target.deadline : null,
      recurrence: includeRecurrence ? target.recurrence : 'none',
      subtasks: clonedSubtasks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.tasks.add(duplicated)

    if (user?.id && !shouldSkipRemote()) {
      const res = await upsertTaskRemote(duplicated, user.id)
      if (!res) {
        const row = mapTaskToRow(duplicated, user.id)
        if (row) enqueueMutation('upsert', 'tasks', row)
      }
    }

    addToast(`Duplicated "${target.title}"`, {
      type: 'success',
      duration: 3500,
    })
    return duplicated
  }

  const bulkComplete = async (taskIds, completed = true) => {
    if (!taskIds || taskIds.length === 0) return 0
    const now = new Date().toISOString()

    for (const id of taskIds) {
      if (completed) cancelTaskReminder(id)
      const target = await db.tasks.get(id)
      if (!target) continue

      const updated = {
        ...target,
        completed,
        completedAt: completed ? now : null,
        updatedAt: now,
      }
      await db.tasks.update(id, {
        completed,
        completedAt: completed ? now : null,
        updatedAt: now,
      })

      if (user?.id && !shouldSkipRemote()) {
        const res = await upsertTaskRemote(updated, user.id)
        if (!res) {
          const row = mapTaskToRow(updated, user.id)
          if (row) enqueueMutation('upsert', 'tasks', row)
        }
      }
    }

    if (completed) playTaskCompleteSound()
    addToast(`${completed ? 'Completed' : 'Reopened'} ${taskIds.length} tasks`, {
      type: 'success',
      duration: 4000,
      action: {
        label: 'Undo',
        onClick: () => bulkComplete(taskIds, !completed),
      },
    })
    return taskIds.length
  }

  const bulkReschedule = async (taskIds, newDueDate) => {
    if (!taskIds || taskIds.length === 0) return 0
    const now = new Date().toISOString()
    const isToday = newDueDate === todayKey

    for (const id of taskIds) {
      const target = await db.tasks.get(id)
      if (!target) continue

      const updated = {
        ...target,
        dueDate: newDueDate || null,
        inMyDay: isToday ? true : target.inMyDay,
        myDayDate: isToday ? todayKey : target.myDayDate,
        updatedAt: now,
      }
      await db.tasks.update(id, {
        dueDate: newDueDate || null,
        inMyDay: isToday ? true : target.inMyDay,
        myDayDate: isToday ? todayKey : target.myDayDate,
        updatedAt: now,
      })

      if (user?.id && !shouldSkipRemote()) {
        const res = await upsertTaskRemote(updated, user.id)
        if (!res) {
          const row = mapTaskToRow(updated, user.id)
          if (row) enqueueMutation('upsert', 'tasks', row)
        }
      }
    }

    addToast(`Rescheduled ${taskIds.length} tasks`, {
      type: 'info',
      duration: 3500,
    })
    return taskIds.length
  }

  const bulkChangePriority = async (taskIds, priority) => {
    if (!taskIds || taskIds.length === 0) return 0
    const now = new Date().toISOString()
    const starred = priority === 'high'

    for (const id of taskIds) {
      const target = await db.tasks.get(id)
      if (!target) continue

      const updated = {
        ...target,
        priority,
        starred,
        updatedAt: now,
      }
      await db.tasks.update(id, {
        priority,
        starred,
        updatedAt: now,
      })

      if (user?.id && !shouldSkipRemote()) {
        const res = await upsertTaskRemote(updated, user.id)
        if (!res) {
          const row = mapTaskToRow(updated, user.id)
          if (row) enqueueMutation('upsert', 'tasks', row)
        }
      }
    }

    addToast(`Set priority to ${priority} for ${taskIds.length} tasks`, {
      type: 'info',
      duration: 3500,
    })
    return taskIds.length
  }

  const bulkMove = async (taskIds, targetListId) => {
    if (!taskIds || taskIds.length === 0) return 0
    const now = new Date().toISOString()
    const validListId =
      targetListId === 'my-day' || targetListId === 'all' || targetListId === 'completed'
        ? 'tasks'
        : targetListId

    for (const id of taskIds) {
      const target = await db.tasks.get(id)
      if (!target) continue

      const updated = {
        ...target,
        listId: validListId,
        inMyDay: targetListId === 'my-day' ? true : target.inMyDay,
        myDayDate: targetListId === 'my-day' ? todayKey : target.myDayDate,
        updatedAt: now,
      }
      await db.tasks.update(id, {
        listId: validListId,
        inMyDay: targetListId === 'my-day' ? true : target.inMyDay,
        myDayDate: targetListId === 'my-day' ? todayKey : target.myDayDate,
        updatedAt: now,
      })

      if (user?.id && !shouldSkipRemote()) {
        const res = await upsertTaskRemote(updated, user.id)
        if (!res) {
          const row = mapTaskToRow(updated, user.id)
          if (row) enqueueMutation('upsert', 'tasks', row)
        }
      }
    }

    addToast(`Moved ${taskIds.length} tasks`, {
      type: 'info',
      duration: 3500,
    })
    return taskIds.length
  }

  const bulkApplyLabels = async (taskIds, labelsToAdd) => {
    if (!taskIds || taskIds.length === 0 || !labelsToAdd || labelsToAdd.length === 0) return 0
    const now = new Date().toISOString()

    for (const id of taskIds) {
      const target = await db.tasks.get(id)
      if (!target) continue

      const existing = Array.isArray(target.labels) ? target.labels : []
      const merged = Array.from(new Set([...existing, ...labelsToAdd]))

      const updated = {
        ...target,
        labels: merged,
        updatedAt: now,
      }
      await db.tasks.update(id, {
        labels: merged,
        updatedAt: now,
      })

      if (user?.id && !shouldSkipRemote()) {
        const res = await upsertTaskRemote(updated, user.id)
        if (!res) {
          const row = mapTaskToRow(updated, user.id)
          if (row) enqueueMutation('upsert', 'tasks', row)
        }
      }
    }

    addToast(`Applied labels to ${taskIds.length} tasks`, {
      type: 'info',
      duration: 3500,
    })
    return taskIds.length
  }

  return (
    <TaskContext.Provider
      value={{
        isLoading,
        tasks,
        lists,
        activeListId,
        setActiveListId,
        selectedTask,
        setSelectedTask,
        selectedTaskIds,
        setSelectedTaskIds,
        isBulkActive: selectedTaskIds.length > 0,
        addTask,
        updateTask,
        editTask,
        deleteTask,
        restoreTask,
        duplicateTask,
        toggleTask,
        toggleStar,
        toggleMyDay,
        addSubtask,
        toggleSubtask,
        deleteSubtask,
        createList,
        renameList,
        deleteList,
        clearCompleted,
        clearList,
        deleteMultipleTasks,
        bulkComplete,
        bulkReschedule,
        bulkChangePriority,
        bulkMove,
        bulkApplyLabels,
        completeTaskFromTimer,
      }}
    >
      {children}
    </TaskContext.Provider>
  )
}
