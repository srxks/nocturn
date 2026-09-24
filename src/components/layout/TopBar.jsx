import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Volume2, VolumeX, WifiOff } from 'lucide-react'
import SyncStatusIndicator from '../common/SyncStatusIndicator'
import NotificationBell from '../common/NotificationBell'
import { getStorageItem } from '../../utils/storageUtils'
import {
  isSoundEffectsEnabled,
  setSoundEffectsEnabled,
  isTimerSoundsEnabled,
  setTimerSoundsEnabled,
} from '../../services/soundService'

const ROUTE_LABELS = {
  '/tasks': 'Tasks',
  '/calendar': 'Calendar',
  '/plan': 'Plan My Day',
  '/timer': 'Focus Timer',
  '/timer-settings': 'Timer Settings',
  '/statistics': 'Statistics & Analytics',
  '/vocab': 'Vocabulary Hub',
  '/vocab/learn': 'Vocabulary Learn',
  '/vocab/review': 'Vocabulary Review',
  '/vocab/list': 'Vocabulary Word List',
  '/settings': 'Settings',
  '/profile': 'Profile & Account',
}

export default function TopBar() {
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  const [isSoundMuted, setIsSoundMuted] = useState(() => !isSoundEffectsEnabled() && !isTimerSoundsEnabled())

  const [displayName, setDisplayName] = useState(() => {
    return getStorageItem('nocturn_user_name', 'Nocturn User')
  })

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleToggleSound = () => {
    const nextMuted = !isSoundMuted
    setIsSoundMuted(nextMuted)
    setSoundEffectsEnabled(!nextMuted)
    setTimerSoundsEnabled(!nextMuted)
    window.dispatchEvent(new CustomEvent('nocturn:sound-toggled', { detail: { muted: nextMuted } }))
  }

  useEffect(() => {
    const handleScroll = (e) => {
      const target = e.target
      if (target && typeof target.scrollTop === 'number') {
        setIsScrolled(target.scrollTop > 10)
      } else {
        setIsScrolled(window.scrollY > 10)
      }
    }

    const scrollContainer = document.querySelector('.nocturn-scroll-container')
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
      return () => scrollContainer.removeEventListener('scroll', handleScroll)
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true })
      return () => window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    const handleProfileUpdated = (e) => {
      if (e.detail?.display_name) {
        setDisplayName(e.detail.display_name)
      }
    }
    window.addEventListener('nocturn:profile-updated', handleProfileUpdated)
    return () => window.removeEventListener('nocturn:profile-updated', handleProfileUpdated)
  }, [])

  // Resolve breadcrumb title
  let currentTitle = ROUTE_LABELS[location.pathname] || 'Nocturn'
  if (location.pathname === '/tasks') {
    const searchParams = new URLSearchParams(location.search)
    const view = searchParams.get('view')
    if (view === 'myday') currentTitle = 'My Day'
    else if (view === 'inbox') currentTitle = 'Inbox'
    else if (view === 'upcoming') currentTitle = 'Upcoming Tasks'
    else if (view === 'all') currentTitle = 'All Tasks'
    else if (view === 'completed') currentTitle = 'Completed Tasks'
  }

  return (
    <header
      className={`h-14 w-full sticky top-0 z-30 transition-all duration-200 select-none flex items-center justify-between px-4 sm:px-8 lg:px-10 ${
        isScrolled
          ? 'bg-nocturn-bg/85 backdrop-blur-xl border-b border-white/[0.06] shadow-sm'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      {/* Route Breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-xs uppercase tracking-wider font-semibold text-nocturn-dim hidden sm:inline">
          Workspace
        </span>
        <span className="text-xs text-nocturn-dim/40 hidden sm:inline">/</span>
        <h1 className="text-sm font-semibold text-white tracking-tight truncate font-display">
          {currentTitle}
        </h1>
      </div>

      {/* Right Controls: Offline indicator, Sound toggle, Sync status, Notifications, Profile Avatar */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Offline Pill (Feature 3) */}
        {!isOnline && (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono flex items-center gap-1.5 shadow-sm">
            <WifiOff className="w-3 h-3 text-amber-400" />
            <span>Offline</span>
          </span>
        )}

        {/* Global Sound Mute/Unmute Toggle (Feature 7) */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={handleToggleSound}
          title={isSoundMuted ? 'Sound muted (click to unmute)' : 'Sound enabled (click to mute)'}
          aria-label={isSoundMuted ? 'Unmute sounds' : 'Mute sounds'}
          className="p-2 rounded-xl text-nocturn-muted hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] transition-colors cursor-pointer"
        >
          {isSoundMuted ? (
            <VolumeX className="w-4 h-4 text-nocturn-muted" />
          ) : (
            <Volume2 className="w-4 h-4 text-nocturn-accent" />
          )}
        </motion.button>

        {/* Sync Status */}
        <div className="hidden sm:flex items-center">
          <SyncStatusIndicator compact />
        </div>

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Avatar Mini Chip */}
        <Link
          to="/profile"
          title="Profile & Settings"
          className="w-8 h-8 rounded-full bg-gradient-to-br from-nocturn-accent/30 to-nocturn-accent/10 border border-nocturn-accent/40 flex items-center justify-center text-nocturn-accent text-xs font-bold uppercase shrink-0 hover:scale-105 transition-transform"
        >
          {displayName ? displayName.charAt(0) : 'U'}
        </Link>
      </div>
    </header>
  )
}
