import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun,
  CheckSquare,
  Sparkles,
  Timer,
  MoreHorizontal,
  Calendar,
  BarChart3,
  BookOpen,
  Settings,
  X,
  ChevronRight,
} from 'lucide-react'

const PRIMARY_MOBILE_ITEMS = [
  {
    id: 'my-day',
    name: 'Today',
    path: '/tasks?view=myday',
    icon: Sun,
    isActive: (pathname, search = '') =>
      pathname.startsWith('/tasks') &&
      (search.includes('view=myday') || (!search.includes('view=all') && !search.includes('view=completed'))),
  },
  {
    id: 'tasks',
    name: 'Tasks',
    path: '/tasks?view=all',
    icon: CheckSquare,
    isActive: (pathname, search = '') =>
      pathname.startsWith('/tasks') && search.includes('view=all'),
  },
  {
    id: 'plan',
    name: 'Plan',
    path: '/plan',
    icon: Sparkles,
    isActive: (pathname) => pathname.startsWith('/plan'),
  },
  {
    id: 'timer',
    name: 'Timer',
    path: '/timer',
    icon: Timer,
    isActive: (pathname) => pathname.startsWith('/timer'),
  },
]

const SECONDARY_MOBILE_ITEMS = [
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Day schedules & future deadlines',
    path: '/calendar',
    icon: Calendar,
    isActive: (pathname) => pathname.startsWith('/calendar'),
  },
  {
    id: 'profile',
    name: 'Statistics',
    description: 'Focus hours, trends & completed tasks',
    path: '/profile',
    icon: BarChart3,
    isActive: (pathname) => pathname.startsWith('/profile'),
  },
  {
    id: 'vocab',
    name: 'Vocabulary',
    description: 'Flashcards & spaced repetition',
    path: '/vocab',
    icon: BookOpen,
    isActive: (pathname) => pathname.startsWith('/vocab'),
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'Appearance, sound, sync & account',
    path: '/settings',
    icon: Settings,
    isActive: (pathname) => pathname.startsWith('/settings'),
  },
]

export default function BottomNav() {
  const location = useLocation()
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const currentPath = location.pathname + location.search
  const [prevPath, setPrevPath] = useState(currentPath)

  if (prevPath !== currentPath) {
    setPrevPath(currentPath)
    if (isMoreOpen) {
      setIsMoreOpen(false)
    }
  }

  const isSecondaryActive = SECONDARY_MOBILE_ITEMS.some((item) =>
    item.isActive(location.pathname, location.search)
  )

  return (
    <>
      {/* Bottom Nav Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-2 sm:p-3 flex justify-center pointer-events-none pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="w-full max-w-md bg-nocturn-card/95 backdrop-blur-2xl border border-nocturn-border shadow-[0_12px_40px_rgba(0,0,0,0.85)] px-2 py-1.5 rounded-2xl flex items-center justify-around pointer-events-auto select-none">
          {/* Primary Nav Items */}
          {PRIMARY_MOBILE_ITEMS.map((item) => {
            const Icon = item.icon
            const active = item.isActive(location.pathname, location.search)

            return (
              <Link
                key={item.id}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl transition-all duration-150 ${
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
                  <Icon className="w-5 h-5 stroke-[2]" />
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

          {/* More Toggle Item */}
          <button
            type="button"
            onClick={() => setIsMoreOpen((prev) => !prev)}
            aria-expanded={isMoreOpen}
            aria-label="More navigation options"
            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer ${
              isSecondaryActive || isMoreOpen
                ? 'text-nocturn-accent-bright font-medium'
                : 'text-nocturn-muted hover:text-white active:scale-95'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-colors ${
                isSecondaryActive || isMoreOpen ? 'bg-nocturn-accent/15 text-nocturn-accent-bright' : ''
              }`}
            >
              <MoreHorizontal className="w-5 h-5 stroke-[2]" />
            </div>
            <span
              className={`text-[10px] truncate tracking-tight ${
                isSecondaryActive || isMoreOpen ? 'text-white font-semibold' : 'text-nocturn-muted'
              }`}
            >
              More
            </span>
          </button>
        </div>
      </nav>

      {/* More Options Bottom Sheet Modal */}
      <AnimatePresence>
        {isMoreOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsMoreOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full max-w-lg bg-[#0e0f14] border-t border-white/10 rounded-t-[32px] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-[0_-20px_60px_rgba(0,0,0,0.9)] z-10 space-y-4"
            >
              {/* Drag Pill Handle */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h2 className="text-base font-semibold text-white tracking-tight">More Features</h2>
                  <p className="text-xs text-nocturn-muted">Calendar, analytics, vocab & preferences</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen(false)}
                  className="p-1.5 text-nocturn-muted hover:text-white rounded-lg bg-white/[0.04] border border-white/[0.06] transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Links List */}
              <div className="divide-y divide-white/[0.06] pt-1">
                {SECONDARY_MOBILE_ITEMS.map((item) => {
                  const Icon = item.icon
                  const active = item.isActive(location.pathname, location.search)

                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={() => setIsMoreOpen(false)}
                      className={`flex items-center justify-between gap-3.5 py-3 px-2 rounded-xl transition-all ${
                        active
                          ? 'bg-nocturn-accent/15 text-white'
                          : 'hover:bg-white/[0.04] text-nocturn-muted hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                            active
                              ? 'bg-nocturn-accent text-white border-nocturn-accent'
                              : 'bg-white/[0.04] text-nocturn-accent border-white/[0.08]'
                          }`}
                        >
                          <Icon className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div className="min-w-0">
                          <span className={`text-sm font-semibold block truncate ${active ? 'text-white' : 'text-white/90'}`}>
                            {item.name}
                          </span>
                          <span className="text-xs text-nocturn-muted block truncate">
                            {item.description}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className={`w-4 h-4 shrink-0 ${active ? 'text-nocturn-accent' : 'text-nocturn-muted/40'}`} />
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
