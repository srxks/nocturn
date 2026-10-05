import Dexie from 'dexie'

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

db.version(6).stores({
  tasks: 'id, listId, dueDate, myDayDate, completed, starred, createdAt, userId, updatedAt',
  lists: 'id, name, system, createdAt, userId, updatedAt',
  timerSettings: 'id, userId, updatedAt',
  themes: 'id, name, isPreset, userId, createdAt, updatedAt',
  themeSettings: 'id',
  pomodoroSessions: 'id, taskId, completedAt, sessionType, userId, updatedAt',
  planSchedules: 'id, date, updatedAt',
  activeSessions: 'id, status, userId, expectedEndAt',
  vocab: 'id, word, date_added, correct_count, last_quizzed_date, userId, updatedAt',
  dailyVocabLogs: 'date, completed',
  tombstones: 'id, table, entityId, deletedAt, userId',
})

db.version(7).stores({
  userSettings: 'id, userId, updatedAt',
})

db.version(8).stores({
  vocab: 'id, word, date_added, correct_count, last_quizzed_date, userId, updatedAt, difficulty',
})

/**
 * Development-only utility to reset local database and persistence.
 * Exposed on window.__resetNocturnLocalDB.
 * Does NOT run silently on startup.
 */
export async function resetLocalDatabase() {
  try {
    await db.tasks.clear()
    await db.lists.clear()
    await db.timerSettings.clear()
    await db.themes.clear()
    await db.themeSettings.clear()
    await db.pomodoroSessions.clear()
    await db.planSchedules.clear()
    await db.activeSessions.clear()
    await db.vocab.clear()
    await db.dailyVocabLogs.clear()
    if (db.userSettings) await db.userSettings.clear()
    if (db.tombstones) await db.tombstones.clear()
    console.info('[NocturnDB] Local database cleared successfully.')
  } catch (err) {
    console.error('[NocturnDB] Failed to clear local database:', err)
  }
}

if (typeof window !== 'undefined') {
  window.__resetNocturnLocalDB = resetLocalDatabase
}

export async function ensureSeedData() {
  try {
    const existingSettings = await db.timerSettings.get('default')
    if (!existingSettings) {
      await db.timerSettings.put({
        id: 'default',
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        sessions: 4,
        autoStartBreaks: false,
        autoStartPomo: false,
        timerState: null,
        updatedAt: new Date().toISOString(),
      })
    } else {
      const focus = Number(existingSettings.focusDuration)
      const short = Number(existingSettings.shortBreakDuration)
      const long = Number(existingSettings.longBreakDuration)
      const sessions = Number(existingSettings.sessions)
      const needsRepair =
        !Number.isFinite(focus) || focus <= 0 ||
        !Number.isFinite(short) || short <= 0 ||
        !Number.isFinite(long) || long <= 0 ||
        !Number.isFinite(sessions) || sessions <= 0 ||
        existingSettings.autoStartBreaks === undefined ||
        existingSettings.autoStartPomo === undefined

      if (needsRepair) {
        await db.timerSettings.put({
          ...existingSettings,
          id: 'default',
          focusDuration: Number.isFinite(focus) && focus > 0 ? focus : 25,
          shortBreakDuration: Number.isFinite(short) && short > 0 ? short : 5,
          longBreakDuration: Number.isFinite(long) && long > 0 ? long : 15,
          sessions: Number.isFinite(sessions) && sessions > 0 ? sessions : 4,
          autoStartBreaks: Boolean(existingSettings.autoStartBreaks),
          autoStartPomo: Boolean(existingSettings.autoStartPomo),
        })
      }
    }

    const themeSettingsCount = await db.themeSettings.count()
    if (themeSettingsCount === 0) {
      await db.themeSettings.add({
        id: 'active',
        activeThemeId: 'indigo',
        customColors: null,
      })
    }

    // Clean up any legacy sample tasks and sample lists from previous versions
    await db.tasks.bulkDelete(['task-1', 'task-2', 'task-3', 'task-4', 'task-5'])
    await db.lists.bulkDelete(['college', 'personal', 'tasks'])

    // Purge any tasks titled "Prepare presentation" or other demo names
    const allTasks = await db.tasks.toArray()
    const demoTaskIds = allTasks
      .filter(
        (t) =>
          !t ||
          !t.title ||
          t.title.toLowerCase().includes('prepare presentation') ||
          t.title.toLowerCase().includes('sample task')
      )
      .map((t) => t.id)
    if (demoTaskIds.length > 0) {
      await db.tasks.bulkDelete(demoTaskIds)
    }

    // Clean up any corrupt list records that lack a name or were improperly seeded
    const allLists = await db.lists.toArray()
    const corruptListIds = allLists
      .filter(
        (l) => !l || !l.name || typeof l.name !== 'string' || !l.name.trim() || l.id === 'default'
      )
      .map((l) => l.id)
    if (corruptListIds.length > 0) {
      await db.lists.bulkDelete(corruptListIds)
    }

    // Deduplicate any historic or sync duplicate focus sessions
    await deduplicatePomodoroSessions()
  } catch (err) {
    console.error('Failed to initialize Nocturn database defaults:', err)
  }
}

/**
 * Deduplicates pomodoro/focus sessions in local Dexie to guarantee idempotency.
 */
export async function deduplicatePomodoroSessions() {
  try {
    if (!db || !db.pomodoroSessions) return
    const all = await db.pomodoroSessions.toArray()
    if (!all || all.length <= 1) return

    const seenTimes = new Map()
    const duplicateIds = []

    for (const session of all) {
      if (!session || !session.id) continue
      const startTime = session.startedAt || session.completedAt
      if (!startTime) continue
      const timeMs = new Date(startTime).getTime()
      if (isNaN(timeMs)) continue

      const userKey = session.userId || 'local'
      let foundDuplicate = false

      for (const [key] of seenTimes.entries()) {
        const [existingUser, existingTimeStr] = key.split('::')
        const existingMs = Number(existingTimeStr)
        if (existingUser === userKey && Math.abs(timeMs - existingMs) <= 3000) {
          duplicateIds.push(session.id)
          foundDuplicate = true
          break
        }
      }

      if (!foundDuplicate) {
        seenTimes.set(`${userKey}::${timeMs}`, session.id)
      }
    }

    if (duplicateIds.length > 0) {
      await db.pomodoroSessions.bulkDelete(duplicateIds)
      console.info(`[NocturnDB] Cleaned up ${duplicateIds.length} duplicate focus session(s).`)
    }
  } catch (err) {
    console.warn('[NocturnDB] Deduplication error:', err)
  }
}

