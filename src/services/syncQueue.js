/**
 * syncQueue.js
 *
 * Offline-first mutation queue backed by centralized storage.
 *
 * Guarantees that mutations executed while offline or during temporary network
 * failures are reliably preserved and retried with exponential backoff when connectivity returns.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { getStorageItem, setStorageItem, removeStorageItem } from '../utils/storageUtils.js'

const QUEUE_KEY = 'nocturn_sync_queue'

// ─── Queue helpers ────────────────────────────────────────────────────────────

function readQueue() {
  try {
    const raw = getStorageItem(QUEUE_KEY, null)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeQueue(queue) {
  try {
    setStorageItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // quota exceeded — ignore
  }
}

function clearQueue() {
  removeStorageItem(QUEUE_KEY)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enqueue a failed or offline mutation for later retry.
 * Deduplicates by table and payload.id to prevent queue bloat.
 *
 * @param {'upsert'|'delete'} operation
 * @param {string} table - Supabase table name
 * @param {object} payload - Row payload for upsert, or { id } for delete
 */
export function enqueueMutation(operation, table, payload) {
  if (!table || !payload) return
  const queue = readQueue()
  const payloadId = payload.id || payload.user_id

  // Deduplicate existing pending mutation for the same entity
  const existingIdx = queue.findIndex(
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
    // If the latest operation is delete, replace previous upsert
    queue[existingIdx] = newEntry
  } else {
    queue.push(newEntry)
  }

  writeQueue(queue)
}

/**
 * Drain the queue — retry all pending mutations against Supabase with exponential backoff.
 * Called on reconnect, periodic sync, and after initial auth.
 */
export async function drainSyncQueue() {
  if (!isSupabaseConfigured || !supabase) return { drained: 0, remaining: 0 }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { drained: 0, remaining: readQueue().length }

  const queue = readQueue()
  if (queue.length === 0) return { drained: 0, remaining: 0 }

  const nowMs = Date.now()
  const remaining = []
  let drainedCount = 0

  for (const entry of queue) {
    // Respect exponential backoff delay
    if (entry.nextRetryAt && entry.nextRetryAt > nowMs) {
      remaining.push(entry)
      continue
    }

    try {
      if (entry.operation === 'upsert') {
        const onConflict =
          entry.table === 'user_settings' || entry.table === 'timer_settings' || entry.table === 'user_profiles'
            ? 'user_id'
            : entry.table === 'themes'
            ? 'user_id, name'
            : 'id'

        const { error } = await supabase
          .from(entry.table)
          .upsert(entry.payload, { onConflict })

        if (error) {
          // Fatal auth / schema errors shouldn't be retried endlessly
          if (error.code === 'PGRST301' || error.code === '42501' || error.code === '42P01') {
            console.warn(`[syncQueue] Dropping non-retryable error for ${entry.table}:`, error.message)
          } else {
            entry.attempts = (entry.attempts || 0) + 1
            // Exponential backoff: 2s, 4s, 8s, 16s... max 60s
            const backoffMs = Math.min(60000, Math.pow(2, entry.attempts) * 1000)
            entry.nextRetryAt = Date.now() + backoffMs
            if (entry.attempts < 8) remaining.push(entry)
          }
        } else {
          drainedCount++
        }
      } else if (entry.operation === 'delete') {
        const idToDelete = entry.payload?.id
        if (idToDelete) {
          const { error } = await supabase
            .from(entry.table)
            .delete()
            .eq('id', idToDelete)

          if (error && error.code !== 'PGRST116') {
            entry.attempts = (entry.attempts || 0) + 1
            const backoffMs = Math.min(60000, Math.pow(2, entry.attempts) * 1000)
            entry.nextRetryAt = Date.now() + backoffMs
            if (entry.attempts < 8) remaining.push(entry)
          } else {
            drainedCount++
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
            entry.attempts = (entry.attempts || 0) + 1
            const backoffMs = Math.min(60000, Math.pow(2, entry.attempts) * 1000)
            entry.nextRetryAt = Date.now() + backoffMs
            if (entry.attempts < 8) remaining.push(entry)
          } else {
            drainedCount++
          }
        }
      }
    } catch {
      entry.attempts = (entry.attempts || 0) + 1
      const backoffMs = Math.min(60000, Math.pow(2, entry.attempts) * 1000)
      entry.nextRetryAt = Date.now() + backoffMs
      if (entry.attempts < 8) remaining.push(entry)
    }
  }

  if (remaining.length === 0) {
    clearQueue()
  } else {
    writeQueue(remaining)
  }

  return { drained: drainedCount, remaining: remaining.length }
}

/**
 * Purges any pending vocab mutations for a user (e.g. on Delete All Words).
 */
export function purgePendingVocabMutations(userId) {
  const queue = readQueue()
  const filtered = queue.filter((entry) => {
    if (entry.table === 'vocab_words') {
      if (!userId || entry.payload?.user_id === userId || entry.payload?.userId === userId) {
        return false
      }
    }
    return true
  })
  writeQueue(filtered)
}

/**
 * Returns the number of pending mutations.
 */
export function pendingCount() {
  return readQueue().length
}
