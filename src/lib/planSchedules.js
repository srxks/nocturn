import { supabase, isSupabaseConfigured } from './supabaseClient'
import { toUuid } from './idUtils'

/**
 * Maps Supabase plan_schedules row to frontend schedule record
 */
export function mapRowToPlanSchedule(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    planningStyle: row.planning_style || 'balanced',
    userInstruction: row.user_instruction || '',
    blocks: Array.isArray(row.blocks) ? row.blocks : (row.blocks?.blocks || []),
    updatedAt: row.updated_at || new Date().toISOString(),
  }
}

/**
 * Fetches the daily plan schedule for a specific date from Supabase
 */
export async function fetchPlanScheduleRemote(dateKey, userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null

  try {
    const { data, error } = await supabase
      .from('plan_schedules')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateKey)
      .maybeSingle()

    if (error) {
      console.warn('[planSchedules.js] Error fetching plan schedule:', error.message)
      return null
    }

    return mapRowToPlanSchedule(data)
  } catch (err) {
    console.warn('[planSchedules.js] Network error fetching plan schedule:', err)
    return null
  }
}

/**
 * Upserts a daily plan schedule in Supabase
 */
export async function upsertPlanScheduleRemote(record, userId) {
  if (!isSupabaseConfigured || !supabase || !userId || !record) return null

  try {
    const validId = toUuid(record.id || `schedule-${record.date}-${userId}`)
    const row = {
      id: validId,
      user_id: userId,
      date: record.date,
      planning_style: record.planningStyle || 'balanced',
      user_instruction: record.userInstruction || '',
      blocks: record.blocks || [],
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from('plan_schedules').upsert(row).select()

    if (error) {
      console.warn('[planSchedules.js] Error upserting plan schedule:', error.message)
      return null
    }

    return mapRowToPlanSchedule(data?.[0])
  } catch (err) {
    console.warn('[planSchedules.js] Network error upserting plan schedule:', err)
    return null
  }
}
