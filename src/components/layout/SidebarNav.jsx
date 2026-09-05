import { Link, useLocation } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { NAV_ITEMS } from './navConfig'

export default function SidebarNav() {
  const location = useLocation()

  return (
    <aside
      aria-label="Desktop Navigation"
      className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 h-full bg-nocturn-card/95 border-r border-nocturn-border p-6 justify-between select-none z-40"
    >
      {/* Top Header / Branding */}
      <div className="space-y-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-2xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,230,118,0.3)]">
            <Zap className="w-5 h-5 text-nocturn-accent stroke-[2.5]" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white block">
              Nocturn
            </span>
            <span className="text-[11px] font-medium text-nocturn-muted block -mt-0.5">
              Focus & Productivity
            </span>
          </div>
        </div>

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
                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-nocturn-accent/15 text-nocturn-accent-bright font-semibold border border-nocturn-accent/35 shadow-[0_0_15px_rgba(0,230,118,0.25)] translate-x-1'
                    : 'text-nocturn-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div
                  className={`p-1 rounded-lg transition-colors duration-200 ${
                    active ? 'text-nocturn-accent' : 'text-nocturn-muted'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-nocturn-border/60 px-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-nocturn-accent shadow-[0_0_8px_rgba(0,230,118,0.8)] animate-pulse" />
          <span className="text-xs font-medium text-nocturn-muted">
            Workspace Active
          </span>
        </div>
      </div>
    </aside>
  )
}
