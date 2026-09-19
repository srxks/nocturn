import { useState } from 'react'
import { Download, Trash2, AlertTriangle, ShieldCheck, Database, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '../../db/db'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { useTheme } from '../../context/useTheme'
import { syncWithCloud } from '../../services/syncService'

export default function DataManagementCard() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { uiStyle } = useTheme()
  const isAngular = uiStyle === 'angular'

  const [isExporting, setIsExporting] = useState(false)
  const [isPurging, setIsPurging] = useState(false)
  const [showConfirmPurge, setShowConfirmPurge] = useState(false)

  // 1. Export Data to JSON
  const handleExportData = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const [tasks, lists, vocab, sessions, timerSettings, userSettings] = await Promise.all([
        db.tasks.toArray(),
        db.lists.toArray(),
        db.vocab.toArray(),
        db.pomodoroSessions.toArray(),
        db.timerSettings.toArray(),
        db.userSettings ? db.userSettings.toArray() : Promise.resolve([]),
      ])

      const userId = user?.id || null
      const userTasks = userId ? tasks.filter((t) => !t.userId || t.userId === userId) : tasks
      const userLists = userId ? lists.filter((l) => !l.userId || l.userId === userId) : lists
      const userVocab = userId ? vocab.filter((v) => !v.userId || v.userId === userId) : vocab
      const userSessions = userId ? sessions.filter((s) => !s.userId || s.userId === userId) : sessions

      const exportPayload = {
        app: 'Nocturn',
        exportVersion: '1.0',
        exportedAt: new Date().toISOString(),
        userId: userId,
        meta: {
          tasksCount: userTasks.length,
          listsCount: userLists.length,
          vocabCount: userVocab.length,
          sessionsCount: userSessions.length,
        },
        data: {
          tasks: userTasks,
          lists: userLists,
          vocab: userVocab,
          pomodoroSessions: userSessions,
          timerSettings,
          userSettings,
        },
      }

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `nocturn-backup-${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      addToast(
        `Exported ${userTasks.length} tasks and ${userVocab.length} vocabulary words`,
        'success',
        3500
      )
    } catch (err) {
      console.error('[DataManagementCard] Export error:', err)
      addToast('Failed to export data backup', 'error', 3500)
    } finally {
      setIsExporting(false)
    }
  }

  // 2. Purge Local Cache & Re-sync from Supabase
  const handlePurgeAndResync = async () => {
    if (isPurging) return
    setIsPurging(true)
    try {
      // Clear local Dexie caches
      await db.tasks.clear()
      await db.lists.clear()
      await db.vocab.clear()
      await db.pomodoroSessions.clear()
      if (db.dailyVocabLogs) await db.dailyVocabLogs.clear()
      if (db.tombstones) await db.tombstones.clear()

      // Pull fresh data from Supabase
      if (user?.id) {
        const syncRes = await syncWithCloud(user.id)
        addToast(
          `Local cache cleared. Freshly synced ${syncRes.synced} items from cloud.`,
          'success',
          4000
        )
      } else {
        addToast('Local cache purged successfully.', 'info', 3000)
      }

      setShowConfirmPurge(false)
    } catch (err) {
      console.error('[DataManagementCard] Purge error:', err)
      addToast(err?.message || 'Failed to purge cache', 'error', 3500)
    } finally {
      setIsPurging(false)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide px-1">
        {isAngular ? '[ DATA_MANAGEMENT ]' : 'Data & Backups'}
      </h2>

      <div
        className={`nocturn-card p-5 sm:p-6 border border-nocturn-border flex flex-col gap-4 ${
          isAngular ? 'rounded-none angular-chamfer' : 'rounded-2xl'
        }`}
      >
        {/* Export JSON Option */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nocturn-border/50">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-nocturn-surface border border-nocturn-border flex items-center justify-center text-nocturn-accent shrink-0">
              <Download className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold text-white block">
                Export Workspace Data (JSON)
              </span>
              <span className="text-xs text-nocturn-muted block mt-0.5">
                Download a complete, offline JSON backup of your tasks, lists, sessions, and vocabulary.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportData}
            disabled={isExporting}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-nocturn-border transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-nocturn-accent" />
            <span>{isExporting ? 'Exporting...' : 'Export Backup'}</span>
          </button>
        </div>

        {/* Purge Local Cache Option */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-nocturn-surface border border-nocturn-border flex items-center justify-center text-rose-400 shrink-0">
              <Database className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold text-white block">
                Purge Local Cache & Re-sync
              </span>
              <span className="text-xs text-nocturn-muted block mt-0.5">
                Resets the local browser database and pulls fresh data from Supabase without deleting cloud records.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirmPurge(true)}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Local Cache</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmPurge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isPurging && setShowConfirmPurge(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`relative w-full max-w-md bg-nocturn-card border border-nocturn-border p-6 shadow-2xl z-10 space-y-5 ${
                isAngular ? 'rounded-none angular-chamfer font-mono' : 'rounded-3xl'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Purge Local Cache?
                    </h3>
                    <span className="text-xs text-nocturn-muted">
                      Safe local storage reset
                    </span>
                  </div>
                </div>
                {!isPurging && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmPurge(false)}
                    className="p-1.5 text-nocturn-muted hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2 text-xs text-nocturn-text/90 leading-relaxed bg-white/5 p-3.5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Cloud Data Protected</span>
                </div>
                <p>
                  This operation clears the local offline IndexedDB cache on this device and immediately fetches fresh data from your Supabase cloud account.
                </p>
                <p className="text-nocturn-muted">
                  Your tasks, vocabulary, and settings in Supabase will remain intact.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isPurging}
                  onClick={() => setShowConfirmPurge(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-nocturn-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPurging}
                  onClick={handlePurgeAndResync}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2"
                >
                  {isPurging ? 'Purging & Syncing...' : 'Confirm & Resync'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
