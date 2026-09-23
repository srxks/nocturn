import { Sun, CheckSquare, Calendar, Sparkles, Timer, BookOpen, BarChart3, Settings } from 'lucide-react'

export const NAV_GROUPS = [
  {
    title: 'Workspace',
    items: [
      {
        id: 'my-day',
        name: 'My Day',
        path: '/tasks?view=myday',
        icon: Sun,
        isActive: (pathname, search = '') =>
          pathname.startsWith('/tasks') &&
          (search.includes('view=myday') ||
            (!search.includes('view=all') &&
              !search.includes('view=completed') &&
              !search.includes('view=list') &&
              !search.includes('list='))),
      },
      {
        id: 'tasks',
        name: 'All Tasks',
        path: '/tasks?view=all',
        icon: CheckSquare,
        isActive: (pathname, search = '') =>
          pathname.startsWith('/tasks') &&
          (search.includes('view=all') ||
            search.includes('view=completed') ||
            search.includes('view=list') ||
            search.includes('list=')),
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
    ],
  },
  {
    title: 'Productivity',
    items: [
      {
        id: 'timer',
        name: 'Focus Timer',
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
    ],
  },
  {
    title: 'General',
    items: [
      {
        id: 'settings',
        name: 'Settings',
        path: '/settings',
        icon: Settings,
        isActive: (pathname) => pathname.startsWith('/settings'),
      },
    ],
  },
]

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)
