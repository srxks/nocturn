/**
 * Supabase Service Layer
 * Abstracts backend persistence and per-user authentication query helpers.
 * Works alongside local-first Dexie IndexedDB architecture.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Retrieves current authenticated user session from Supabase.
 */
export async function getCurrentUserSession() {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session) return null
    return data.session.user
  } catch (err) {
    console.warn('[supabaseService] Failed to retrieve user session:', err)
    return null
  }
}

/**
 * Fetches user data from a Supabase table by userId.
 * Safe fallback returning empty array if unconfigured or unauthenticated.
 */
export async function fetchPerUserData(tableName, userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return []

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.warn(`[supabaseService] Error fetching ${tableName}:`, error.message)
      return []
    }

    return data || []
  } catch (err) {
    console.warn(`[supabaseService] Network failure fetching ${tableName}:`, err)
    return []
  }
}

/**
 * Upserts user record to Supabase table.
 * Preserves local data integrity if offline or unconfigured.
 */
export async function upsertPerUserData(tableName, recordObj) {
  if (!isSupabaseConfigured || !supabase) return null

  try {
    const { data, error } = await supabase
      .from(tableName)
      .upsert(recordObj)
      .select()

    if (error) {
      console.warn(`[supabaseService] Error upserting ${tableName}:`, error.message)
      return null
    }

    return data?.[0] || null
  } catch (err) {
    console.warn(`[supabaseService] Failure upserting ${tableName}:`, err)
    return null
  }
}
