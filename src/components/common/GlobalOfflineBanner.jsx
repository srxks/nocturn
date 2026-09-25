import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react'
import { drainSyncQueue } from '../../services/syncQueue'
import { useNetworkState, ConnectionState } from '../../services/networkStateService'

export default function GlobalOfflineBanner() {
  const { state, isSyncing, hasError } = useNetworkState()

  const [showSyncedNotice, setShowSyncedNotice] = useState(false)
  const [showOfflineNotice, setShowOfflineNotice] = useState(false)
  const [syncTimedOut, setSyncTimedOut] = useState(false)
  const prevSyncingRef = useRef(isSyncing)
  const prevStateRef = useRef(state)

  const isOffline = state === ConnectionState.OFFLINE
  const isConnectionProblem = hasError && !isOffline

  // Limit syncing banner duration to max 4 seconds to never get stuck
  useEffect(() => {
    if (!isSyncing) return
    const syncTimer = setTimeout(() => {
      setSyncTimedOut(true)
    }, 4000)
    return () => {
      clearTimeout(syncTimer)
      setSyncTimedOut(false)
    }
  }, [isSyncing])

  const showSyncingNotice = isSyncing && !syncTimedOut

  // Show temporary transient notices for state changes (Online, Offline, Error)
  useEffect(() => {
    let timer = null
    const wasSyncing = prevSyncingRef.current
    const wasErrorOrOffline =
      prevStateRef.current === ConnectionState.OFFLINE ||
      prevStateRef.current === ConnectionState.NETWORK_ERROR ||
      prevStateRef.current === ConnectionState.BACKEND_ERROR

    const isNowOffline = state === ConnectionState.OFFLINE || hasError

    if (isNowOffline && prevStateRef.current !== state) {
      setShowOfflineNotice(true)
      timer = setTimeout(() => {
        setShowOfflineNotice(false)
      }, 3500)
    } else if (
      (wasSyncing && !isSyncing && state === ConnectionState.ONLINE) ||
      (wasErrorOrOffline && state === ConnectionState.ONLINE)
    ) {
      setShowSyncedNotice(true)
      setShowOfflineNotice(false)
      timer = setTimeout(() => {
        setShowSyncedNotice(false)
      }, 3500)
    }

    prevSyncingRef.current = isSyncing
    prevStateRef.current = state

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isSyncing, state, hasError])

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

  const isVisible = showSyncingNotice || showOfflineNotice || showSyncedNotice

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-5 left-1/2 -translate-x-1/2 z-[85] pointer-events-none select-none"
    >
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {showSyncingNotice ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-sky-500/15 border border-sky-500/35 text-sky-300 text-xs font-semibold shadow-lg backdrop-blur-md rounded-full">
                <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />
                <span>Syncing...</span>
              </div>
            ) : isOffline || showOfflineNotice ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-semibold shadow-lg backdrop-blur-md rounded-full">
                <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Offline • Working locally</span>
              </div>
            ) : isConnectionProblem ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-orange-500/15 border border-orange-500/35 text-orange-300 text-xs font-semibold shadow-lg backdrop-blur-md rounded-full">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>Connection problem • Retrying...</span>
              </div>
            ) : showSyncedNotice ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-semibold shadow-lg backdrop-blur-md rounded-full">
                <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Online / Synced</span>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
