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
