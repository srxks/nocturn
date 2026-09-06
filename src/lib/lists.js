import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { toUuid } from './idUtils.js'

export function mapRowToList(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    icon: row.icon || null,
    color: row.color || null,
    position: row.position || 0,
    system: false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  }
}

export function mapListToRow(list, userId) {
  if (!list || typeof list !== 'object') return null
  const trimmedName = (list.name || '').trim()
  if (!trimmedName) return null

  // Ensure id is not the user's ID
  const listId = list.id && list.id !== userId ? list.id : crypto.randomUUID()
  const validId = toUuid(listId)

  return {
    id: validId,
    user_id: userId,
    name: trimmedName,
    icon: list.icon || null,
    color: list.color || null,
    position: typeof list.position === 'number' ? list.position : 0,
    created_at: list.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function fetchUserLists(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return []

  try {
    const { data, error } = await supabase
      .from('task_lists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[task_lists] SELECT failed:', {
        table: 'task_lists',
        operation: 'SELECT',
        recordId: userId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return []
    }

    return (data || []).map(mapRowToList).filter(Boolean)
  } catch (err) {
    console.error('[task_lists] SELECT exception:', err)
    return []
  }
}

export async function upsertListRemote(list, userId) {
  if (!isSupabaseConfigured || !supabase || !userId || !list) return null

  // Validate list name: name is NOT NULL in database schema
  const trimmedName = (list.name || '').trim()
  if (!trimmedName) {
    console.warn('[task_lists] Skipping upsert: missing or empty list name', list)
    return null
  }

  // A task list's ID must never be the user's ID
  if (list.id === userId) {
    console.warn('[task_lists] Skipping upsert: list id cannot be userId', list.id)
    return null
  }

  // System lists (e.g. 'tasks', 'my-day', etc.) must not be synced as custom lists
  if (
    list.system ||
    list.id === 'tasks' ||
    list.id === 'my-day' ||
    list.id === 'all' ||
    list.id === 'completed'
  ) {
    return null
  }

  try {
    const row = mapListToRow(list, userId)
    if (!row || !row.name) return null

    const { data, error } = await supabase
      .from('task_lists')
      .upsert(row, { onConflict: 'id' })
      .select()

    if (error) {
      console.error('[task_lists] UPSERT failed:', {
        table: 'task_lists',
        operation: 'UPSERT',
        recordId: row.id,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return null
    }

    return mapRowToList(data?.[0])
  } catch (err) {
    console.error('[task_lists] UPSERT exception:', err)
    return null
  }
}

export async function deleteListRemote(listId, userId) {
  if (!isSupabaseConfigured || !supabase || !userId || !listId) return false
  if (listId === userId || listId === 'tasks' || listId === 'my-day') return false

  try {
    const validId = toUuid(listId)
    const { error } = await supabase
      .from('task_lists')
      .delete()
      .eq('id', validId)
      .eq('user_id', userId)

    if (error) {
      console.error('[task_lists] DELETE failed:', {
        table: 'task_lists',
        operation: 'DELETE',
        recordId: validId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return false
    }

    return true
  } catch (err) {
    console.error('[task_lists] DELETE exception:', err)
    return false
  }
}
