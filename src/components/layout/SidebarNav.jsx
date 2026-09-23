import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Zap, Search, Keyboard } from 'lucide-react'
import { NAV_GROUPS } from './navConfig'
import NotificationBell from '../common/NotificationBell'
import SyncStatusIndicator from '../common/SyncStatusIndicator'
import { getStorageItem } from '../../utils/storageUtils'

export default function SidebarNav({ onOpenCommandPalette, onOpenShortcutsHelp }) {
  const location = useLocation()
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  const [displayName, setDisplayName] = useState(() => {
    return getStorageItem('nocturn_user_name', 'Nocturn User')
  })

  useEffect(() => {
    const handleProfileUpdated = (e) => {
      if (e.detail?.display_name) {
        setDisplayName(e.detail.display_name)
      }
    }
    window.addEventListener('nocturn:profile-updated', handleProfileUpdated)
    return () => {
      window.removeEventListener('nocturn:profile-updated', handleProfileUpdated)
    }
  }, [])

  return (
    <aside
      aria-label="Desktop Navigation"
      className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 h-full bg-nocturn-bg-secondary/90 border-r border-nocturn-border/80 p-5 justify-between select-none z-40 backdrop-blur-xl relative"
    >
      {/* Top Header / Branding + Search + Grouped Navigation */}
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-nocturn-accent/25 to-nocturn-accent/10 border border-nocturn-accent/30 flex items-center justify-center shadow-[0_0_15px_rgba(var(--color-nocturn-accent-rgb),0.2)]">
                <Zap className="w-5 h-5 text-nocturn-accent stroke-[2.4]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white block">
                  Nocturn
                </span>
                <span className="text-[10px] font-semibold text-nocturn-muted bg-white/[0.06] px-1.5 py-0.5 rounded-md border border-white/[0.08]">
                  v2.0
                </span>
              </div>
              <span className="text-[11px] font-medium text-nocturn-dim block">
                Focus & Productivity
              </span>
            </div>
          </div>

          <NotificationBell />
        </div>

        {/* Global Search & Command Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-nocturn-muted hover:text-white bg-nocturn-card/60 hover:bg-nocturn-card border border-nocturn-border hover:border-white/15 rounded-xl transition-all duration-150 cursor-pointer group shadow-sm"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search className="w-3.5 h-3.5 text-nocturn-muted group-hover:text-nocturn-accent transition-colors shrink-0" />
            <span className="truncate font-medium">Quick search...</span>
          </div>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-nocturn-muted group-hover:text-white shrink-0">
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </button>

        {/* Navigation Groups */}
        <nav className="space-y-5" aria-label="Main menu">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] uppercase font-bold tracking-wider text-nocturn-dim">
                {group.title}
              </div>

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = item.isActive(location.pathname, location.search, location.hash)

                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                        active
                          ? 'bg-white/[0.06] text-white border border-white/[0.08] shadow-sm'
                          : 'text-nocturn-muted hover:text-white hover:bg-white/[0.03] border border-transparent'
                      }`}
                    >
                      {/* Active Indicator Left Pill */}
                      {active && (
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-nocturn-accent shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb),0.5)]" />
                      )}

                      <div
                        className={`transition-colors duration-150 ml-1 ${
                          active ? 'text-nocturn-accent-bright' : 'text-nocturn-muted'
                        }`}
                      >
                        <Icon className="w-4 h-4 stroke-[2]" />
                      </div>
                      <span className="truncate">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Controls & User Profile */}
      <div className="pt-4 border-t border-nocturn-border/80 space-y-3">
        {/* User Profile Quick Card */}
        <Link
          to="/profile"
          className="flex items-center gap-2.5 p-2 rounded-xl bg-nocturn-card/40 hover:bg-nocturn-card border border-nocturn-border hover:border-white/15 transition-all group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nocturn-accent/30 to-nocturn-accent/10 border border-nocturn-accent/40 flex items-center justify-center text-nocturn-accent text-xs font-bold uppercase shrink-0 group-hover:scale-105 transition-transform">
            {displayName ? displayName.charAt(0) : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-white block truncate group-hover:text-nocturn-accent transition-colors">
              {displayName}
            </span>
            <span className="text-[10px] text-nocturn-muted block truncate">
              Profile & Account
            </span>
          </div>
        </Link>

        {/* Sync Status Bar */}
        <SyncStatusIndicator />

        {/* Shortcuts Hint */}
        <div className="px-1 flex items-center justify-between text-xs text-nocturn-dim">
          <span className="text-[11px] font-medium">Shortcuts Help</span>
          <button
            type="button"
            onClick={onOpenShortcutsHelp}
            title="Keyboard Shortcuts (?)"
            className="p-1.5 text-nocturn-muted hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
