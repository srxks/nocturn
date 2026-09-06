/**
 * storageUtils.js
 *
 * Centralized local storage utility for Nocturn.
 * Supabase and IndexedDB (Dexie) are the authoritative sources of truth for user data.
 *
 * This utility:
 * 1. Guarantees that Supabase session tokens (sb-*-auth-token) are NEVER touched.
 * 2. Purges obsolete legacy localStorage caches (e.g. old tasks, themes, timer, vocab caches)
 *    so stale local data never conflicts with or overwrites Supabase.
 * 3. Provides safe, typed get/set/remove wrappers.
 */

// Keys that are explicitly permitted in localStorage (e.g. offline queue, temporary UI preference)
const PERMITTED_KEYS = new Set([
  'nocturn_sync_queue',
  'nocturn_user_name',
])

/**
 * Returns true if a key is a protected Supabase auth/session key.
 */
function isSupabaseAuthKey(key) {
  if (!key) return false
  return (
    key.startsWith('sb-') ||
    key.includes('supabase.auth') ||
    key.includes('auth-token')
  )
}

/**
 * Scans localStorage and safely purges obsolete cached user data from earlier versions
 * without touching active Supabase authentication tokens.
 */
export function cleanupLegacyLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return

  try {
    const keysToRemove = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key) continue

      // CRITICAL: NEVER delete Supabase auth tokens
      if (isSupabaseAuthKey(key)) continue

      // Allow approved temporary UI keys
      if (PERMITTED_KEYS.has(key)) continue

      // Identify obsolete data keys
      const lower = key.toLowerCase()
      const isLegacyData =
        lower.startsWith('nocturn_') ||
        lower.includes('task') ||
        lower.includes('theme') ||
        lower.includes('timer') ||
        lower.includes('vocab') ||
        lower.includes('plan') ||
        lower.includes('schedule') ||
        lower.includes('profile') ||
        lower.includes('setting')

      if (isLegacyData) {
        keysToRemove.push(key)
      }
    }

    for (const key of keysToRemove) {
      window.localStorage.removeItem(key)
    }

    if (keysToRemove.length > 0) {
      console.debug('[storageUtils] Purged legacy localStorage keys:', keysToRemove)
    }
  } catch (err) {
    console.warn('[storageUtils] LocalStorage cleanup notice:', err)
  }
}

/**
 * Safe getItem wrapper with fallback
 */
export function getStorageItem(key, defaultValue = null) {
  if (typeof window === 'undefined' || !window.localStorage) return defaultValue
  try {
    const val = window.localStorage.getItem(key)
    return val !== null ? val : defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Safe setItem wrapper
 */
export function setStorageItem(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, String(value))
    }
  } catch {
    // Quota exceeded or private browsing restriction — ignore
  }
}

/**
 * Safe removeItem wrapper
 */
export function removeStorageItem(key) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore
  }
}
