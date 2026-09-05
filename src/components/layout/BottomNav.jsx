import { Link, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from './navConfig'

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 flex justify-center pointer-events-none"
    >
      <div className="w-full max-w-xl bg-nocturn-card/95 backdrop-blur-xl border border-nocturn-border rounded-2xl sm:rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.9)] px-1 sm:px-3 py-1.5 flex items-center justify-between pointer-events-auto overflow-x-auto no-scrollbar">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = item.isActive(location.pathname, location.search, location.hash)

          return (
            <Link
              key={item.id}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl transition-all duration-200 select-none ${
                active
                  ? 'text-nocturn-accent font-semibold scale-105'
                  : 'text-nocturn-muted hover:text-white active:scale-95'
              }`}
            >
              <div
                className={`relative p-1 rounded-full transition-all duration-200 ${
                  active ? 'bg-nocturn-accent/15 shadow-[0_0_12px_rgba(0,230,118,0.35)]' : ''
                }`}
              >
                <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <span
                className={`text-[9px] sm:text-[11px] truncate tracking-tight transition-colors duration-200 ${
                  active ? 'text-white' : 'text-nocturn-muted'
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
