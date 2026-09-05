import { db } from '../db/db'
import { formatDateKey } from './calendarService'

export async function savePlanSchedule(blocks, planningStyle = 'balanced', userInstruction = '') {
  try {
    const todayKey = formatDateKey(new Date())
    const record = {
      id: `schedule-${todayKey}`,
      date: todayKey,
      planningStyle,
      userInstruction,
      blocks,
      updatedAt: new Date().toISOString(),
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
    return await db.planSchedules.get(`schedule-${key}`)
  } catch (err) {
    console.error('plannerPersistenceService.getPlanSchedule failed:', err)
    return null
  }
}
