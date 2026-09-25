import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import TaskListNav from '../components/tasks/TaskListNav'
import TaskItemRow from '../components/tasks/TaskItemRow'
import TaskDetailDrawer from '../components/tasks/TaskDetailDrawer'
import EmptyTasks from '../components/tasks/EmptyTasks'
import AddTask from '../components/tasks/AddTask'
import MobileQuickAddSheet from '../components/tasks/MobileQuickAddSheet'
import BulkTaskMenu from '../components/tasks/BulkTaskMenu'
import BulkActionBar from '../components/tasks/BulkActionBar'
import { Progress } from '../components/ui/Progress'
import { Skeleton } from '../components/ui/Skeleton'
import { useTasks } from '../context/useTasks'
import { formatDateKey } from '../services/calendarService'
import {
  Sun,
  Inbox,
  CalendarDays,
  ListTodo,
  CheckCircle2,
  CheckSquare,
  Sparkles,
  ChevronDown,
  Plus,
  ArrowUpDown,
  Layers,
} from 'lucide-react'

// Modular Task Group Section Component
function TaskGroupSection({
  title,
  badge,
  badgeVariant = 'default',
  tasks = [],
  lists = [],
  onToggleComplete,
  onToggleStar,
  onSelectTask,
  onDeleteTask,
  selectedTask,
  isSelectMode,
  selectedTaskIds,
  onToggleBulkSelect,
}) {
  if (!tasks || tasks.length === 0) return null

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-1">
        <span
          className={
            badgeVariant === 'rose'
              ? 'text-rose-400'
              : badgeVariant === 'accent'
              ? 'text-nocturn-accent'
              : 'text-nocturn-muted'
          }
        >
          {title}
        </span>
        <span
          className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono border ${
            badgeVariant === 'rose'
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/25'
              : badgeVariant === 'accent'
              ? 'bg-nocturn-accent/15 text-nocturn-accent-bright border-nocturn-accent/25'
              : 'bg-white/[0.06] text-nocturn-muted border-white/10'
          }`}
        >
          {badge !== undefined ? badge : tasks.length}
        </span>
      </div>
      <AnimatePresence mode="popLayout">
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -2 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <TaskItemRow
              task={task}
              lists={lists}
              onToggleComplete={onToggleComplete}
              onToggleStar={onToggleStar}
              onSelectTask={onSelectTask}
              onDeleteTask={onDeleteTask}
              isSelected={selectedTask?.id === task.id}
              isSelectMode={isSelectMode}
              isBulkSelected={selectedTaskIds.includes(task.id)}
              onToggleBulkSelect={onToggleBulkSelect}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawView = searchParams.get('view')
  const listParam = searchParams.get('list')

  const {
    isLoading,
    tasks,
    lists,
    activeListId,
    setActiveListId,
    selectedTask,
    setSelectedTask,
    addTask,
    updateTask,
    toggleTask,
    toggleStar,
    deleteTask,
    duplicateTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    selectedTaskIds: contextSelectedTaskIds,
    setSelectedTaskIds: contextSetSelectedTaskIds,
  } = useTasks()

  const [localSelectedTaskIds, setLocalSelectedTaskIds] = useState([])
  const selectedTaskIds = contextSelectedTaskIds !== undefined ? contextSelectedTaskIds : localSelectedTaskIds
  const setSelectedTaskIds = contextSetSelectedTaskIds || setLocalSelectedTaskIds

  const handleCloseDrawer = useCallback(() => {
    setSelectedTask(null)
  }, [setSelectedTask])

  const [isCompletedOpen, setIsCompletedOpen] = useState(false)
  const [isMobileQuickAddOpen, setIsMobileQuickAddOpen] = useState(false)
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [sortBy, setSortBy] = useState('default')
  const [sortDirection, setSortDirection] = useState('asc')
  const [groupBy, setGroupBy] = useState('default')

  // Resolve target list ID from URL query parameters
  const targetIdFromUrl = useMemo(() => {
    if (listParam) return listParam
    if (rawView === 'myday' || rawView === 'my-day') return 'my-day'
    if (rawView === 'inbox') return 'inbox'
    if (rawView === 'upcoming') return 'upcoming'
    if (rawView === 'all') return 'all'
    if (rawView === 'completed') return 'completed'
    if (rawView) return rawView
    return null
  }, [rawView, listParam])

  // Sync from URL to activeListId
  useEffect(() => {
    if (targetIdFromUrl && targetIdFromUrl !== activeListId) {
      setActiveListId(targetIdFromUrl)
    }
  }, [targetIdFromUrl, activeListId, setActiveListId])

  // Centralized view switcher that updates both context state and URL query params
  const handleSelectView = (viewId) => {
    setActiveListId(viewId)
    setSelectedTaskIds([])
    if (viewId === 'my-day') {
      setSearchParams({ view: 'myday' }, { replace: true })
    } else if (viewId === 'inbox') {
      setSearchParams({ view: 'inbox' }, { replace: true })
    } else if (viewId === 'upcoming') {
      setSearchParams({ view: 'upcoming' }, { replace: true })
    } else if (viewId === 'all') {
      setSearchParams({ view: 'all' }, { replace: true })
    } else if (viewId === 'completed') {
      setSearchParams({ view: 'completed' }, { replace: true })
    } else {
      setSearchParams({ view: 'list', list: viewId }, { replace: true })
    }
  }

  // Date anchors
  const todayKey = formatDateKey(new Date())
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowKey = formatDateKey(tomorrowDate)

  const weekEndDate = new Date()
  weekEndDate.setDate(weekEndDate.getDate() + 7)
  const weekEndKey = formatDateKey(weekEndDate)

  const nextWeekEndDate = new Date()
  nextWeekEndDate.setDate(nextWeekEndDate.getDate() + 14)
  const nextWeekEndKey = formatDateKey(nextWeekEndDate)

  // Contextual greeting and formatted date for My Day centerpiece
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }, [])

  // Get active view/list information
  const currentListObj = useMemo(() => {
    if (activeListId === 'my-day') return { name: 'My Day', icon: Sun, description: 'Focus on today’s priorities' }
    if (activeListId === 'inbox') return { name: 'Inbox', icon: Inbox, description: 'Capture, organize, and triage tasks' }
    if (activeListId === 'upcoming') return { name: 'Upcoming', icon: CalendarDays, description: 'Scheduled tasks timeline' }
    if (activeListId === 'all') return { name: 'All Tasks', icon: ListTodo, description: 'Everything across your lists' }
    if (activeListId === 'completed') return { name: 'Completed', icon: CheckCircle2, description: 'Accomplished tasks' }
    const custom = lists.find((l) => l.id === activeListId)
    return custom
      ? { name: custom.name, icon: CheckSquare, description: `${custom.name} task list` }
      : { name: 'Tasks', icon: CheckSquare, description: 'General task list' }
  }, [activeListId, lists])

  const filteredTasks = useMemo(() => {
    if (activeListId === 'my-day') {
      return tasks.filter((t) => {
        if (t.dueDate && t.dueDate > todayKey && !t.inMyDay) {
          return false
        }
        if (t.dueDate === todayKey) return true
        if (t.dueDate && t.dueDate < todayKey && !t.completed) return true
        if ((t.inMyDay || t.myDayDate === todayKey) && !t.completed) return true
        if (t.completed && (t.inMyDay || t.myDayDate === todayKey || t.dueDate === todayKey)) return true
        return false
      })
    }
    if (activeListId === 'inbox') {
      return tasks.filter((t) => (!t.listId || t.listId === 'tasks' || t.listId === 'inbox'))
    }
    if (activeListId === 'upcoming') {
      return tasks.filter((t) => !t.completed && t.dueDate)
    }
    if (activeListId === 'all') {
      return tasks
    }
    if (activeListId === 'completed') {
      return tasks.filter((t) => t.completed)
    }
    return tasks.filter((t) => t.listId === activeListId)
  }, [tasks, activeListId, todayKey])

  const rawActiveTasks = useMemo(() => filteredTasks.filter((t) => !t.completed), [filteredTasks])
  const completedTasks = useMemo(() => filteredTasks.filter((t) => t.completed), [filteredTasks])

  // Sorting
  const sortedActiveTasks = useMemo(() => {
    if (sortBy === 'default') return rawActiveTasks

    return [...rawActiveTasks].sort((a, b) => {
      if (sortBy === 'priority') {
        const pMap = { urgent: 4, high: 3, medium: 2, low: 1 }
        const pA = pMap[a.priority] || 0
        const pB = pMap[b.priority] || 0
        return sortDirection === 'asc' ? pB - pA : pA - pB
      }
      if (sortBy === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return sortDirection === 'asc'
          ? a.dueDate.localeCompare(b.dueDate)
          : b.dueDate.localeCompare(a.dueDate)
      }
      if (sortBy === 'title') {
        return sortDirection === 'asc'
          ? (a.title || '').localeCompare(b.title || '')
          : (b.title || '').localeCompare(a.title || '')
      }
      if (sortBy === 'duration') {
        const durA = Number(a.estimatedDuration) || 0
        const durB = Number(b.estimatedDuration) || 0
        return sortDirection === 'asc' ? durA - durB : durB - durA
      }
      if (sortBy === 'createdAt') {
        const cA = new Date(a.createdAt || 0).getTime()
        const cB = new Date(b.createdAt || 0).getTime()
        return sortDirection === 'asc' ? cA - cB : cB - cA
      }
      return 0
    })
  }, [rawActiveTasks, sortBy, sortDirection])

  // Grouping structures
  const upcomingGroups = useMemo(() => {
    if (activeListId !== 'upcoming') return null
    return {
      overdue: sortedActiveTasks.filter((t) => t.dueDate && t.dueDate < todayKey),
      today: sortedActiveTasks.filter((t) => t.dueDate === todayKey),
      tomorrow: sortedActiveTasks.filter((t) => t.dueDate === tomorrowKey),
      thisWeek: sortedActiveTasks.filter((t) => t.dueDate > tomorrowKey && t.dueDate <= weekEndKey),
      nextWeek: sortedActiveTasks.filter((t) => t.dueDate > weekEndKey && t.dueDate <= nextWeekEndKey),
      later: sortedActiveTasks.filter((t) => t.dueDate > nextWeekEndKey),
    }
  }, [activeListId, sortedActiveTasks, todayKey, tomorrowKey, weekEndKey, nextWeekEndKey])

  const myDayGroups = useMemo(() => {
    if (activeListId !== 'my-day') return null
    return {
      overdue: sortedActiveTasks.filter((t) => t.dueDate && t.dueDate < todayKey),
      dueToday: sortedActiveTasks.filter((t) => t.dueDate === todayKey),
      noDeadline: sortedActiveTasks.filter((t) => !t.dueDate || t.dueDate > todayKey),
    }
  }, [activeListId, sortedActiveTasks, todayKey])

  const priorityGroups = useMemo(() => {
    if (groupBy !== 'priority') return null
    return {
      urgent: sortedActiveTasks.filter((t) => t.priority === 'urgent' || t.priority === 'high'),
      medium: sortedActiveTasks.filter((t) => t.priority === 'medium' || !t.priority),
      low: sortedActiveTasks.filter((t) => t.priority === 'low'),
    }
  }, [groupBy, sortedActiveTasks])

  const dateGroups = useMemo(() => {
    if (groupBy !== 'date') return null
    return {
      overdue: sortedActiveTasks.filter((t) => t.dueDate && t.dueDate < todayKey),
      today: sortedActiveTasks.filter((t) => t.dueDate === todayKey),
      tomorrow: sortedActiveTasks.filter((t) => t.dueDate === tomorrowKey),
      upcoming: sortedActiveTasks.filter((t) => t.dueDate && t.dueDate > tomorrowKey),
      noDate: sortedActiveTasks.filter((t) => !t.dueDate),
    }
  }, [groupBy, sortedActiveTasks, todayKey, tomorrowKey])

  const listGroups = useMemo(() => {
    if (groupBy !== 'list') return null
    const groups = {}
    lists.forEach((list) => {
      const match = sortedActiveTasks.filter((t) => t.listId === list.id)
      if (match.length > 0) {
        groups[list.id] = { name: list.name, tasks: match }
      }
    })
    const unlisted = sortedActiveTasks.filter((t) => !t.listId || t.listId === 'tasks' || t.listId === 'inbox')
    if (unlisted.length > 0 && !groups['inbox']) {
      groups['inbox'] = { name: 'Inbox', tasks: unlisted }
    }
    return groups
  }, [groupBy, sortedActiveTasks, lists])

  const totalCount = filteredTasks.length
  const completedCount = completedTasks.length

  const handleToggleSelectTask = (id) => {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedTaskIds.length === rawActiveTasks.length) {
      setSelectedTaskIds([])
    } else {
      setSelectedTaskIds(rawActiveTasks.map((t) => t.id))
    }
  }

  const handleAddTask = (
    title,
    day,
    explicitInMyDay = false,
    priority = 'medium',
    reminder = null,
    extraFields = {}
  ) => {
    let dueDate = null
    if (day === 'today') {
      dueDate = todayKey
    } else if (day === 'tomorrow') {
      dueDate = tomorrowKey
    } else if (day && day !== 'none') {
      dueDate = day
    }
    const inMyDay = activeListId === 'my-day' || Boolean(explicitInMyDay)
    const targetListId =
      activeListId === 'upcoming' || activeListId === 'inbox' || activeListId === 'all'
        ? 'tasks'
        : activeListId
    addTask(title, targetListId, dueDate, priority, false, inMyDay, 'user', reminder, extraFields)
  }

  const HeaderIcon = currentListObj?.icon || CheckSquare
  const isMyDay = activeListId === 'my-day'

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Page Header with Bulk Task Action Menu */}
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs sm:text-sm font-medium text-nocturn-muted">
            {isMyDay ? formattedToday : 'Task Manager'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <HeaderIcon className="w-6 h-6 sm:w-7 sm:h-7 text-nocturn-accent" />
            <span>{isMyDay ? `${greeting}` : currentListObj?.name}</span>
          </h1>
          <p className="text-xs sm:text-sm text-nocturn-muted flex items-center gap-2 flex-wrap">
            <span>{isMyDay ? 'Focus on what matters most today.' : currentListObj?.description}</span>
            {totalCount > 0 && (
              <>
                <span className="text-nocturn-border">•</span>
                <span className="text-nocturn-accent font-medium">
                  {completedCount} of {totalCount} completed
                </span>
              </>
            )}
          </p>
        </div>

        <BulkTaskMenu
          activeListId={activeListId}
          completedCount={completedCount}
          totalCount={totalCount}
          isSelectMode={isSelectMode}
          onToggleSelectMode={() => {
            setIsSelectMode((v) => !v)
            setSelectedTaskIds([])
          }}
        />
      </header>

      {/* My Day Centerpiece Progress Card */}
      {isMyDay && totalCount > 0 && (
        <div className="bg-nocturn-card border border-nocturn-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Sparkles className="w-4 h-4 text-nocturn-accent" />
              <span>Today's Progress</span>
            </div>
            <span className="text-xs font-mono text-nocturn-muted">
              {completedCount} / {totalCount} ({Math.round((completedCount / totalCount) * 100)}%)
            </span>
          </div>
          <Progress
            value={completedCount}
            max={totalCount}
            size="sm"
            variant="accent"
          />
        </div>
      )}

      {/* Main Grid Layout: Navigation Sidebar + Task List Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Navigation */}
        <div className="lg:col-span-3 xl:col-span-3 bg-nocturn-card/60 p-3.5 sm:p-4 rounded-2xl border border-nocturn-border/80">
          <TaskListNav onSelectView={handleSelectView} />
        </div>

        {/* Right Tasks Content - Fixed Stationary Width */}
        <div className="lg:col-span-9 xl:col-span-9 space-y-5 min-w-0">
          {/* Add Task Bar */}
          {activeListId !== 'completed' && (
            <AddTask
              onAddTask={handleAddTask}
              defaultDay={
                activeListId === 'my-day'
                  ? 'today'
                  : activeListId === 'upcoming'
                  ? 'tomorrow'
                  : 'none'
              }
              defaultInMyDay={activeListId === 'my-day'}
            />
          )}

          {/* Sort & Group Control Toolbar */}
          {filteredTasks.length > 0 && activeListId !== 'completed' && (
            <div className="flex items-center justify-between gap-2 px-1 text-xs text-nocturn-muted flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Sort selector */}
                <div className="flex items-center gap-1.5 bg-nocturn-card border border-nocturn-border/70 rounded-xl px-2.5 py-1.5 shadow-sm">
                  <ArrowUpDown className="w-3.5 h-3.5 text-nocturn-muted" />
                  <span className="text-[11px] text-nocturn-muted hidden sm:inline">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-white text-xs outline-none cursor-pointer"
                  >
                    <option value="default" className="bg-[#12141c] text-white">Default</option>
                    <option value="dueDate" className="bg-[#12141c] text-white">Due Date</option>
                    <option value="priority" className="bg-[#12141c] text-white">Priority</option>
                    <option value="title" className="bg-[#12141c] text-white">Title</option>
                    <option value="duration" className="bg-[#12141c] text-white">Duration</option>
                    <option value="createdAt" className="bg-[#12141c] text-white">Created Date</option>
                  </select>
                  {sortBy !== 'default' && (
                    <button
                      type="button"
                      onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                      className="text-[10px] font-mono text-nocturn-accent hover:text-white px-1 ml-1 cursor-pointer"
                      title={`Toggle sort direction: currently ${sortDirection.toUpperCase()}`}
                    >
                      {sortDirection.toUpperCase()}
                    </button>
                  )}
                </div>

                {/* Group selector */}
                <div className="flex items-center gap-1.5 bg-nocturn-card border border-nocturn-border/70 rounded-xl px-2.5 py-1.5 shadow-sm">
                  <Layers className="w-3.5 h-3.5 text-nocturn-muted" />
                  <span className="text-[11px] text-nocturn-muted hidden sm:inline">Group:</span>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="bg-transparent text-white text-xs outline-none cursor-pointer"
                  >
                    <option value="default" className="bg-[#12141c] text-white">Default</option>
                    <option value="none" className="bg-[#12141c] text-white">None</option>
                    <option value="priority" className="bg-[#12141c] text-white">Priority</option>
                    <option value="date" className="bg-[#12141c] text-white">Date</option>
                    {activeListId === 'all' && (
                      <option value="list" className="bg-[#12141c] text-white">List</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Select Mode Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectMode((prev) => !prev)
                    setSelectedTaskIds([])
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
                    isSelectMode
                      ? 'bg-nocturn-accent/15 text-nocturn-accent-bright border-nocturn-accent/30'
                      : 'bg-nocturn-card text-nocturn-muted hover:text-white border-nocturn-border/70 shadow-sm'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{isSelectMode ? 'Cancel Selection' : 'Select'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Tasks List */}
          {isLoading ? (
            <div className="space-y-3" aria-label="Loading tasks...">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl border border-nocturn-border/50 bg-nocturn-card/40"
                >
                  <Skeleton className="w-4 h-4 rounded-md shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-3/5 rounded-md" />
                    <Skeleton className="h-2.5 w-1/4 rounded-md opacity-60" />
                  </div>
                  <Skeleton className="w-4 h-4 rounded-md shrink-0 opacity-40" />
                </div>
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <EmptyTasks
              activeListId={activeListId}
              onAddTask={() => {
                const input = document.querySelector('input[placeholder*="Add a task"], input[type="text"]')
                if (input && window.innerWidth >= 640) {
                  input.focus()
                } else {
                  setIsMobileQuickAddOpen(true)
                }
              }}
            />
          ) : (
            <div className="space-y-6">
              {/* Completed View: Display all completed tasks directly */}
              {activeListId === 'completed' ? (
                <div className="space-y-2.5">
                  <AnimatePresence mode="popLayout">
                    {completedTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -2 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                      >
                        <TaskItemRow
                          task={task}
                          lists={lists}
                          onToggleComplete={toggleTask}
                          onToggleStar={toggleStar}
                          onSelectTask={setSelectedTask}
                          onDeleteTask={deleteTask}
                          isSelected={selectedTask?.id === task.id}
                          isSelectMode={isSelectMode}
                          isBulkSelected={selectedTaskIds.includes(task.id)}
                          onToggleBulkSelect={handleToggleSelectTask}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : groupBy === 'priority' && priorityGroups ? (
                /* Explicit Priority Grouping */
                <div className="space-y-6">
                  <TaskGroupSection
                    title="Urgent & High"
                    badgeVariant="rose"
                    tasks={priorityGroups.urgent}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                  <TaskGroupSection
                    title="Medium"
                    badgeVariant="accent"
                    tasks={priorityGroups.medium}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                  <TaskGroupSection
                    title="Low"
                    badgeVariant="default"
                    tasks={priorityGroups.low}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                </div>
              ) : groupBy === 'date' && dateGroups ? (
                /* Explicit Date Grouping */
                <div className="space-y-6">
                  <TaskGroupSection
                    title="Overdue"
                    badgeVariant="rose"
                    tasks={dateGroups.overdue}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                  <TaskGroupSection
                    title="Today"
                    badgeVariant="accent"
                    tasks={dateGroups.today}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                  <TaskGroupSection
                    title="Tomorrow"
                    badgeVariant="default"
                    tasks={dateGroups.tomorrow}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                  <TaskGroupSection
                    title="Upcoming"
                    badgeVariant="default"
                    tasks={dateGroups.upcoming}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                  <TaskGroupSection
                    title="No Due Date"
                    badgeVariant="default"
                    tasks={dateGroups.noDate}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                </div>
              ) : groupBy === 'list' && listGroups ? (
                /* Explicit List Grouping */
                <div className="space-y-6">
                  {Object.entries(listGroups).map(([id, group]) => (
                    <TaskGroupSection
                      key={id}
                      title={group.name}
                      badgeVariant="default"
                      tasks={group.tasks}
                      lists={lists}
                      onToggleComplete={toggleTask}
                      onToggleStar={toggleStar}
                      onSelectTask={setSelectedTask}
                      onDeleteTask={deleteTask}
                      selectedTask={selectedTask}
                      isSelectMode={isSelectMode}
                      selectedTaskIds={selectedTaskIds}
                      onToggleBulkSelect={handleToggleSelectTask}
                    />
                  ))}
                </div>
              ) : activeListId === 'upcoming' && upcomingGroups ? (
                /* Default Upcoming View Grouping */
                <div className="space-y-6">
                  <TaskGroupSection
                    title="Overdue"
                    badgeVariant="rose"
                    tasks={upcomingGroups.overdue}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                  <TaskGroupSection
                    title="Today"
                    badgeVariant="accent"
                    tasks={upcomingGroups.today}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                  <TaskGroupSection
                    title="Tomorrow"
                    badgeVariant="default"
                    tasks={upcomingGroups.tomorrow}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                  <TaskGroupSection
                    title="This Week"
                    badgeVariant="default"
                    tasks={upcomingGroups.thisWeek}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                  <TaskGroupSection
                    title="Next Week"
                    badgeVariant="default"
                    tasks={upcomingGroups.nextWeek}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                  <TaskGroupSection
                    title="Later"
                    badgeVariant="default"
                    tasks={upcomingGroups.later}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                </div>
              ) : isMyDay && myDayGroups && groupBy === 'default' ? (
                /* Default My Day View Grouping */
                <div className="space-y-6">
                  <TaskGroupSection
                    title="Overdue"
                    badgeVariant="rose"
                    tasks={myDayGroups.overdue}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                  <TaskGroupSection
                    title="Due Today"
                    badgeVariant="accent"
                    tasks={myDayGroups.dueToday}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                  <TaskGroupSection
                    title="No Deadline"
                    badgeVariant="default"
                    tasks={myDayGroups.noDeadline}
                    lists={lists}
                    onToggleComplete={toggleTask}
                    onToggleStar={toggleStar}
                    onSelectTask={setSelectedTask}
                    onDeleteTask={deleteTask}
                    selectedTask={selectedTask}
                    isSelectMode={isSelectMode}
                    selectedTaskIds={selectedTaskIds}
                    onToggleBulkSelect={handleToggleSelectTask}
                  />
                </div>
              ) : (
                /* Single List / Flat View */
                sortedActiveTasks.length > 0 && (
                  <div className="space-y-2.5">
                    <AnimatePresence mode="popLayout">
                      {sortedActiveTasks.map((task) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98, y: -2 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                        >
                          <TaskItemRow
                            task={task}
                            lists={lists}
                            onToggleComplete={toggleTask}
                            onToggleStar={toggleStar}
                            onSelectTask={setSelectedTask}
                            onDeleteTask={deleteTask}
                            isSelected={selectedTask?.id === task.id}
                            isSelectMode={isSelectMode}
                            isBulkSelected={selectedTaskIds.includes(task.id)}
                            onToggleBulkSelect={handleToggleSelectTask}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )
              )}

              {/* Completed Tasks Group (Collapsible for non-completed views) */}
              {activeListId !== 'completed' && completedTasks.length > 0 && (
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCompletedOpen((prev) => !prev)}
                    className="flex items-center gap-2 text-xs font-semibold text-nocturn-muted hover:text-white border-b border-nocturn-border/60 pb-1.5 w-full text-left cursor-pointer transition-colors"
                  >
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isCompletedOpen ? '' : '-rotate-90'
                      }`}
                    />
                    <span>Completed ({completedTasks.length})</span>
                  </button>

                  <AnimatePresence>
                    {isCompletedOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-2.5 overflow-hidden"
                      >
                        {completedTasks.map((task) => (
                          <TaskItemRow
                            key={task.id}
                            task={task}
                            lists={lists}
                            onToggleComplete={toggleTask}
                            onToggleStar={toggleStar}
                            onSelectTask={setSelectedTask}
                            onDeleteTask={deleteTask}
                            isSelected={selectedTask?.id === task.id}
                            isSelectMode={isSelectMode}
                            isBulkSelected={selectedTaskIds.includes(task.id)}
                            onToggleBulkSelect={handleToggleSelectTask}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Panel / Drawer */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailDrawer
            key={selectedTask.id}
            task={selectedTask}
            lists={lists}
            allTasks={tasks}
            onClose={handleCloseDrawer}
            onUpdateTask={updateTask}
            onToggleComplete={toggleTask}
            onDeleteTask={deleteTask}
            onDuplicateTask={duplicateTask}
            onAddSubtask={addSubtask}
            onToggleSubtask={toggleSubtask}
            onDeleteSubtask={deleteSubtask}
          />
        )}
      </AnimatePresence>

      {/* Bulk Action Bar (Multi-select) */}
      <AnimatePresence>
        {selectedTaskIds.length > 0 && (
          <BulkActionBar
            selectedTaskIds={selectedTaskIds}
            onClearSelection={() => setSelectedTaskIds([])}
            onSelectAll={handleSelectAll}
            totalTasksCount={rawActiveTasks.length}
          />
        )}
      </AnimatePresence>

      {/* Mobile Floating Quick Add Button (FAB) */}
      <button
        type="button"
        onClick={() => setIsMobileQuickAddOpen(true)}
        aria-label="Quick add task"
        className="lg:hidden fixed bottom-20 right-4 sm:right-6 z-30 w-13 h-13 rounded-full bg-nocturn-accent hover:bg-nocturn-accent-bright text-white shadow-[0_8px_24px_rgba(var(--color-nocturn-accent-rgb),0.4)] flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Mobile Quick Add Bottom Sheet */}
      <MobileQuickAddSheet
        isOpen={isMobileQuickAddOpen}
        onClose={() => setIsMobileQuickAddOpen(false)}
        onAddTask={handleAddTask}
        defaultDay={
          activeListId === 'my-day'
            ? 'today'
            : activeListId === 'upcoming'
            ? 'tomorrow'
            : 'none'
        }
        defaultInMyDay={activeListId === 'my-day'}
      />
    </div>
  )
}
