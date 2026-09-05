import { CheckSquare, Calendar, Sparkles, Timer, BookOpen, Settings, User } from 'lucide-react'

export const NAV_ITEMS = [
  {
    id: 'tasks',
    name: 'Tasks',
    path: '/tasks',
    icon: CheckSquare,
    isActive: (pathname) => pathname.startsWith('/tasks'),
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
    name: 'Vocab',
    path: '/vocab',
    icon: BookOpen,
    isActive: (pathname) => pathname.startsWith('/vocab'),
  },
  {
    id: 'settings',
    name: 'Settings',
    path: '/settings',
    icon: Settings,
    isActive: (pathname) => pathname.startsWith('/settings'),
  },
  {
    id: 'profile',
    name: 'Profile',
    path: '/profile',
    icon: User,
    isActive: (pathname) => pathname.startsWith('/profile'),
  },
]
