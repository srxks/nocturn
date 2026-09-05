import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ensureSeedData } from '../db/db'
import { TaskContext } from './TaskContext'
import { formatDateKey } from '../services/calendarService'

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
  const [activeListId, setActiveListId] = useState('my-day')
  const [selectedTaskId, setSelectedTaskId] = useState(null)

  useEffect(() => {
    ensureSeedData()
  }, [])

  // Dexie live queries for reactive database persistence
  const liveTasks = useLiveQuery(async () => {
    return await db.tasks.toArray()
  }, [])

  const liveLists = useLiveQuery(async () => {
    return await db.lists.toArray()
  }, [])

  const tasks = liveTasks || []
  const lists = liveLists || []

  // Derived selected task object
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) || null : null
  const setSelectedTask = (taskOrNull) => {
    if (!taskOrNull) {
      setSelectedTaskId(null)
    } else {
      setSelectedTaskId(taskOrNull.id)
    }
  }

  // 1. Task Operations
  const addTask = async (
    title,
    listId = 'tasks',
    dueDate = null,
    priority = 'medium',
    starred = false
  ) => {
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
  }

  const updateTask = async (id, fields) => {
    const target = await db.tasks.get(id)
    if (!target) return

    let updatedFields = { ...fields, updatedAt: new Date().toISOString() }

    // If inMyDay property is toggled
    if (fields.inMyDay !== undefined) {
      updatedFields.myDayDate = fields.inMyDay ? todayKey : null
    }

    await db.tasks.update(id, updatedFields)
  }

  const toggleTask = async (id) => {
    const target = await db.tasks.get(id)
    if (!target) return

    const willBeCompleted = !target.completed
    const isRecurring = target.recurrence && target.recurrence !== 'none'
    const shouldGenerateNext = willBeCompleted && isRecurring && !target.hasGeneratedNext

    await db.tasks.update(id, {
      completed: willBeCompleted,
      hasGeneratedNext: willBeCompleted ? true : target.hasGeneratedNext,
      updatedAt: new Date().toISOString(),
    })

    if (shouldGenerateNext) {
      const nextDueDateKey = calculateNextRecurrenceDate(target.dueDate || todayKey, target.recurrence)
      const isNextDueToday = nextDueDateKey === todayKey
      const newOccurrence = {
        ...target,
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
    }
  }

  const toggleStar = async (id) => {
    const target = await db.tasks.get(id)
    if (!target) return
    await db.tasks.update(id, {
      starred: !target.starred,
      updatedAt: new Date().toISOString(),
    })
  }

  const toggleMyDay = async (id) => {
    const target = await db.tasks.get(id)
    if (!target) return
    const nextInMyDay = !(target.inMyDay || target.myDayDate === todayKey)
    await db.tasks.update(id, {
      inMyDay: nextInMyDay,
      myDayDate: nextInMyDay ? todayKey : null,
      updatedAt: new Date().toISOString(),
    })
  }

  const editTask = async (id, newTitle) => {
    await updateTask(id, { title: newTitle })
  }

  const deleteTask = async (id) => {
    if (selectedTaskId === id) {
      setSelectedTaskId(null)
    }
    await db.tasks.delete(id)
  }

  // 2. Subtask Operations
  const addSubtask = async (taskId, title) => {
    if (!title.trim()) return
    const target = await db.tasks.get(taskId)
    if (!target) return

    const newSub = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      completed: false,
    }
    const updatedSubtasks = [...(target.subtasks || []), newSub]

    await db.tasks.update(taskId, {
      subtasks: updatedSubtasks,
      updatedAt: new Date().toISOString(),
    })
  }

  const toggleSubtask = async (taskId, subtaskId) => {
    const target = await db.tasks.get(taskId)
    if (!target || !target.subtasks) return

    const updatedSubtasks = target.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    )

    await db.tasks.update(taskId, {
      subtasks: updatedSubtasks,
      updatedAt: new Date().toISOString(),
    })
  }

  const deleteSubtask = async (taskId, subtaskId) => {
    const target = await db.tasks.get(taskId)
    if (!target || !target.subtasks) return

    const updatedSubtasks = target.subtasks.filter((s) => s.id !== subtaskId)

    await db.tasks.update(taskId, {
      subtasks: updatedSubtasks,
      updatedAt: new Date().toISOString(),
    })
  }

  // 3. List Operations
  const createList = async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    const newList = {
      id: `list-${Date.now()}`,
      name: trimmed,
      system: false,
      createdAt: new Date().toISOString(),
    }
    await db.lists.add(newList)
    setActiveListId(newList.id)
    return newList.id
  }

  const renameList = async (id, newName) => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const target = await db.lists.get(id)
    if (!target || target.system) return

    await db.lists.update(id, { name: trimmed })
  }

  const deleteList = async (id) => {
    const target = await db.lists.get(id)
    if (!target || target.system) return

    // Reassign tasks in this list to 'tasks' in Dexie
    const listTasks = await db.tasks.where('listId').equals(id).toArray()
    for (const t of listTasks) {
      await db.tasks.update(t.id, { listId: 'tasks', updatedAt: new Date().toISOString() })
    }

    await db.lists.delete(id)
    if (activeListId === id) {
      setActiveListId('tasks')
    }
  }

  // 4. Bulk Task Management Operations
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
    return ids.length
  }

  const clearList = async (listId) => {
    if (listId === 'my-day') {
      const myDayTasks = tasks.filter((t) => t.inMyDay || t.myDayDate === todayKey)
      for (const t of myDayTasks) {
        await db.tasks.update(t.id, {
          inMyDay: false,
          myDayDate: null,
          updatedAt: new Date().toISOString(),
        })
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
    return ids.length
  }

  const deleteMultipleTasks = async (taskIds) => {
    if (!taskIds || taskIds.length === 0) return
    if (selectedTaskId && taskIds.includes(selectedTaskId)) {
      setSelectedTaskId(null)
    }
    await db.tasks.bulkDelete(taskIds)
  }

  return (
    <TaskContext.Provider
      value={{
        tasks,
        lists,
        activeListId,
        setActiveListId,
        selectedTask,
        setSelectedTask,
        addTask,
        updateTask,
        editTask,
        deleteTask,
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
      }}
    >
      {children}
    </TaskContext.Provider>
  )
}
