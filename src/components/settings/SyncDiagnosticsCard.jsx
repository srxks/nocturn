import { useState, useEffect } from 'react'
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  CloudOff,
  Layers,
  Clock,
} from 'lucide-react'
import { useNetworkState, ConnectionState } from '../../services/networkStateService'
import { pendingCount } from '../../services/syncQueue'
import { forceManualSync } from '../../services/syncService'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { useTheme } from '../../context/useTheme'

export default function SyncDiagnosticsCard() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { uiStyle } = useTheme()
  const isAngular = uiStyle === 'angular'

  const network = useNetworkState()
  const [queuedMutations, setQueuedMutations] = useState(0)
  const [isManualSyncing, setIsManualSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    try {
      return localStorage.getItem('nocturn_last_manual_sync') || 'Recent'
    } catch {
      return 'Recent'
    }
  })

  // Poll pending mutations count periodically
  useEffect(() => {
    const updateCount = () => {
      setQueuedMutations(pendingCount())
    }
    updateCount()
    const interval = setInterval(updateCount, 2500)
    return () => clearInterval(interval)
  }, [])

  const handleManualSync = async () => {
    if (isManualSyncing) return
    setIsManualSyncing(true)
    try {
      const res = await forceManualSync(user?.id)
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      setLastSyncTime(nowStr)
      try {
        localStorage.setItem('nocturn_last_manual_sync', nowStr)
      } catch {
        // ignore
      }

      setQueuedMutations(pendingCount())

      if (res.success) {
        addToast(`Sync complete (${res.synced} records updated, ${res.drained} queued changes pushed)`, 'success', 3500)
      } else {
        addToast('Sync completed with local changes preserved', 'info', 3500)
      }
    } catch (err) {
      addToast(err?.message || 'Sync failed', 'error', 3500)
    } finally {
      setIsManualSyncing(false)
    }
  }

  const renderStateBadge = () => {
    if (network.state === ConnectionState.ONLINE) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Online & Synced</span>
        </span>
      )
    }
    if (network.state === ConnectionState.OFFLINE) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/15 text-zinc-300 border border-zinc-500/30">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline • Working Locally</span>
        </span>
      )
    }
    if (network.state === ConnectionState.NETWORK_ERROR) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Connection Problem • Retrying</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <CloudOff className="w-3.5 h-3.5" />
        <span>Cloud Error • Preserving Offline</span>
      </span>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide px-1">
        {isAngular ? '[ SYNC_DIAGNOSTICS ]' : 'Sync & Storage Engine'}
      </h2>

      <div className={`nocturn-card p-5 sm:p-6 border border-nocturn-border flex flex-col gap-5 ${
        isAngular ? 'rounded-none angular-chamfer' : 'rounded-2xl'
      }`}>
        {/* Top Status Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-nocturn-surface border border-nocturn-border flex items-center justify-center text-nocturn-accent shrink-0">
              <Activity className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-sm sm:text-base font-bold text-white">
                  Realtime Cloud Synchronization
                </span>
                {renderStateBadge()}
              </div>
              <span className="text-xs text-nocturn-muted block mt-0.5">
                Two-way deterministic sync with Dexie local cache and Supabase cloud.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isManualSyncing || network.isSyncing}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-nocturn-border transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing || network.isSyncing ? 'animate-spin text-nocturn-accent' : ''}`} />
            <span>{isManualSyncing || network.isSyncing ? 'Syncing...' : 'Force Re-Sync'}</span>
          </button>
        </div>

        {/* Diagnostics Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-nocturn-border/50">
          <div className="px-3.5 py-3 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2 text-nocturn-muted text-xs">
              <Layers className="w-3.5 h-3.5" />
              <span>Offline Mutation Queue</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-bold text-white font-mono">
                {queuedMutations}
              </span>
              <span className="text-[11px] text-nocturn-muted">
                {queuedMutations === 0 ? 'Queue clear' : 'Pending retry'}
              </span>
            </div>
          </div>

          <div className="px-3.5 py-3 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2 text-nocturn-muted text-xs">
              <Activity className="w-3.5 h-3.5" />
              <span>Sync Engine Status</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-xs font-semibold ${network.isSyncing ? 'text-nocturn-accent animate-pulse' : 'text-emerald-400'}`}>
                {network.isSyncing ? 'Draining queue...' : 'Idle / Synchronized'}
              </span>
            </div>
          </div>

          <div className="px-3.5 py-3 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2 text-nocturn-muted text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>Last Manual Sync</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xs font-mono font-medium text-white">
                {lastSyncTime}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
