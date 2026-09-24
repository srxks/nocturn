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
  User,
  X,
} from 'lucide-react'

const PRIMARY_MOBILE_ITEMS = [
  {
    id: 'my-day',
    name: 'Today',
    path: '/tasks?view=myday',
    icon: Sun,
    isActive: (pathname, search = '') =>
      pathname.startsWith('/tasks') &&
      (search.includes('view=myday') ||
        (!search.includes('view=all') &&
          !search.includes('view=completed') &&
          !search.includes('view=upcoming') &&
          !search.includes('view=inbox') &&
          !search.includes('view=list') &&
          !search.includes('list='))),
  },
  {
    id: 'tasks',
    name: 'Tasks',
    path: '/tasks?view=all',
    icon: CheckSquare,
    isActive: (pathname, search = '') =>
      pathname.startsWith('/tasks') &&
      (search.includes('view=all') ||
        search.includes('view=upcoming') ||
        search.includes('view=inbox') ||
        search.includes('view=completed') ||
        search.includes('view=list') ||
        search.includes('list=')),
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
    id: 'statistics',
    name: 'Statistics',
    description: 'Focus hours, trends & consistency heatmap',
    path: '/statistics',
    icon: BarChart3,
    isActive: (pathname) => pathname.startsWith('/statistics') || pathname.startsWith('/stats'),
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
    description: 'Appearance, sound, sync & themes',
    path: '/settings',
    icon: Settings,
    isActive: (pathname) => pathname.startsWith('/settings'),
  },
  {
    id: 'profile',
    name: 'Profile',
    description: 'Account details & user preferences',
    path: '/profile',
    icon: User,
    isActive: (pathname) => pathname.startsWith('/profile'),
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
      {/* Bottom Nav Bar (64px, Glass, Spring Lift) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-2 sm:p-3 flex justify-center pointer-events-none pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="w-full max-w-md h-16 bg-[#11131a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.85)] px-2 py-1 rounded-2xl flex items-center justify-around pointer-events-auto select-none relative">
          {/* Primary Nav Items */}
          {PRIMARY_MOBILE_ITEMS.map((item) => {
            const Icon = item.icon
            const active = item.isActive(location.pathname, location.search)

            return (
              <Link
                key={item.id}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className="relative flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl cursor-pointer"
              >
                {/* Active Indicator Moving Pill */}
                {active && (
                  <motion.div
                    layoutId="mobileNavIndicator"
                    className="absolute inset-0 bg-nocturn-accent/15 rounded-xl border border-nocturn-accent/25 shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.25)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Icon with Spring Lift on Active */}
                <motion.div
                  animate={{ y: active ? -2 : 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className={`relative z-10 transition-colors ${
                    active ? 'text-nocturn-accent' : 'text-nocturn-muted'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[2]" />
                </motion.div>

                <span
                  className={`relative z-10 text-[10.5px] truncate tracking-tight transition-colors ${
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
            className="relative flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl cursor-pointer"
          >
            {(isSecondaryActive || isMoreOpen) && (
              <motion.div
                layoutId="mobileNavIndicator"
                className="absolute inset-0 bg-nocturn-accent/15 rounded-xl border border-nocturn-accent/25 shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.25)]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}

            <motion.div
              animate={{ y: isSecondaryActive || isMoreOpen ? -2 : 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`relative z-10 transition-colors ${
                isSecondaryActive || isMoreOpen ? 'text-nocturn-accent' : 'text-nocturn-muted'
              }`}
            >
              <MoreHorizontal className="w-5 h-5 stroke-[2]" />
            </motion.div>

            <span
              className={`relative z-10 text-[10.5px] truncate tracking-tight ${
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
              className="fixed inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Bottom Sheet Card */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="relative w-full max-w-lg bg-[#11131a] border-t border-white/[0.08] rounded-t-3xl p-5 pb-8 shadow-2xl z-10 max-h-[80vh] overflow-y-auto"
            >
              {/* Sheet Drag Handle */}
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                <span className="text-xs uppercase font-bold tracking-wider text-nocturn-dim">
                  Workspace Views
                </span>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen(false)}
                  className="p-1 rounded-lg text-nocturn-dim hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {SECONDARY_MOBILE_ITEMS.map((item) => {
                  const Icon = item.icon
                  const active = item.isActive(location.pathname, location.search)

                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={() => setIsMoreOpen(false)}
                      className={`flex items-center gap-3.5 p-3 rounded-2xl transition-all ${
                        active
                          ? 'bg-nocturn-accent/15 border border-nocturn-accent/30 text-white shadow-sm'
                          : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] text-nocturn-muted hover:text-white'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          active
                            ? 'bg-nocturn-accent/25 text-nocturn-accent'
                            : 'bg-white/[0.05] text-nocturn-muted'
                        }`}
                      >
                        <Icon className="w-4 h-4 stroke-[2]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold block text-white">
                          {item.name}
                        </span>
                        <span className="text-xs text-nocturn-dim block truncate">
                          {item.description}
                        </span>
                      </div>
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
