import { Link, useLocation } from 'react-router-dom'
import { Zap, Search, Keyboard } from 'lucide-react'
import { NAV_ITEMS } from './navConfig'
import NotificationBell from '../common/NotificationBell'
import SyncStatusIndicator from '../common/SyncStatusIndicator'

export default function SidebarNav({ onOpenCommandPalette, onOpenShortcutsHelp }) {
  const location = useLocation()
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  return (
    <aside
      aria-label="Desktop Navigation"
      className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 h-full bg-nocturn-card/95 border-r border-nocturn-border p-5 justify-between select-none z-40 backdrop-blur-md"
    >
      {/* Top Header / Branding + Notification Bell */}
      <div className="space-y-5">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center shadow-sm">
              <Zap className="w-4.5 h-4.5 text-nocturn-accent stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-white block">
                  Nocturn
                </span>
                <span className="text-[10px] font-mono text-nocturn-muted bg-white/[0.06] px-1.5 py-0.2 rounded-md border border-white/[0.08]">
                  v1.0
                </span>
              </div>
              <span className="text-[11px] font-normal text-nocturn-muted block">
                Calm Focus & Planning
              </span>
            </div>
          </div>

          <NotificationBell />
        </div>

        {/* Quick Search / Command Palette Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-nocturn-muted hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-nocturn-border rounded-xl transition-all duration-150 cursor-pointer group shadow-sm"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search className="w-3.5 h-3.5 text-nocturn-muted group-hover:text-nocturn-accent transition-colors shrink-0" />
            <span className="truncate">Search & actions...</span>
          </div>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-black/40 border border-white/10 text-nocturn-muted group-hover:text-white shrink-0">
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </button>

        {/* Navigation Links */}
        <nav className="space-y-1" aria-label="Main menu">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = item.isActive(location.pathname, location.search, location.hash)

            return (
              <Link
                key={item.id}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-nocturn-accent/12 text-white border border-nocturn-accent/25 shadow-sm'
                    : 'text-nocturn-muted hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div
                  className={`transition-colors duration-150 ${
                    active ? 'text-nocturn-accent-bright' : 'text-nocturn-muted'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 stroke-[2]" />
                </div>
                <span className="truncate">{item.name}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-nocturn-accent shrink-0" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer Status & Shortcuts Trigger */}
      <div className="pt-3 border-t border-nocturn-border/80 space-y-2">
        <SyncStatusIndicator />
        <div className="px-1 flex items-center justify-between text-xs text-nocturn-muted">
          <span>Shortcuts</span>
          <button
            type="button"
            onClick={onOpenShortcutsHelp}
            title="Keyboard Shortcuts (?)"
            className="p-1.5 text-nocturn-muted hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

