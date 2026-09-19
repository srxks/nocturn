/**
 * syncCoordinator.js
 *
 * Centralized Global Sync Coordinator for Nocturn.
 *
 * Guarantees:
 * 1. Single global sync lock: only one full cloud sync can run at a time.
 * 2. In-flight request deduplication: concurrent requests for the same resource
 *    share a single HTTP promise.
 * 3. Cooldown & circuit breaker: suppresses requests during network drops (ERR_CONNECTION_CLOSED).
 * 4. Throttles auth-triggered and visibility-triggered syncs (min 15s interval).
 * 5. Preserves Dexie local cache as source of truth during offline / network errors.
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
 * If a request for `key` is already pending, subsequent calls receive the existing promise.
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

// ─── 2. Coordinated Cloud Sync ────────────────────────────────────────────────
/**
 * Executes a centrally coordinated cloud sync.
 *
 * @param {string} userId - Authenticated user UUID
 * @param {Function} syncFn - The underlying syncWithCloud function
 * @param {object} options
 * @param {boolean} [options.force=false] - Bypass interval throttle (e.g. user manually clicked Sync)
 * @param {string} [options.source='unknown'] - Origin of the sync request for diagnostics
 */
export async function runCoordinatedSync(userId, syncFn, options = {}) {
  const { force = false, source = 'unknown' } = options

  if (!userId) {
    return { success: false, synced: 0, reason: 'unauthenticated' }
  }

  // 1. Return active in-flight sync if one is currently executing
  if (activeSyncPromise) {
    return activeSyncPromise
  }

  // 2. Offline / Cooldown guard (circuit breaker for connection drops)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { success: true, synced: 0, offline: true }
  }

  if (!force && isNetworkInCooldown()) {
    return { success: false, synced: 0, offline: true, inCooldown: true }
  }

  // 3. Minimum interval throttle
  const now = Date.now()
  if (!force && now - lastSyncCompletedAt < MIN_SYNC_INTERVAL_MS) {
    return { success: true, synced: 0, throttled: true }
  }

  // 4. Launch coordinated execution
  activeSyncPromise = (async () => {
    try {
      const result = await syncFn(userId)
      if (result && result.success) {
        lastSyncCompletedAt = Date.now()
        lastSyncSource = source
      }
      return result
    } finally {
      activeSyncPromise = null
    }
  })()

  return activeSyncPromise
}

/**
 * Returns true if a full cloud sync is currently running.
 */
export function isSyncInProgress() {
  return Boolean(activeSyncPromise)
}

/**
 * Returns the epoch timestamp of the last successful sync.
 */
export function getLastSyncCompletedAt() {
  return lastSyncCompletedAt
}

/**
 * Returns the source identifier of the last successful sync.
 */
export function getLastSyncSource() {
  return lastSyncSource
}
