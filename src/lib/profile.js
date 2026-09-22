import { supabase, isSupabaseConfigured, isGuestUserId } from './supabaseClient.js'
import { dedupeRequest } from '../services/syncCoordinator.js'
import { classifyAndReportError } from '../services/networkStateService.js'

/**
 * Fetches user profile from user_profiles table.
 *
 * Schema:
 *   id (uuid) - primary key
 *   user_id (uuid) - unique foreign key referencing auth.users(id)
 *   display_name (text)
 *   avatar_url (text)
 *   created_at (timestamptz)
 *   updated_at (timestamptz)
 */
export async function fetchUserProfileRemote(userId) {
  if (!isSupabaseConfigured || !supabase || isGuestUserId(userId)) return null

  return dedupeRequest(`profile:${userId}`, async () => {
    try {
      // 1. Query by user_id (unique ownership foreign key)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        classifyAndReportError(error)
        console.warn(`[user_profiles] Remote fetch deferred (offline/network): ${error.message}`)
        return null
      }

      if (data) return data

      // 2. Fallback query by id in case an earlier record used id = auth.uid()
      const { data: fallbackData, error: fallbackErr } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (fallbackErr && fallbackErr.code !== 'PGRST116') {
        classifyAndReportError(fallbackErr)
        console.warn(`[user_profiles] Remote fallback deferred (offline/network): ${fallbackErr.message}`)
        return null
      }

      return fallbackData || null
    } catch (err) {
      classifyAndReportError(err)
      console.warn(`[user_profiles] Remote fetch exception (offline/network): ${err?.message || err}`)
      return null
    }
  })
}

/**
 * Upserts or updates the user's profile row correctly without 403 / RLS violations.
 */
export async function updateUserProfileRemote(userId, profileUpdates) {
  if (!isSupabaseConfigured || !supabase || isGuestUserId(userId)) return null

  try {
    const existing = await fetchUserProfileRemote(userId)
    const displayName = profileUpdates.display_name ?? profileUpdates.displayName ?? ''
    const avatarUrl = profileUpdates.avatar_url ?? profileUpdates.avatarUrl ?? null
    const nowIso = new Date().toISOString()

    if (existing?.id) {
      // Existing row found: use UPDATE on primary key id to guarantee RLS compliance
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: nowIso,
        })
        .eq('id', existing.id)
        .select()

      if (error) {
        console.warn('[user_profiles] UPDATE failed:', error.message)
        return null
      }
      return data?.[0] || null
    }

    // New row: specify both id and user_id to satisfy both schemas/policies
    const newRow = {
      id: userId,
      user_id: userId,
      display_name: displayName,
      avatar_url: avatarUrl,
      created_at: nowIso,
      updated_at: nowIso,
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(newRow, { onConflict: 'user_id' })
      .select()

    if (error) {
      // Fallback try onConflict: 'id'
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('user_profiles')
        .upsert(newRow, { onConflict: 'id' })
        .select()

      if (fallbackError) {
        console.warn('[user_profiles] UPSERT notice:', fallbackError.message)
        return null
      }
      return fallbackData?.[0] || null
    }

    return data?.[0] || null
  } catch (err) {
    console.warn('[user_profiles] UPSERT exception:', err.message)
    return null
  }
}
