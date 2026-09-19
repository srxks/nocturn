import { Link, useLocation } from 'react-router-dom'
import { Zap, Search, Keyboard } from 'lucide-react'
import { NAV_ITEMS } from './navConfig'
import { useTheme } from '../../context/useTheme'

export default function SidebarNav({ onOpenCommandPalette, onOpenShortcutsHelp }) {
  const location = useLocation()
  const { uiStyle } = useTheme()
  const isAngular = uiStyle === 'angular'
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  return (
    <aside
      aria-label="Desktop Navigation"
      className={`hidden lg:flex flex-col w-64 xl:w-72 shrink-0 h-full bg-nocturn-card/95 border-r border-nocturn-border p-6 justify-between select-none z-40 ${
        isAngular ? 'font-mono' : ''
      }`}
    >
      {/* Top Header / Branding */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div
            className={`w-10 h-10 bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center shadow-[0_0_15px_rgba(var(--color-nocturn-accent-rgb),0.3)] ${
              isAngular ? 'rounded-none angular-chamfer-sm' : 'rounded-2xl'
            }`}
          >
            <Zap className="w-5 h-5 text-nocturn-accent stroke-[2.5]" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white block">
              {isAngular ? '[ NOCTURN ]' : 'Nocturn'}
            </span>
            <span className="text-[11px] font-medium text-nocturn-muted block -mt-0.5">
              {isAngular ? '// COMMAND_HUD' : 'Focus & Productivity'}
            </span>
          </div>
        </div>

        {/* Quick Search / Command Palette Button */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-nocturn-muted hover:text-white bg-white/5 hover:bg-white/10 border border-nocturn-border/80 transition-all cursor-pointer group ${
            isAngular ? 'rounded-none angular-chamfer-sm' : 'rounded-2xl'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search className="w-4 h-4 text-nocturn-muted group-hover:text-nocturn-accent transition-colors shrink-0" />
            <span className="truncate">{isAngular ? '[ SEARCH ]' : 'Quick Search...'}</span>
          </div>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-nocturn-muted group-hover:text-white shrink-0">
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </button>

        {/* Navigation Links */}
        <nav className="space-y-1.5" aria-label="Main menu">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = item.isActive(location.pathname, location.search, location.hash)

            return (
              <Link
                key={item.id}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3.5 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isAngular ? 'rounded-none' : 'rounded-2xl'
                }`}
              >
                <div
                  className={`p-1 transition-colors duration-200 ${
                    isAngular ? 'rounded-none' : 'rounded-lg'
                  } ${active ? 'text-nocturn-accent' : 'text-nocturn-muted'}`}
                >
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span>{isAngular ? `[ ${item.name.toUpperCase()} ]` : item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer Info & Shortcuts Trigger */}
      <div className="pt-4 border-t border-nocturn-border/60 px-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 bg-nocturn-accent shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb),0.8)] animate-pulse ${
              isAngular ? 'rounded-none' : 'rounded-full'
            }`}
          />
          <span className="text-xs font-medium text-nocturn-muted">
            {isAngular ? '[SYS.ONLINE]' : 'Workspace Active'}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenShortcutsHelp}
          title="Keyboard Shortcuts (?)"
          className="p-1.5 text-nocturn-muted hover:text-nocturn-accent hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
        >
          <Keyboard className="w-4 h-4" />
        </button>
      </div>
    </aside>
  )
}
