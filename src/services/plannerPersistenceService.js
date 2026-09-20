/**
 * plannerPersistenceService.js
 *
 * Plan My Day is a local-first feature.
 * Data is stored in Dexie (IndexedDB) under the planSchedules table.
 *
 * NOTE: The plan_schedules Supabase table does not exist in the current schema.
 * Cloud sync for plan schedules is disabled. Data remains local-only.
 * If you create a plan_schedules table manually in Supabase, the cloud sync
 * code can be re-enabled in upsertPlanScheduleRemote / fetchPlanScheduleRemote.
 */

import { db } from '../db/db'
import { formatDateKey } from './calendarService'

export async function savePlanSchedule(
  blocksOrData,
  planningStyle = 'balanced',
  userInstruction = ''
) {
  try {
    const todayKey = formatDateKey(new Date())

    let record = {
      id: `schedule-${todayKey}`,
      date: todayKey,
      planningStyle,
      userInstruction,
      updatedAt: new Date().toISOString(),
    }

    if (blocksOrData && typeof blocksOrData === 'object' && !Array.isArray(blocksOrData)) {
      // Structured plan object
      record = {
        ...record,
        ...blocksOrData,
        id: `schedule-${todayKey}`,
        date: todayKey,
        updatedAt: new Date().toISOString(),
      }
    } else {
      // Array of blocks
      record.blocks = Array.isArray(blocksOrData) ? blocksOrData : []
    }

    await db.planSchedules.put(record)
    return record
  } catch (err) {
    console.error('plannerPersistenceService.savePlanSchedule failed:', err)
    throw err
  }
}

export async function getPlanSchedule(dateKey = null) {
  try {
    const key = dateKey || formatDateKey(new Date())
    return (await db.planSchedules.get(`schedule-${key}`)) || null
  } catch (err) {
    console.error('plannerPersistenceService.getPlanSchedule failed:', err)
    return null
  }
}

export async function markPlanBlockCompleted(blockId, dateKey = null) {
  try {
    const key = dateKey || formatDateKey(new Date())
    const schedule = await getPlanSchedule(key)
    if (!schedule || !Array.isArray(schedule.blocks)) return null

    let found = false
    const updatedBlocks = schedule.blocks.map((b) => {
      if (b.id === blockId || (b.taskId && b.taskId === blockId)) {
        found = true
        return { ...b, completed: true, completedAt: new Date().toISOString() }
      }
      return b
    })

    if (!found) return null

    schedule.blocks = updatedBlocks
    schedule.updatedAt = new Date().toISOString()
    await db.planSchedules.put(schedule)
    return schedule
  } catch (err) {
    console.error('plannerPersistenceService.markPlanBlockCompleted failed:', err)
    return null
  }
}

export async function togglePlanBlockCompleted(blockId, dateKey = null) {
  try {
    const key = dateKey || formatDateKey(new Date())
    const schedule = await getPlanSchedule(key)
    if (!schedule || !Array.isArray(schedule.blocks)) return null

    let found = false
    let newCompleted = false
    const updatedBlocks = schedule.blocks.map((b) => {
      if (b.id === blockId || (b.taskId && b.taskId === blockId)) {
        found = true
        newCompleted = !b.completed
        return {
          ...b,
          completed: newCompleted,
          completedAt: newCompleted ? new Date().toISOString() : null,
        }
      }
      return b
    })

    if (!found) return null

    schedule.blocks = updatedBlocks
    schedule.updatedAt = new Date().toISOString()
    await db.planSchedules.put(schedule)
    return { schedule, completed: newCompleted }
  } catch (err) {
    console.error('plannerPersistenceService.togglePlanBlockCompleted failed:', err)
    return null
  }
}

export async function updatePlanBlock(blockId, updates, dateKey = null) {
  try {
    const key = dateKey || formatDateKey(new Date())
    const schedule = await getPlanSchedule(key)
    if (!schedule || !Array.isArray(schedule.blocks)) return null

    const updatedBlocks = schedule.blocks.map((b) => {
      if (b.id === blockId) {
        return { ...b, ...updates }
      }
      return b
    })

    schedule.blocks = updatedBlocks
    schedule.updatedAt = new Date().toISOString()
    await db.planSchedules.put(schedule)
    return schedule
  } catch (err) {
    console.error('plannerPersistenceService.updatePlanBlock failed:', err)
    return null
  }
}

export async function deletePlanBlock(blockId, dateKey = null) {
  try {
    const key = dateKey || formatDateKey(new Date())
    const schedule = await getPlanSchedule(key)
    if (!schedule || !Array.isArray(schedule.blocks)) return null

    schedule.blocks = schedule.blocks.filter((b) => b.id !== blockId)
    schedule.updatedAt = new Date().toISOString()
    await db.planSchedules.put(schedule)
    return schedule
  } catch (err) {
    console.error('plannerPersistenceService.deletePlanBlock failed:', err)
    return null
  }
}

export async function addPlanBlock(newBlock, dateKey = null) {
  try {
    const key = dateKey || formatDateKey(new Date())
    let schedule = await getPlanSchedule(key)
    if (!schedule) {
      schedule = {
        id: `schedule-${key}`,
        date: key,
        blocks: [],
        updatedAt: new Date().toISOString(),
      }
    }

    schedule.blocks = [...(schedule.blocks || []), newBlock]
    schedule.updatedAt = new Date().toISOString()
    await db.planSchedules.put(schedule)
    return schedule
  } catch (err) {
    console.error('plannerPersistenceService.addPlanBlock failed:', err)
    return null
  }
}
