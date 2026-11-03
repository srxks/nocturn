import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, WifiOff, AlertCircle, CheckCircle2, Cloud, Database } from 'lucide-react'
import { useNetworkState, ConnectionState } from '../../services/networkStateService'
import { syncNow, getLastSyncCompletedAt, isSyncInProgress } from '../../services/syncCoordinator'
import { pendingCount as getPendingCount } from '../../services/syncQueue'

export default function SyncStatusIndicator({ compact = false, className = '' }) {
  const network = useNetworkState()
  const [pending, setPending] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isManualSyncing, setIsManualSyncing] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    const updateStats = () => {
      setPending(getPendingCount())
    }
    updateStats()
    const interval = setInterval(updateStats, 2000)
    return () => clearInterval(interval)
  }, [])

  // Close panel on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const isOffline = network.isOffline || network.state === ConnectionState.OFFLINE
  const isSyncing = network.isSyncing || isSyncInProgress() || isManualSyncing
  const hasError = network.hasError && !isOffline

  let statusConfig = {
    label: 'Online — Cloud Synced',
    shortLabel: 'Synced',
    dotClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    textClass: 'text-neutral-400',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
  }

  if (isOffline) {
    statusConfig = {
      label: 'Offline — Local Storage Only',
      shortLabel: 'Offline',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-400/90',
      icon: <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
    }
  } else if (hasError) {
    statusConfig = {
      label: 'Sync Alert — Retrying soon',
      shortLabel: 'Sync Alert',
      dotClass: 'bg-rose-500',
      textClass: 'text-rose-400',
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
    }
  } else if (isSyncing) {
    statusConfig = {
      label: 'Syncing Changes...',
      shortLabel: 'Syncing…',
      dotClass: 'bg-emerald-400',
      textClass: 'text-emerald-400',
      icon: <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />,
    }
  }

  const handleTriggerSync = async () => {
    if (isOffline || isSyncing) return
    try {
      setIsManualSyncing(true)
      await syncNow()
    } finally {
      setIsManualSyncing(false)
    }
  }

  const lastSyncTime = getLastSyncCompletedAt()
  const lastSyncFormatted = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Never'

  return (
    <div className={`relative inline-block ${className}`} ref={panelRef}>
      {/* Trigger Pill */}
      {compact ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          title={statusConfig.label}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-medium transition-all cursor-pointer select-none"
        >
          {statusConfig.icon || <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />}
          <span className={statusConfig.textClass}>{statusConfig.shortLabel}</span>
          {pending > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-mono">
              {pending}
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] transition-all cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            {statusConfig.icon}
            <span className={`text-xs font-medium truncate ${statusConfig.textClass}`}>
              {statusConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {pending > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                {pending} queued
              </span>
            )}
            <RefreshCw
              className={`w-3.5 h-3.5 text-neutral-500 hover:text-white transition-colors ${
                isSyncing ? 'animate-spin text-emerald-400' : ''
              }`}
            />
          </div>
        </button>
      )}

      {/* Sync Diagnostic Popover Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 bottom-full mb-2 w-64 rounded-2xl bg-neutral-950/95 backdrop-blur-xl border border-white/10 p-3.5 shadow-2xl z-50 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                Sync Observability
              </span>
              <span className={`w-2 h-2 rounded-full ${statusConfig.dotClass}`} />
            </div>

            <div className="space-y-1.5 text-xs text-neutral-400">
              <div className="flex items-center justify-between">
                <span>Network state:</span>
                <span className="font-medium text-neutral-200 capitalize">{network.state}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3 text-neutral-500" /> Pending outbox:
                </span>
                <span className="font-mono text-neutral-200">
                  {pending} {pending === 1 ? 'operation' : 'operations'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last Cloud Sync:</span>
                <span className="font-mono text-neutral-200">{lastSyncFormatted}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isOffline || isSyncing}
              onClick={handleTriggerSync}
              className="w-full py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
