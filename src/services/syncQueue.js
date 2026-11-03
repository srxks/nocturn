/**
 * syncQueue.js
 *
 * Offline-first mutation queue backed by IndexedDB (Dexie) with localStorage fallback.
 *
 * Guarantees:
 * 1. Mutations executed while offline or during temporary network failures are
 *    durably stored in Dexie and retried with exponential backoff.
 * 2. Deduplicates by entity id/user_id to prevent queue bloat.
 * 3. Individual mutation acknowledgment (never wipes queue blindly).
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { getStorageItem, setStorageItem, removeStorageItem } from '../utils/storageUtils.js'
import { setSyncingState, reportNetworkSuccess, classifyAndReportError, isNetworkInCooldown } from './networkStateService.js'
import { db } from '../db/db.js'

const QUEUE_KEY = 'nocturn_sync_queue'

// In-memory / fast cached queue representation
let cachedQueue = null

async function loadQueueFromStorage() {
  // 1. Try Dexie first if table exists
  if (db && db.syncMutations) {
    try {
      const items = await db.syncMutations.toArray()
      if (items && items.length > 0) {
        cachedQueue = items
        return items
      }
    } catch {
      // Fallback
    }
  }

  // 2. Check localStorage
  try {
    const raw = getStorageItem(QUEUE_KEY, null)
    const items = raw ? JSON.parse(raw) : []
    cachedQueue = items
    // Migrate localStorage items into Dexie if Dexie is available
    if (items.length > 0 && db && db.syncMutations) {
      for (const item of items) {
        await db.syncMutations.put(item).catch(() => {})
      }
      removeStorageItem(QUEUE_KEY)
    }
    return items
  } catch {
    cachedQueue = []
    return []
  }
}

async function persistEntry(entry) {
  if (db && db.syncMutations) {
    try {
      await db.syncMutations.put(entry)
    } catch {
      // ignore
    }
  }
  // Also sync to localStorage for redundancy
  try {
    const list = cachedQueue || []
    setStorageItem(QUEUE_KEY, JSON.stringify(list))
  } catch {
    // quota exceeded
  }
}

async function removeEntry(entryId) {
  if (db && db.syncMutations) {
    try {
      await db.syncMutations.delete(entryId)
    } catch {
      // ignore
    }
  }
  if (cachedQueue) {
    cachedQueue = cachedQueue.filter((e) => e.id !== entryId)
    try {
      setStorageItem(QUEUE_KEY, JSON.stringify(cachedQueue))
    } catch {
      // ignore
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enqueue a failed or offline mutation for later retry.
 */
export async function enqueueMutation(operation, table, payload) {
  if (!table || !payload) return
  if (!cachedQueue) await loadQueueFromStorage()

  const payloadId = payload.id || payload.user_id

  // Deduplicate existing pending mutation for the same entity
  const existingIdx = cachedQueue.findIndex(
    (entry) => entry.table === table && (entry.payload?.id === payloadId || entry.payload?.user_id === payloadId)
  )

  const newEntry = {
    id: crypto.randomUUID(),
    operation,
    table,
    payload,
    enqueuedAt: new Date().toISOString(),
    nextRetryAt: Date.now(),
    attempts: 0,
  }

  if (existingIdx >= 0) {
    const oldId = cachedQueue[existingIdx].id
    cachedQueue[existingIdx] = newEntry
    await removeEntry(oldId)
  } else {
    cachedQueue.push(newEntry)
  }

  await persistEntry(newEntry)
}

/**
 * Drain the queue — retry all pending mutations against Supabase with exponential backoff.
 */
