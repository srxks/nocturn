import Dexie from 'dexie'
import { formatDateKey } from '../services/calendarService'
import { PRESET_THEMES } from '../constants/presetThemes'

export const db = new Dexie('NocturnDB')

db.version(1).stores({
  tasks: 'id, listId, dueDate, myDayDate, completed, starred, createdAt',
  lists: 'id, name, system, createdAt',
  timerSettings: 'id',
})

db.version(2).stores({
  tasks: 'id, listId, dueDate, myDayDate, completed, starred, createdAt',
  lists: 'id, name, system, createdAt',
  timerSettings: 'id',
  themes: 'id, name, isPreset, userId, createdAt',
  themeSettings: 'id',
})

db.version(3).stores({
  tasks: 'id, listId, dueDate, myDayDate, completed, starred, createdAt',
  lists: 'id, name, system, createdAt',
  timerSettings: 'id',
  themes: 'id, name, isPreset, userId, createdAt',
  themeSettings: 'id',
  pomodoroSessions: 'id, taskId, completedAt, sessionType, userId',
  planSchedules: 'id, date, updatedAt',
})

db.version(4).stores({
  tasks: 'id, listId, dueDate, myDayDate, completed, starred, createdAt',
  lists: 'id, name, system, createdAt',
  timerSettings: 'id',
  themes: 'id, name, isPreset, userId, createdAt',
  themeSettings: 'id',
  pomodoroSessions: 'id, taskId, completedAt, sessionType, userId',
  planSchedules: 'id, date, updatedAt',
  activeSessions: 'id, status, userId, expectedEndAt',
})

db.version(5).stores({
  tasks: 'id, listId, dueDate, myDayDate, completed, starred, createdAt',
  lists: 'id, name, system, createdAt',
  timerSettings: 'id',
  themes: 'id, name, isPreset, userId, createdAt',
  themeSettings: 'id',
  pomodoroSessions: 'id, taskId, completedAt, sessionType, userId',
  planSchedules: 'id, date, updatedAt',
  activeSessions: 'id, status, userId, expectedEndAt',
  vocab: 'id, word, date_added, correct_count, last_quizzed_date',
  dailyVocabLogs: 'date, completed',
})

export async function ensureSeedData() {
  try {
    const listsCount = await db.lists.count()
    if (listsCount === 0) {
      await db.lists.bulkAdd([
        { id: 'tasks', name: 'Tasks', system: true, createdAt: new Date().toISOString() },
        { id: 'college', name: 'College', system: false, createdAt: new Date().toISOString() },
        { id: 'personal', name: 'Personal', system: false, createdAt: new Date().toISOString() },
      ])
    }

    const settingsCount = await db.timerSettings.count()
    if (settingsCount === 0) {
      await db.timerSettings.add({
        id: 'default',
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        sessions: 4,
      })
    }

    const themeSettingsCount = await db.themeSettings.count()
    if (themeSettingsCount === 0) {
      await db.themeSettings.add({
        id: 'active',
        activeThemeId: 'preset-nocturn-green',
        customColors: null,
      })
    }

    const themesCount = await db.themes.count()
    if (themesCount === 0) {
      const presetsToSeed = PRESET_THEMES.map((theme) => ({
        ...theme,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
      await db.themes.bulkAdd(presetsToSeed)
    }

    const tasksCount = await db.tasks.count()
    if (tasksCount === 0) {
      const todayKey = formatDateKey(new Date())
      const tomorrowDate = new Date()
      tomorrowDate.setDate(tomorrowDate.getDate() + 1)
      const tomorrowKey = formatDateKey(tomorrowDate)

      await db.tasks.bulkAdd([
        {
          id: 'task-1',
          title: 'Finish project documentation',
          completed: false,
          listId: 'tasks',
          dueDate: todayKey,
          myDayDate: todayKey,
          inMyDay: true,
          reminder: null,
          recurrence: 'none',
          priority: 'high',
          starred: true,
          notes: 'Complete API reference section and review build steps.',
          subtasks: [
            { id: 'sub-1', title: 'Write setup guide', completed: true },
            { id: 'sub-2', title: 'Verify code examples', completed: false },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'task-2',
          title: "Review today's notes",
          completed: false,
          listId: 'college',
          dueDate: todayKey,
          myDayDate: todayKey,
          inMyDay: true,
          reminder: '18:00',
          recurrence: 'daily',
          priority: 'medium',
          starred: false,
          notes: 'Check lecture slides from Chapter 4.',
          subtasks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'task-3',
          title: '30 min focused study',
          completed: true,
          listId: 'tasks',
          dueDate: todayKey,
          myDayDate: todayKey,
          inMyDay: true,
          reminder: null,
          recurrence: 'none',
          priority: 'low',
          starred: false,
          notes: '',
          subtasks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'task-4',
          title: 'Prepare presentation',
          completed: false,
          listId: 'tasks',
          dueDate: tomorrowKey,
          myDayDate: null,
          inMyDay: false,
          reminder: '10:00',
          recurrence: 'weekly',
          priority: 'high',
          starred: true,
          notes: 'Design 10 slides on productivity workflow.',
          subtasks: [
            { id: 'sub-3', title: 'Outline slide content', completed: true },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'task-5',
          title: "Plan tomorrow's priorities",
          completed: false,
          listId: 'personal',
          dueDate: tomorrowKey,
          myDayDate: null,
          inMyDay: false,
          reminder: null,
          recurrence: 'none',
          priority: 'medium',
          starred: false,
          notes: '',
          subtasks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
    }
  } catch (err) {
    console.error('Failed to seed Nocturn database:', err)
  }
}
