import { useState, useEffect } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { drainSyncQueue } from '../../services/syncQueue'

export default function GlobalOfflineBanner() {
  const [isOffline, setIsOffline] = useState(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false
  })
  const [showBackOnline, setShowBackOnline] = useState(false)

  useEffect(() => {
    let hideTimer = null

    const handleOffline = () => {
      if (hideTimer) clearTimeout(hideTimer)
      setIsOffline(true)
      setShowBackOnline(false)
    }

    const handleOnline = () => {
      setIsOffline(false)
      setShowBackOnline(true)

      // Trigger automatic flush of pending sync queue operations
      drainSyncQueue().catch((err) => {
        console.warn('[GlobalOfflineBanner] Auto-drain queue on online error:', err)
      })

      if (hideTimer) clearTimeout(hideTimer)
      hideTimer = setTimeout(() => {
        setShowBackOnline(false)
      }, 3500)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      if (hideTimer) clearTimeout(hideTimer)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!isOffline && !showBackOnline) {
    return null
  }

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-5 left-1/2 -translate-x-1/2 z-[85] pointer-events-none transition-all duration-300 select-none"
    >
      {isOffline ? (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-semibold shadow-lg backdrop-blur-md">
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>OFFLINE • Working locally</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-semibold shadow-lg backdrop-blur-md">
          <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Back online • Synced</span>
        </div>
      )}
    </div>
  )
}
