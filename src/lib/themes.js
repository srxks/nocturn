import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { toUuid } from './idUtils.js'
import { dedupeRequest } from '../services/syncCoordinator.js'
import { classifyAndReportError } from '../services/networkStateService.js'

/**
 * Fetches user settings from user_settings table.
 * Schema: id (uuid), user_id (uuid, unique), settings (jsonb), created_at, updated_at.
 */
export async function fetchUserSettings(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null

  return dedupeRequest(`user_settings:${userId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        classifyAndReportError(error)
        throw new Error(`[user_settings] SELECT failed: ${error.message}`)
      }

      return data?.settings || null
    } catch (err) {
      classifyAndReportError(err)
      throw err
    }
  })
}

/**
 * Upserts user settings into user_settings table.
 * Merges with existing settings to prevent clobbering other preferences.
 * Schema: id (uuid), user_id (uuid, unique), settings (jsonb), updated_at.
 */
export async function upsertUserSettings(userId, newSettings = {}) {
  if (!isSupabaseConfigured || !supabase || !userId) return null

  try {
    const existing = await fetchUserSettings(userId)
    const mergedSettings = { ...(existing || {}), ...newSettings }

    const row = {
      id: toUuid(`settings-${userId}`),
      user_id: userId,
      settings: mergedSettings,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('user_settings')
      .upsert(row, { onConflict: 'user_id' })
      .select()

    if (error) {
      console.error('[user_settings] UPSERT failed:', {
        table: 'user_settings',
        operation: 'UPSERT',
        userId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return null
    }

    return data?.[0]?.settings || mergedSettings
  } catch (err) {
    console.error('[user_settings] UPSERT exception:', err)
    return null
  }
}

/**
 * Fetches custom themes from themes table for the authenticated user.
 * Schema: id (uuid), user_id (uuid), name (text), settings (jsonb), created_at, updated_at.
 */
export async function fetchUserThemes(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return []

  return dedupeRequest(`themes:${userId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (error) {
        classifyAndReportError(error)
        throw new Error(`[themes] SELECT failed: ${error.message}`)
      }

      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        isPreset: false,
        colors: row.settings || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    } catch (err) {
      classifyAndReportError(err)
      throw err
    }
  })
}

/**
 * Upserts custom theme into themes table.
 * Uses the UNIQUE constraint (user_id, name) so saves are proper UPSERTs.
 * Schema: id (uuid), user_id (uuid), name (text), settings (jsonb), updated_at.
 */
export async function upsertUserThemeRemote(theme, userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null

  try {
    const validId = toUuid(theme.id || `theme-${userId}-${theme.name}`)
    const row = {
      id: validId,
      user_id: userId,
      name: (theme.name || 'Custom Theme').trim(),
      settings: theme.colors || theme.settings || {},
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('themes')
      .upsert(row, { onConflict: 'user_id,name' })
      .select()

    if (error) {
      console.error('[themes] UPSERT failed:', {
        table: 'themes',
        operation: 'UPSERT',
        recordId: row.id,
        userId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return null
    }

    const saved = data?.[0]
    if (saved) {
      return {
        id: saved.id,
        userId: saved.user_id,
        name: saved.name,
        isPreset: false,
        colors: saved.settings || {},
        createdAt: saved.created_at,
        updatedAt: saved.updated_at,
      }
    }
    return null
  } catch (err) {
    console.error('[themes] UPSERT exception:', err)
    return null
  }
}

/**
 * Deletes custom theme from themes table.
 */
export async function deleteUserThemeRemote(themeId, userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return false

  try {
    const validId = toUuid(themeId)
    const { error } = await supabase
      .from('themes')
      .delete()
      .eq('id', validId)
      .eq('user_id', userId)

    if (error) {
      console.error('[themes] DELETE failed:', {
        table: 'themes',
        operation: 'DELETE',
        recordId: validId,
        userId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return false
    }

    return true
  } catch (err) {
    console.error('[themes] DELETE exception:', err)
    return false
  }
}
