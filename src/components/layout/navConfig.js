import { Sun, CheckSquare, Timer, BookOpen, BarChart3, Settings } from 'lucide-react'

export const PRIMARY_NAV_ITEMS = [
  {
    id: 'today',
    name: 'Today',
    path: '/today',
    icon: Sun,
    isActive: (pathname) => pathname === '/today' || pathname === '/',
  },
  {
    id: 'tasks',
    name: 'Tasks',
    path: '/tasks',
    icon: CheckSquare,
    isActive: (pathname) => pathname.startsWith('/tasks') || pathname.startsWith('/calendar'),
  },
  {
    id: 'timer',
    name: 'Focus',
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
]

export const SECONDARY_NAV_ITEMS = [
  {
    id: 'statistics',
    name: 'Insights',
    path: '/statistics',
    icon: BarChart3,
    isActive: (pathname) => pathname.startsWith('/statistics') || pathname.startsWith('/stats'),
  },
  {
    id: 'settings',
    name: 'Settings',
    path: '/settings',
    icon: Settings,
    isActive: (pathname) => pathname.startsWith('/settings') || pathname.startsWith('/profile'),
  },
]

export const NAV_GROUPS = [
  {
    title: 'Focus & Work',
    items: PRIMARY_NAV_ITEMS,
  },
  {
    title: 'Preferences',
    items: SECONDARY_NAV_ITEMS,
  },
]

export const NAV_ITEMS = [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS]
