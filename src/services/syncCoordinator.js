/**
 * syncCoordinator.js
 *
 * Centralized Global Sync Coordinator for Nocturn.
 *
 * Guarantees:
 * 1. Single global sync lock: only one full cloud sync can run at a time per tab.
 * 2. Cross-tab leadership coordination via Web Locks API (`navigator.locks`).
 * 3. In-flight request deduplication: concurrent requests for the same resource
 *    share a single HTTP promise.
 * 4. Cooldown & circuit breaker: suppresses requests during network drops.
 * 5. Throttles auth-triggered and visibility-triggered syncs (min 15s interval).
 * 6. Preserves Dexie local cache as source of truth during offline / network errors.
 */

import { isNetworkInCooldown } from './networkStateService.js'

let activeSyncPromise = null
let lastSyncCompletedAt = 0
let lastSyncSource = 'none'
const MIN_SYNC_INTERVAL_MS = 15000 // 15 seconds

// ─── 1. In-Flight Request Deduplication ────────────────────────────────────────
const inFlightRequests = new Map()

/**
 * Deduplicates concurrent in-flight async operations by key.
 */
export async function dedupeRequest(key, fetcher) {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)
  }

  const promise = (async () => {
    try {
      return await fetcher()
    } finally {
      inFlightRequests.delete(key)
    }
  })()

  inFlightRequests.set(key, promise)
  return promise
}

// ─── 2. Cross-Tab Lock Wrapper ────────────────────────────────────────────────
async function acquireTabSyncLock(fn) {
  if (typeof navigator !== 'undefined' && navigator.locks && navigator.locks.request) {
    try {
      return await navigator.locks.request('nocturn_cloud_sync_lock', { ifAvailable: true }, async (lock) => {
        if (!lock) {
          // Another tab is actively syncing
          return { success: true, synced: 0, sharedLock: true }
        }
        return await fn()
      })
    } catch {
      return await fn()
    }
  }
  return await fn()
}

// ─── 3. Coordinated Cloud Sync ────────────────────────────────────────────────
/**
 * Executes a centrally coordinated cloud sync.
 */
export async function runCoordinatedSync(userId, syncFn, options = {}) {
  const { force = false, source = 'unknown' } = options

  if (!userId) {
    return { success: false, synced: 0, reason: 'unauthenticated' }
  }

  // Return active in-flight sync if one is currently executing
  if (activeSyncPromise) {
    return activeSyncPromise
  }

  // Offline / Cooldown guard
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { success: true, synced: 0, offline: true }
  }

  if (!force && isNetworkInCooldown()) {
    return { success: false, synced: 0, offline: true, inCooldown: true }
  }

  // Minimum interval throttle
  const now = Date.now()
  if (!force && now - lastSyncCompletedAt < MIN_SYNC_INTERVAL_MS) {
    return { success: true, synced: 0, throttled: true }
  }

  // Launch execution under Web Locks cross-tab protection
  activeSyncPromise = (async () => {
    try {
      return await acquireTabSyncLock(async () => {
        const result = await syncFn(userId)
        if (result && result.success) {
          lastSyncCompletedAt = Date.now()
          lastSyncSource = source
        }
        return result
      })
    } finally {
      activeSyncPromise = null
    }
  })()

  return activeSyncPromise
}

export function isSyncInProgress() {
  return Boolean(activeSyncPromise)
}

export function getLastSyncCompletedAt() {
  return lastSyncCompletedAt
}

export function getLastSyncSource() {
  return lastSyncSource
}

export async function syncNow(userId = null) {
  try {
    const { forceManualSync, drainSyncQueue } = await import('./syncService.js')
    if (userId) {
      return await forceManualSync(userId)
    }
    const { supabase } = await import('../lib/supabase.js')
    let uid = null
    if (supabase) {
      const { data } = await supabase.auth.getUser()
      uid = data?.user?.id || null
    }
    if (uid) {
      return await forceManualSync(uid)
    }
    return await drainSyncQueue()
  } catch {
    return { success: false }
  }
}
