/**
  * ID to UUID Converter Utility
  * Converts Dexie string IDs (e.g., 'task-1', 'college', 'tasks') into valid, deterministic PostgreSQL UUIDs.
  */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function toUuid(str) {
  if (!str) return crypto.randomUUID()
  if (UUID_REGEX.test(str)) return str

  // Generate deterministic 32-character hex hash from string
  let h1 = 0xdeadbeef ^ 0
  let h2 = 0x41c6ce57 ^ 0

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0')
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0')
  const hex3 = Math.abs(h1 ^ h2).toString(16).padStart(8, '0')
  const hex4 = Math.abs(h1 + h2).toString(16).padStart(8, '0')

  const fullHex = (hex1 + hex2 + hex3 + hex4).slice(0, 32)

  // Format as valid 8-4-4-4-12 UUID string
  return `${fullHex.slice(0, 8)}-${fullHex.slice(8, 12)}-4${fullHex.slice(13, 16)}-8${fullHex.slice(17, 20)}-${fullHex.slice(20, 32)}`
}
