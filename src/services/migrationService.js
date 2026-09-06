import { syncWithCloud } from './syncService'

/**
 * Migrates local Dexie IndexedDB data into Supabase safely using the dependency-aware sync engine.
 */
export async function migrateLocalDataToSupabase(userId) {
  return syncWithCloud(userId)
}
