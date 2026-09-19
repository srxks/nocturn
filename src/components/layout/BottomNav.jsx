import { Link, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from './navConfig'

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-2.5 sm:p-4 flex justify-center pointer-events-none"
    >
      <div className="w-full max-w-lg bg-nocturn-card/90 backdrop-blur-xl border border-nocturn-border shadow-[0_12px_36px_rgba(0,0,0,0.7)] px-2 py-1.5 rounded-2xl flex items-center justify-between pointer-events-auto overflow-x-auto no-scrollbar">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = item.isActive(location.pathname, location.search, location.hash)

          return (
            <Link
              key={item.id}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl transition-all duration-150 select-none ${
                active
                  ? 'text-nocturn-accent-bright font-medium'
                  : 'text-nocturn-muted hover:text-white active:scale-95'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  active ? 'bg-nocturn-accent/15 text-nocturn-accent-bright' : ''
                }`}
              >
                <Icon className="w-4.5 h-4.5 stroke-[2]" />
              </div>
              <span
                className={`text-[10px] truncate tracking-tight ${
                  active ? 'text-white font-semibold' : 'text-nocturn-muted'
                }`}
              >
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

