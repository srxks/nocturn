import { Sun, CheckSquare, Calendar, Sparkles, Timer, BookOpen, BarChart3, Settings } from 'lucide-react'

export const NAV_ITEMS = [
  {
    id: 'my-day',
    name: 'Today',
    path: '/tasks?view=myday',
    icon: Sun,
    isActive: (pathname, search = '') =>
      pathname.startsWith('/tasks') && (search.includes('view=myday') || (!search.includes('view=all') && !search.includes('view=completed'))),
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
    id: 'calendar',
    name: 'Calendar',
    path: '/calendar',
    icon: Calendar,
    isActive: (pathname) => pathname.startsWith('/calendar'),
  },
  {
    id: 'plan',
    name: 'Plan My Day',
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
  {
    id: 'vocab',
    name: 'Vocabulary',
    path: '/vocab',
    icon: BookOpen,
    isActive: (pathname) => pathname.startsWith('/vocab'),
  },
  {
    id: 'profile',
    name: 'Statistics',
    path: '/profile',
    icon: BarChart3,
    isActive: (pathname) => pathname.startsWith('/profile'),
  },
  {
    id: 'settings',
    name: 'Settings',
    path: '/settings',
    icon: Settings,
    isActive: (pathname) => pathname.startsWith('/settings'),
  },
]

