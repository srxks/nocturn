import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  CheckSquare,
  CheckCircle2,
  Circle,
  Folder,
  BookOpen,
  Calendar,
  Sparkles,
  Timer,
  Settings,
  User,
  ArrowRight,
  Keyboard,
  PlusCircle,
  Play,
  Pause,
  Maximize2,
  Sun,
  Palette,
} from 'lucide-react'
import { useTasks } from '../../context/useTasks'
import { useVocab } from '../../hooks/useVocab'
import { useTheme } from '../../context/useTheme'
import { useTimerSession } from '../../context/useTimerSession'
import {
  playTimerStartSound,
  playTimerPauseSound,
  playTimerResumeSound,
} from '../../services/soundService'

const NAVIGATION_ACTIONS = [
  {
    id: 'nav-tasks',
    type: 'action',
    category: 'navigation',
    title: 'Go to Tasks',
    subtitle: 'Manage all tasks and daily to-do lists',
    icon: CheckSquare,
    action: (navigate) => navigate('/tasks'),
  },
  {
    id: 'nav-calendar',
    type: 'action',
    category: 'navigation',
    title: 'Go to Calendar',
    subtitle: 'View tasks and schedules across dates',
    icon: Calendar,
    action: (navigate) => navigate('/calendar'),
  },
  {
    id: 'nav-plan',
    type: 'action',
    category: 'navigation',
    title: 'Go to Plan My Day',
    subtitle: 'AI-assisted day planning and schedule breakdown',
    icon: Sparkles,
    action: (navigate) => navigate('/plan'),
  },
  {
    id: 'nav-timer',
    type: 'action',
    category: 'navigation',
    title: 'Go to Focus Timer',
    subtitle: 'Pomodoro timer and deep focus tracker',
    icon: Timer,
    action: (navigate) => navigate('/timer'),
  },
  {
    id: 'nav-vocab',
    type: 'action',
    category: 'navigation',
    title: 'Go to Vocabulary',
    subtitle: 'Flashcards, daily learning sets, and spaced reviews',
    icon: BookOpen,
    action: (navigate) => navigate('/vocab'),
  },
  {
    id: 'nav-settings',
    type: 'action',
    category: 'navigation',
    title: 'Go to Settings',
    subtitle: 'Configure preferences, sync diagnostics, and themes',
    icon: Settings,
    action: (navigate) => navigate('/settings'),
  },
  {
    id: 'nav-profile',
    type: 'action',
    category: 'navigation',
    title: 'Go to Profile',
    subtitle: 'Productivity statistics, heatmaps, and account',
    icon: User,
    action: (navigate) => navigate('/profile'),
  },
]

