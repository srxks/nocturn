import { useState, useEffect, useRef } from 'react'
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react'
import { drainSyncQueue } from '../../services/syncQueue'
import { useTheme } from '../../context/useTheme'
import { useNetworkState, ConnectionState } from '../../services/networkStateService'

export default function GlobalOfflineBanner() {
  const { uiStyle } = useTheme()
  const isAngular = uiStyle === 'angular'
  const { state, isSyncing, hasError } = useNetworkState()

  const [showSyncedNotice, setShowSyncedNotice] = useState(false)
  const prevSyncingRef = useRef(isSyncing)
  const prevStateRef = useRef(state)

  // Show temporary "Online / Synced" banner when syncing completes or after reconnecting
  useEffect(() => {
    let timer = null
    const wasSyncing = prevSyncingRef.current
    const wasErrorOrOffline =
      prevStateRef.current === ConnectionState.OFFLINE ||
      prevStateRef.current === ConnectionState.NETWORK_ERROR ||
      prevStateRef.current === ConnectionState.BACKEND_ERROR

    prevSyncingRef.current = isSyncing
    prevStateRef.current = state

    if ((wasSyncing && !isSyncing && state === ConnectionState.ONLINE) ||
        (wasErrorOrOffline && state === ConnectionState.ONLINE)) {
      setShowSyncedNotice(true)
      timer = setTimeout(() => {
        setShowSyncedNotice(false)
      }, 3500)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isSyncing, state])

  // When coming back online, flush queue
  useEffect(() => {
    const handleOnline = () => {
      drainSyncQueue().catch((err) => {
        console.warn('[GlobalOfflineBanner] Auto-drain queue error:', err)
      })
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  const isOffline = state === ConnectionState.OFFLINE
  const isConnectionProblem = hasError && !isOffline

  // If fully online, not syncing, no errors, and synced notice expired -> render nothing
  if (!isOffline && !isConnectionProblem && !isSyncing && !showSyncedNotice) {
    return null
  }

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-5 left-1/2 -translate-x-1/2 z-[85] pointer-events-none transition-all duration-300 select-none"
    >
      {isSyncing ? (
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 bg-sky-500/15 border border-sky-500/35 text-sky-300 text-xs font-semibold shadow-lg backdrop-blur-md ${
            isAngular ? 'rounded-none font-mono text-[10px] angular-chamfer-sm' : 'rounded-full'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />
          <span>{isAngular ? '[ SYNCING // CLOUD ]' : 'Syncing...'}</span>
        </div>
      ) : isOffline ? (
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-semibold shadow-lg backdrop-blur-md ${
            isAngular ? 'rounded-none font-mono text-[10px] angular-chamfer-sm' : 'rounded-full'
          }`}
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{isAngular ? '[ OFFLINE // LOCAL_MODE ]' : 'Offline • Working locally'}</span>
        </div>
      ) : isConnectionProblem ? (
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 bg-orange-500/15 border border-orange-500/35 text-orange-300 text-xs font-semibold shadow-lg backdrop-blur-md ${
            isAngular ? 'rounded-none font-mono text-[10px] angular-chamfer-sm' : 'rounded-full'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <span>{isAngular ? '[ CONNECTION PROBLEM // RETRYING ]' : 'Connection problem • Retrying...'}</span>
        </div>
      ) : showSyncedNotice ? (
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-semibold shadow-lg backdrop-blur-md ${
            isAngular ? 'rounded-none font-mono text-[10px] angular-chamfer-sm' : 'rounded-full'
          }`}
        >
          <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{isAngular ? '[ ONLINE // SYNCED ]' : 'Online / Synced'}</span>
        </div>
      ) : null}
    </div>
  )
}
