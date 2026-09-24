import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import SyncStatusIndicator from '../common/SyncStatusIndicator'
import NotificationBell from '../common/NotificationBell'
import { getStorageItem } from '../../utils/storageUtils'

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

export default function TopBar({ onOpenCommandPalette }) {
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  const [displayName, setDisplayName] = useState(() => {
    return getStorageItem('nocturn_user_name', 'Nocturn User')
  })

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

      {/* Right Controls: Command Palette Pill, Sync status, Notifications, Profile Avatar */}
      <div className="flex items-center gap-3">
        {/* Command Palette Trigger Pill */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-xs text-nocturn-muted hover:text-white transition-all cursor-pointer shadow-sm group"
        >
          <Search className="w-3.5 h-3.5 text-nocturn-dim group-hover:text-nocturn-accent transition-colors" />
          <span className="hidden md:inline text-[11px] font-medium text-nocturn-muted">
            Search or Jump
          </span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-nocturn-dim group-hover:text-white border border-white/10">
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
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
