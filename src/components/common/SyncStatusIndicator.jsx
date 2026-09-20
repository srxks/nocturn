import { useState, useEffect } from 'react'
import { RefreshCw, WifiOff, AlertCircle } from 'lucide-react'
import { useNetworkState, ConnectionState } from '../../services/networkStateService'
import { getStorageItem } from '../../utils/storageUtils'
import { syncNow } from '../../services/syncCoordinator'

export default function SyncStatusIndicator({ compact = false, className = '' }) {
  const network = useNetworkState()
  const [pendingCount, setPendingCount] = useState(0)

  // Poll or check pending mutations count in localStorage
  useEffect(() => {
    const checkQueue = () => {
      try {
        const raw = getStorageItem('nocturn_sync_queue', null)
        const q = raw ? JSON.parse(raw) : []
        setPendingCount(q.length)
      } catch {
        setPendingCount(0)
      }
    }

    checkQueue()
    const interval = setInterval(checkQueue, 4000)
    return () => clearInterval(interval)
  }, [])

  // Determine current display state
  const isOffline = network.isOffline || network.state === ConnectionState.OFFLINE
  const isSyncing = network.isSyncing || pendingCount > 0
  const hasError = network.hasError && !isOffline

  let statusConfig = {
    label: 'Online — Synced',
    shortLabel: 'Synced',
    dotClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    textClass: 'text-nocturn-muted',
    icon: null,
  }

  if (isOffline) {
    statusConfig = {
      label: 'Offline — Saved locally',
      shortLabel: 'Offline',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-400/90',
      icon: <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
    }
  } else if (hasError) {
    statusConfig = {
      label: 'Sync issue — Retrying',
      shortLabel: 'Sync issue',
      dotClass: 'bg-rose-500',
      textClass: 'text-rose-400',
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
    }
  } else if (isSyncing) {
    statusConfig = {
      label: 'Online — Syncing…',
      shortLabel: 'Syncing…',
      dotClass: 'bg-nocturn-accent',
      textClass: 'text-nocturn-accent-bright',
      icon: <RefreshCw className="w-3.5 h-3.5 text-nocturn-accent animate-spin shrink-0" />,
    }
  }

  const handleManualSync = (e) => {
    e.stopPropagation()
    if (!isOffline) {
      syncNow().catch(() => {})
    }
  }

  if (compact) {
    return (
      <div
        onClick={handleManualSync}
        title={statusConfig.label + (isOffline ? '' : ' (Click to sync)')}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-[11px] font-medium transition-colors cursor-pointer select-none ${className}`}
      >
        {statusConfig.icon || <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />}
        <span className={statusConfig.textClass}>{statusConfig.shortLabel}</span>
      </div>
    )
  }

  return (
    <div
      onClick={handleManualSync}
      title={statusConfig.label + (isOffline ? '' : ' (Click to sync)')}
      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] transition-colors cursor-pointer select-none ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {statusConfig.icon || <span className={`w-2 h-2 rounded-full shrink-0 ${statusConfig.dotClass}`} />}
        <span className={`text-xs font-medium truncate ${statusConfig.textClass}`}>
          {statusConfig.label}
        </span>
      </div>
      {!isOffline && (
        <RefreshCw className={`w-3 h-3 text-nocturn-muted/60 hover:text-white transition-colors shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
      )}
    </div>
  )
}