function CommandPaletteDialog({ onClose, onOpenShortcutsHelp }) {
  const navigate = useNavigate()
  const { tasks, lists, setSelectedTask, setActiveListId } = useTasks()
  const { allWords } = useVocab()
  const { uiStyle, activeTheme, presetThemes, applyTheme } = useTheme()
  const { isRunning, isPaused, startTimer, pauseTimer, resumeTimer } = useTimerSession()
  const isAngular = uiStyle === 'angular'

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all') // 'all' | 'tasks' | 'lists' | 'vocab' | 'navigation'
  const [rawSelectedIndex, setRawSelectedIndex] = useState(0)

  const inputRef = useRef(null)
  const listContainerRef = useRef(null)

  // Focus input on mount without state setter side-effects
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Filter and build categorized results
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    // 1. Navigation & Actions
    const matchedActions = NAVIGATION_ACTIONS.filter((act) => {
      if (activeCategory !== 'all' && activeCategory !== 'navigation') return false
      if (!q) return true
      return (
        act.title.toLowerCase().includes(q) ||
        act.subtitle.toLowerCase().includes(q)
      )
    })

    // Action items list
    const actionItems = [...matchedActions]
    if (activeCategory === 'all' || activeCategory === 'navigation') {
      // Create task
      if (!q || 'create new task add task'.includes(q)) {
        actionItems.unshift({
          id: 'action-create-task',
          type: 'action',
          category: 'navigation',
          title: 'Create New Task',
          subtitle: 'Jump to task input on Tasks page',
          icon: PlusCircle,
          action: (nav) => {
            nav('/tasks')
            setTimeout(() => {
              const el = document.querySelector('input[placeholder*="Add a task"]')
              el?.focus()
            }, 100)
          },
        })
      }

      // Open My Day
      if (!q || 'my day today open my day priorities'.includes(q)) {
        actionItems.unshift({
          id: 'action-open-my-day',
          type: 'action',
          category: 'navigation',
          title: 'Open My Day',
          subtitle: "Focus on today's prioritized goals and urgent tasks",
          icon: Sun,
          action: (nav) => {
            setActiveListId('my-day')
            nav('/tasks?view=myday')
          },
        })
      }

      // Start / Resume focus session
      if (!q || 'start focus timer deep work pomodoro'.includes(q)) {
        actionItems.unshift({
          id: 'action-start-focus',
          type: 'action',
          category: 'navigation',
          title: isRunning ? 'Resume / View Focus Timer' : 'Start Focus Session',
          subtitle: 'Begin deep focus timer and track session',
          icon: Play,
          action: (nav) => {
            if (isPaused) {
              playTimerResumeSound()
              resumeTimer()
            } else if (!isRunning) {
              playTimerStartSound()
              startTimer()
            }
            nav('/timer')
          },
        })
      }

      // Pause timer
      if (isRunning && (!q || 'pause focus timer stop hold'.includes(q))) {
        actionItems.unshift({
          id: 'action-pause-focus',
          type: 'action',
          category: 'navigation',
          title: 'Pause Focus Timer',
          subtitle: 'Temporarily pause active timer session',
          icon: Pause,
          action: () => {
            playTimerPauseSound()
            pauseTimer()
          },
        })
      }

      // Toggle Focus Mode
      if (!q || 'focus mode fullscreen zen distraction free clock'.includes(q)) {
        actionItems.push({
          id: 'action-focus-mode',
          type: 'action',
          category: 'navigation',
          title: 'Toggle Focus Mode',
          subtitle: 'Distraction-free fullscreen focus clock and active task',
          icon: Maximize2,
          action: (nav) => {
            nav('/timer', { state: { focusMode: true } })
          },
        })
      }

      // Toggle Theme
      if (!q || 'toggle theme switch color palette'.includes(q)) {
        actionItems.push({
          id: 'action-toggle-theme',
          type: 'action',
          category: 'navigation',
          title: 'Switch Color Theme',
          subtitle: `Cycle theme (currently ${activeTheme?.name || 'Nocturn Violet'})`,
          icon: Palette,
          action: () => {
            if (presetThemes && presetThemes.length > 1) {
              const currentId = activeTheme?.id
              const idx = presetThemes.findIndex((t) => t.id === currentId)
              const nextTheme = presetThemes[(idx + 1) % presetThemes.length]
              applyTheme(nextTheme)
            }
          },
        })
      }

      // View shortcuts
      if (!q || 'shortcuts help keyboard'.includes(q)) {
        actionItems.push({
          id: 'action-shortcuts-help',
          type: 'action',
          category: 'navigation',
          title: 'View Keyboard Shortcuts',
          subtitle: 'Open the keyboard cheatsheet',
          icon: Keyboard,
          action: () => {
            onOpenShortcutsHelp?.()
          },
        })
      }
    }

    // 2. Tasks
    let matchedTasks = []
    if (activeCategory === 'all' || activeCategory === 'tasks') {
      matchedTasks = tasks
        .filter((t) => {
          if (!q) return true
          const titleMatch = t.title?.toLowerCase().includes(q)
          const notesMatch = t.notes?.toLowerCase().includes(q)
          const priorityMatch = t.priority?.toLowerCase().includes(q)
          return titleMatch || notesMatch || priorityMatch
        })
        .slice(0, activeCategory === 'tasks' ? 40 : 8)
        .map((t) => ({
          id: `task-${t.id}`,
          type: 'task',
          category: 'tasks',
          raw: t,
          title: t.title,
          subtitle: t.notes ? t.notes.slice(0, 60) : (t.completed ? 'Completed' : `Due: ${t.dueDate || 'No date'}`),
          completed: t.completed,
          priority: t.priority,
          dueDate: t.dueDate,
          icon: t.completed ? CheckCircle2 : Circle,
          action: (nav) => {
            setSelectedTask(t)
            nav('/tasks')
          },
        }))
    }

    // 3. Lists
    let matchedLists = []
    if (activeCategory === 'all' || activeCategory === 'lists') {
      matchedLists = lists
        .filter((l) => {
          if (!q) return true
          return l.name?.toLowerCase().includes(q)
        })
        .slice(0, 10)
        .map((l) => {
          const taskCount = tasks.filter((t) => t.listId === l.id).length
          return {
            id: `list-${l.id}`,
            type: 'list',
            category: 'lists',
            raw: l,
            title: l.name,
            subtitle: `${taskCount} task${taskCount === 1 ? '' : 's'}`,
            icon: Folder,
            action: (nav) => {
              setActiveListId(l.id)
              nav('/tasks')
            },
          }
        })
    }

    // 4. Vocabulary Words
    let matchedVocab = []
    if (activeCategory === 'all' || activeCategory === 'vocab') {
      matchedVocab = (allWords || [])
        .filter((w) => {
          if (!q) return true
          const wordMatch = w.word?.toLowerCase().includes(q)
          const defMatch = w.definition?.toLowerCase().includes(q)
          const posMatch = w.part_of_speech?.toLowerCase().includes(q)
          return wordMatch || defMatch || posMatch
        })
        .slice(0, activeCategory === 'vocab' ? 30 : 6)
        .map((w) => ({
          id: `vocab-${w.id || w.word}`,
          type: 'vocab',
          category: 'vocab',
          raw: w,
          title: w.word,
          subtitle: w.definition ? w.definition.slice(0, 70) : (w.part_of_speech || 'Vocabulary word'),
          pos: w.part_of_speech,
          correctCount: w.correct_count || 0,
          icon: BookOpen,
          action: (nav) => {
            nav('/vocab/list')
          },
        }))
    }

    return [...actionItems, ...matchedTasks, ...matchedLists, ...matchedVocab]
  }, [
    searchQuery,
    activeCategory,
    tasks,
    lists,
    allWords,
    setSelectedTask,
    setActiveListId,
    onOpenShortcutsHelp,
    isRunning,
    isPaused,
    startTimer,
    pauseTimer,
    resumeTimer,
    activeTheme,
    presetThemes,
    applyTheme,
  ])

  // Clamped selected index derived safely during render
  const selectedIndex = filteredItems.length === 0 ? 0 : Math.min(rawSelectedIndex, filteredItems.length - 1)

  // Scroll active item into view
  useEffect(() => {
    if (!listContainerRef.current) return
    const activeEl = listContainerRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])

  const executeItem = useCallback(
    (item) => {
      if (!item) return
      onClose()
      item.action(navigate)
    },
    [navigate, onClose]
  )

  // Keyboard navigation within the modal
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setRawSelectedIndex((prev) => (filteredItems.length ? (prev + 1) % filteredItems.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setRawSelectedIndex((prev) =>
        filteredItems.length ? (prev - 1 + filteredItems.length) % filteredItems.length : 0
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[selectedIndex]) {
        executeItem(filteredItems[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
    setRawSelectedIndex(0)
  }

  const handleCategorySelect = (catId) => {
    setActiveCategory(catId)
    setRawSelectedIndex(0)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 sm:px-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Palette Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -10 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className={`relative w-full max-w-2xl bg-nocturn-card border border-nocturn-border shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden z-10 flex flex-col max-h-[80vh] ${
            isAngular ? 'rounded-none angular-chamfer font-mono' : 'rounded-3xl'
          }`}
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-nocturn-border/80 bg-nocturn-surface/70">
            <Search className="w-5 h-5 text-nocturn-accent shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              placeholder={isAngular ? '[ SEARCH_COMMAND_OR_RECORD... ]' : 'Type a command, search tasks, lists, or vocabulary...'}
              className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder:text-nocturn-muted focus:outline-none min-w-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setRawSelectedIndex(0)
                }}
                className="p-1 text-nocturn-muted hover:text-white rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium text-nocturn-muted bg-black/40 border border-white/10 rounded">
              ESC
            </kbd>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-nocturn-border/50 bg-black/20 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Results' },
              { id: 'tasks', label: 'Tasks' },
              { id: 'lists', label: 'Lists' },
              { id: 'vocab', label: 'Vocabulary' },
              { id: 'navigation', label: 'Actions & Nav' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-nocturn-accent/20 text-nocturn-accent-bright border border-nocturn-accent/40'
                    : 'text-nocturn-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Results List */}
          <div
            ref={listContainerRef}
            className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 custom-scrollbar min-h-[160px] max-h-[50vh]"
          >
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Search className="w-8 h-8 text-nocturn-muted/40 mx-auto" />
                <p className="text-sm font-medium text-nocturn-muted">
                  No matching results found for &ldquo;{searchQuery}&rdquo;
                </p>
                <p className="text-xs text-nocturn-muted/60">
                  Try searching for task titles, vocabulary words, lists, or commands.
                </p>
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const Icon = item.icon
                const isSelected = index === selectedIndex

                return (
                  <div
                    key={item.id}
                    data-index={index}
                    onClick={() => executeItem(item)}
                    onMouseEnter={() => setRawSelectedIndex(index)}
                    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                      isAngular ? 'rounded-none' : 'rounded-2xl'
                    } ${
                      isSelected
                        ? isAngular
                          ? 'bg-nocturn-accent/15 border border-nocturn-accent/40 text-white translate-x-0.5'
                          : 'bg-nocturn-accent/15 border border-nocturn-accent/30 text-white translate-x-0.5 shadow-sm'
                        : 'text-nocturn-text hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          item.type === 'task'
                            ? item.completed
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-nocturn-surface text-nocturn-muted'
                            : item.type === 'vocab'
                            ? 'bg-purple-500/15 text-purple-400'
                            : item.type === 'list'
                            ? 'bg-blue-500/15 text-blue-400'
                            : 'bg-nocturn-accent/15 text-nocturn-accent'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs sm:text-sm font-semibold truncate ${
                              item.completed ? 'line-through text-nocturn-muted' : 'text-white'
                            }`}
                          >
                            {item.title}
                          </span>
                          {item.priority === 'high' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                              High
                            </span>
                          )}
                          {item.correctCount !== undefined && item.correctCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                              {item.correctCount}/5
                            </span>
                          )}
                        </div>
                        {item.subtitle && (
                          <p className="text-[11px] text-nocturn-muted truncate">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-nocturn-muted/60 hidden sm:inline-block">
                        {item.type}
                      </span>
                      {isSelected && (
                        <ArrowRight className="w-4 h-4 text-nocturn-accent animate-pulse" />
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Guide */}
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-nocturn-border/60 bg-nocturn-surface/40 text-[11px] text-nocturn-muted">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-black/40 px-1 py-0.5 rounded border border-white/10 text-[10px]">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-black/40 px-1 py-0.5 rounded border border-white/10 text-[10px]">↵</kbd> Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-black/40 px-1 py-0.5 rounded border border-white/10 text-[10px]">ESC</kbd> Close
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenShortcutsHelp?.()
              }}
              className="text-nocturn-accent hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>All Shortcuts</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default function CommandPaletteModal({
  isOpen,
  onClose,
  onOpenShortcutsHelp,
}) {
  if (!isOpen) return null

  return (
    <CommandPaletteDialog
      onClose={onClose}
      onOpenShortcutsHelp={onOpenShortcutsHelp}
    />
  )
}