export async function drainSyncQueue() {
  if (!isSupabaseConfigured || !supabase) return { drained: 0, remaining: 0 }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const q = cachedQueue || (await loadQueueFromStorage())
    return { drained: 0, remaining: q.length }
  }
  if (isNetworkInCooldown()) {
    const q = cachedQueue || (await loadQueueFromStorage())
    return { drained: 0, remaining: q.length, inCooldown: true }
  }

  const queue = await loadQueueFromStorage()
  if (!queue || queue.length === 0) return { drained: 0, remaining: 0 }

  setSyncingState(true)
  try {
    const nowMs = Date.now()
    let drainedCount = 0

    for (let i = 0; i < queue.length; i++) {
      const entry = queue[i]

      // Respect exponential backoff delay
      if (entry.nextRetryAt && entry.nextRetryAt > nowMs) {
        continue
      }

      try {
        let opSuccess = false

        if (entry.operation === 'upsert') {
          const onConflict =
            entry.table === 'user_settings' || entry.table === 'timer_settings' || entry.table === 'user_profiles'
              ? 'user_id'
              : entry.table === 'themes'
              ? 'user_id, name'
              : 'id'

          // Sanitize vocab_words difficulty to lowercase to adhere to check constraint
          let payloadToUpsert = entry.payload
          if (entry.table === 'vocab_words' && payloadToUpsert?.difficulty) {
            payloadToUpsert = {
              ...payloadToUpsert,
              difficulty: String(payloadToUpsert.difficulty).trim().toLowerCase(),
            }
          }

          const { error } = await supabase
            .from(entry.table)
            .upsert(payloadToUpsert, { onConflict })

          if (error) {
            classifyAndReportError(error)
            if (error.code === 'PGRST301' || error.code === '42501' || error.code === '42P01') {
              console.warn(`[syncQueue] Dropping non-retryable error for ${entry.table}:`, error.message)
              await removeEntry(entry.id)
            } else {
              entry.attempts = (entry.attempts || 0) + 1
              const backoffMs = Math.min(60000, Math.pow(2, entry.attempts) * 1000)
              entry.nextRetryAt = Date.now() + backoffMs
              if (entry.attempts >= 8) {
                await removeEntry(entry.id)
              } else {
                await persistEntry(entry)
              }
            }

            if (isNetworkInCooldown()) break
          } else {
            opSuccess = true
          }
        } else if (entry.operation === 'delete') {
          const idToDelete = entry.payload?.id
          if (idToDelete) {
            const { error } = await supabase
              .from(entry.table)
              .delete()
              .eq('id', idToDelete)

            if (error && error.code !== 'PGRST116') {
              classifyAndReportError(error)
              entry.attempts = (entry.attempts || 0) + 1
              const backoffMs = Math.min(60000, Math.pow(2, entry.attempts) * 1000)
              entry.nextRetryAt = Date.now() + backoffMs
              if (entry.attempts >= 8) {
                await removeEntry(entry.id)
              } else {
                await persistEntry(entry)
              }
              if (isNetworkInCooldown()) break
            } else {
              opSuccess = true
            }
          }
        } else if (entry.operation === 'delete_all_user_vocab') {
          const userId = entry.payload?.user_id
          if (userId) {
            const { error } = await supabase
              .from('vocab_words')
              .delete()
              .eq('user_id', userId)

            if (error && error.code !== 'PGRST116') {
              classifyAndReportError(error)
              entry.attempts = (entry.attempts || 0) + 1
              const backoffMs = Math.min(60000, Math.pow(2, entry.attempts) * 1000)
              entry.nextRetryAt = Date.now() + backoffMs
              if (entry.attempts >= 8) {
                await removeEntry(entry.id)
              } else {
                await persistEntry(entry)
              }
              if (isNetworkInCooldown()) break
            } else {
              opSuccess = true
            }
          }
        }

        if (opSuccess) {
          reportNetworkSuccess()
          await removeEntry(entry.id)
          drainedCount++
        }
      } catch (err) {
        classifyAndReportError(err)
        entry.attempts = (entry.attempts || 0) + 1
        const backoffMs = Math.min(60000, Math.pow(2, entry.attempts) * 1000)
        entry.nextRetryAt = Date.now() + backoffMs
        if (entry.attempts >= 8) {
          await removeEntry(entry.id)
        } else {
          await persistEntry(entry)
        }
        if (isNetworkInCooldown()) break
      }
    }

    const remaining = cachedQueue ? cachedQueue.length : 0
    return { drained: drainedCount, remaining }
  } finally {
    setSyncingState(false)
  }
}

/**
 * Purges any pending vocab mutations for a user (e.g. on Delete All Words).
 */
export async function purgePendingVocabMutations(userId) {
  if (!cachedQueue) await loadQueueFromStorage()
  const toDelete = cachedQueue.filter((entry) => {
    if (entry.table === 'vocab_words') {
      if (!userId || entry.payload?.user_id === userId || entry.payload?.userId === userId) {
        return true
      }
    }
    return false
  })

  for (const item of toDelete) {
    await removeEntry(item.id)
  }
}

/**
 * Returns the number of pending mutations.
 */
export function pendingCount() {
  if (cachedQueue) return cachedQueue.length
  try {
    const raw = getStorageItem(QUEUE_KEY, null)
    return raw ? JSON.parse(raw).length : 0
  } catch {
    return 0
  }
}
