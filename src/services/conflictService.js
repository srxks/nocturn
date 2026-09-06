/**
 * conflictService.js
 *
 * Deterministic Last-Write-Wins (LWW) conflict resolution and Tombstone tracking.
 *
 * Rules:
 * 1. Every mutation receives an ISO client timestamp (updatedAt).
 * 2. When reconciling, compare timestamps. The newest valid mutation wins.
 * 3. Deletions create tombstones with `deletedAt`. A tombstone prevents older
 *    remote or offline mutations from resurrecting deleted records.
 */

import { db } from '../db/db.js'

/**
 * Parses any date/timestamp into epoch milliseconds. Fallback to 0 if invalid.
 */
export function getTimestampMs(record) {
  if (!record) return 0
  const raw =
    record.updatedAt ||
    record.updated_at ||
    record.completedAt ||
    record.createdAt ||
    record.created_at ||
    record.date_added
  if (!raw) return 0
  const t = new Date(raw).getTime()
  return isNaN(t) ? 0 : t
}

/**
 * Deterministic Last-Write-Wins conflict resolution.
 * Returns: 'local' | 'remote' | 'equal'
 */
export function resolveConflict(localRecord, remoteRecord) {
  if (!localRecord && !remoteRecord) return 'equal'
  if (!localRecord) return 'remote'
  if (!remoteRecord) return 'local'

  const localTime = getTimestampMs(localRecord)
  const remoteTime = getTimestampMs(remoteRecord)

  if (localTime > remoteTime) return 'local'
  if (remoteTime > localTime) return 'remote'
  return 'equal'
}

/**
 * Records a deletion tombstone in Dexie.
 */
export async function recordTombstone(table, entityId, userId) {
  if (!table || !entityId) return
  try {
    const tombstone = {
      id: `${table}:${entityId}`,
      table,
      entityId: String(entityId),
      deletedAt: new Date().toISOString(),
      userId: userId || null,
    }
    if (db.tombstones) {
      await db.tombstones.put(tombstone)
    }
  } catch (err) {
    console.warn('[conflictService] Failed to record tombstone:', err)
  }
}

/**
 * Checks if a record has an active tombstone that is newer than a given remote timestamp.
 */
export async function isTombstoned(table, entityId, remoteTimestamp = null) {
  if (!table || !entityId || !db.tombstones) return false
  try {
    const tombstone = await db.tombstones.get(`${table}:${entityId}`)
    if (!tombstone) return false

    if (!remoteTimestamp) return true

    const tombstoneTime = new Date(tombstone.deletedAt).getTime()
    const remoteTime = new Date(remoteTimestamp).getTime()
    return tombstoneTime >= remoteTime
  } catch {
    return false
  }
}

/**
 * Retrieves all tombstones for a given user.
 */
export async function getTombstones(userId) {
  if (!db.tombstones) return []
  try {
    if (userId) {
      return await db.tombstones.where('userId').equals(userId).toArray()
    }
    return await db.tombstones.toArray()
  } catch {
    return []
  }
}

/**
 * Removes a tombstone once its deletion has been confirmed remotely.
 */
export async function clearTombstone(table, entityId) {
  if (!db.tombstones) return
  try {
    await db.tombstones.delete(`${table}:${entityId}`)
  } catch {
    // ignore
  }
}
