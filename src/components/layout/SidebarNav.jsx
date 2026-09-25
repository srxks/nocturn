import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { NAV_GROUPS } from './navConfig'
import SyncStatusIndicator from '../common/SyncStatusIndicator'
import { getStorageItem, setStorageItem } from '../../utils/storageUtils'
import { useTasks } from '../../context/useTasks'
import { formatDateKey } from '../../services/calendarService'

export default function SidebarNav() {
  const location = useLocation()
  const { tasks } = useTasks()

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return getStorageItem('nocturn_sidebar_collapsed', 'false') === 'true'
  })

  const [displayName, setDisplayName] = useState(() => {
    return getStorageItem('nocturn_user_name', 'Nocturn User')
  })

  useEffect(() => {
    setStorageItem('nocturn_sidebar_collapsed', String(isCollapsed))
  }, [isCollapsed])

  useEffect(() => {
    const handleProfileUpdated = (e) => {
      if (e.detail?.display_name) {
        setDisplayName(e.detail.display_name)
      }
    }
    window.addEventListener('nocturn:profile-updated', handleProfileUpdated)
    return () => window.removeEventListener('nocturn:profile-updated', handleProfileUpdated)
  }, [])

  // Calculate task counts for badges (Feature 25)
  const todayKey = formatDateKey(new Date())
  const myDayCount = useMemo(() => {
    return (tasks || []).filter(
      (t) => !t.completed && (t.inMyDay || t.myDayDate === todayKey || t.dueDate === todayKey)
    ).length
  }, [tasks, todayKey])

  const allCount = useMemo(() => {
    return (tasks || []).filter((t) => !t.completed).length
  }, [tasks])

  const getItemCount = (itemId) => {
    if (itemId === 'my-day') return myDayCount > 0 ? myDayCount : null
    if (itemId === 'tasks') return allCount > 0 ? allCount : null
    return null
  }

  return (
    <motion.aside
      aria-label="Desktop Navigation"
      animate={{ width: isCollapsed ? 68 : 248 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="hidden lg:flex flex-col shrink-0 h-full border-r border-white/[0.06] justify-between select-none z-40 relative backdrop-blur-xl"
      style={{
        background: 'linear-gradient(180deg, #0B0C12 0%, #07070a 100%)',
      }}
    >
      {/* Top Header / Branding & Navigation Items */}
      <div className="p-3.5 space-y-5 flex-1 overflow-y-auto overflow-x-hidden">
        {/* Brand Header */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-1.5'}`}>
          <Link
            to="/tasks?view=myday"
            className="flex items-center gap-2.5 group cursor-pointer"
            title="Nocturn"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-nocturn-accent/25 to-nocturn-accent/10 border border-nocturn-accent/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(var(--color-nocturn-accent-rgb),0.2)]">
              <Zap className="w-4 h-4 text-nocturn-accent stroke-[2.4]" />
            </div>

            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-base text-white tracking-tight">
                  Nocturn
                </span>
                {/* 3s pulsing accent dot */}
                <motion.span
                  animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-1.5 h-1.5 rounded-full bg-nocturn-accent"
                />
              </div>
            )}
          </Link>

          {/* Collapse Toggle Button with 180ms rotation */}
          {!isCollapsed && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => setIsCollapsed(true)}
              title="Collapse sidebar"
              className="p-1 rounded-lg text-nocturn-dim hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* When collapsed, show expand button */}
        {isCollapsed && (
          <div className="flex justify-center">
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => setIsCollapsed(false)}
              title="Expand sidebar"
              className="p-1.5 rounded-lg text-nocturn-dim hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        )}

        {/* Navigation Groups */}
        <nav className="space-y-4" aria-label="Main menu">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] uppercase font-bold tracking-wider text-nocturn-dim">
                  {group.title}
                </div>
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = item.isActive(location.pathname, location.search, location.hash)

                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      title={isCollapsed ? item.name : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex items-center h-9 px-3 rounded-[10px] text-sm font-medium transition-colors ${
                        isCollapsed ? 'justify-center px-0' : 'gap-3'
                      } ${
                        active
                          ? 'text-white'
                          : 'text-nocturn-muted hover:text-white hover:bg-white/[0.04]'
                      }`}
                      style={{
                        backgroundColor: active
                          ? 'color-mix(in oklab, var(--accent) 12%, transparent)'
                          : undefined,
                      }}
                    >
                      {/* Sliding Left Accent Indicator Bar */}
                      {active && (
                        <motion.span
                          layoutId="navIndicator"
                          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-nocturn-accent shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb),0.7)]"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}

                      <motion.div
                        whileHover={{ x: 1 }}
                        transition={{ duration: 0.15 }}
                        className={`transition-colors shrink-0 ${
                          active ? 'text-nocturn-accent' : 'text-nocturn-muted'
                        }`}
                      >
                        <Icon className="w-[18px] h-[18px] stroke-[2]" />
                      </motion.div>

                      {!isCollapsed && (
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="truncate text-[13.5px]">{item.name}</span>
                          {getItemCount(item.id) !== null && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/[0.06] text-nocturn-muted group-hover:text-white">
                              {getItemCount(item.id)}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Controls & User Profile */}
      <div className="p-3 border-t border-white/[0.06] space-y-2.5">
        {/* User Profile Quick Chip */}
        {!isCollapsed ? (
          <Link
            to="/profile"
            className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] transition-all group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-nocturn-accent/30 to-nocturn-accent/10 border border-nocturn-accent/40 flex items-center justify-center text-nocturn-accent text-xs font-bold uppercase shrink-0 group-hover:scale-105 transition-transform">
              {displayName ? displayName.charAt(0) : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-white block truncate group-hover:text-nocturn-accent transition-colors">
                {displayName}
              </span>
              <span className="text-[10px] text-nocturn-muted block truncate">
                Profile & Settings
              </span>
            </div>
          </Link>
        ) : (
          <div className="flex justify-center">
            <Link
              to="/profile"
              title={`${displayName} - Profile & Settings`}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-nocturn-accent/30 to-nocturn-accent/10 border border-nocturn-accent/40 flex items-center justify-center text-nocturn-accent text-xs font-bold uppercase hover:scale-105 transition-transform"
            >
              {displayName ? displayName.charAt(0) : 'U'}
            </Link>
          </div>
        )}

        {/* Sync Status Bar */}
        <div className="flex items-center justify-between px-1">
          <SyncStatusIndicator compact={isCollapsed} />
        </div>
      </div>
    </motion.aside>
  )
}
