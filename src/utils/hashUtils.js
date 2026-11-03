/**
 * hashUtils.js
 *
 * Deterministic JSON canonical hashing for sync payloads.
 * Produces stable FNV-1a / Murmur-style 32-bit hash strings from objects
 * regardless of key ordering.
 */

function sortObjectKeys(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys)
  }
  const sorted = {}
  const keys = Object.keys(obj).sort()
  for (const k of keys) {
    sorted[k] = sortObjectKeys(obj[k])
  }
  return sorted
}

/**
 * Computes a fast, deterministic hex hash from any object/record,
 * omitting volatile timestamp keys that don't represent user changes.
 */
export function computeEntityHash(record, ignoredKeys = ['updated_at', 'updatedAt', 'created_at', 'createdAt', 'syncedAt', 'date_added']) {
  if (!record || typeof record !== 'object') return ''

  const cleaned = {}
  for (const [k, v] of Object.entries(record)) {
    if (!ignoredKeys.includes(k) && v !== undefined) {
      cleaned[k] = v
    }
  }

  const canonicalString = JSON.stringify(sortObjectKeys(cleaned))

  // 32-bit FNV-1a hash
  let hash = 0x811c9dc5
  for (let i = 0; i < canonicalString.length; i++) {
    hash ^= canonicalString.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }
  return hash.toString(16)
}

/**
 * Returns true if two records have identical business/content data,
 * ignoring timestamps and ordering.
 */
export function areRecordsContentEqual(recA, recB, ignoredKeys) {
  if (!recA || !recB) return false
  return computeEntityHash(recA, ignoredKeys) === computeEntityHash(recB, ignoredKeys)
}
