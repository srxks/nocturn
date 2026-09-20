import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import TaskListNav from '../components/tasks/TaskListNav'
import TaskItemRow from '../components/tasks/TaskItemRow'
import TaskDetailDrawer from '../components/tasks/TaskDetailDrawer'
import EmptyTasks from '../components/tasks/EmptyTasks'
import AddTask from '../components/tasks/AddTask'
import BulkTaskMenu from '../components/tasks/BulkTaskMenu'
import { Progress } from '../components/ui/Progress'
import { useTasks } from '../context/useTasks'
import { formatDateKey } from '../services/calendarService'
import { Sun, ListTodo, CheckCircle2, CheckSquare, Sparkles, ChevronDown } from 'lucide-react'

export default function Tasks() {
  const [searchParams] = useSearchParams()
  const viewParam = searchParams.get('view')

  const {
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
    addSubtask,
    toggleSubtask,
    deleteSubtask,
  } = useTasks()

  const [isCompletedOpen, setIsCompletedOpen] = useState(false)

  // Sync route query parameter ?view=myday or ?view=all with activeListId
  useEffect(() => {
    if (viewParam === 'myday' && activeListId !== 'my-day') {
      setActiveListId('my-day')
    } else if (viewParam === 'all' && activeListId !== 'all') {
      setActiveListId('all')
    }
  }, [viewParam, activeListId, setActiveListId])

  const todayKey = formatDateKey(new Date())
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowKey = formatDateKey(tomorrowDate)

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
        // Exclude future-only tasks unless explicitly added to My Day
        if (t.dueDate && t.dueDate > todayKey && !t.inMyDay) {
          return false
        }

        // 1. Tasks due today
        if (t.dueDate === todayKey) return true

        // 2. Overdue incomplete tasks from previous days
        if (t.dueDate && t.dueDate < todayKey && !t.completed) return true

        // 3. Incomplete tasks in My Day
        if ((t.inMyDay || t.myDayDate === todayKey) && !t.completed) return true

        // 4. Completed tasks for today / in My Day
        if (t.completed && (t.inMyDay || t.myDayDate === todayKey || t.dueDate === todayKey)) return true

        return false
      })
    }
    if (activeListId === 'all') {
      return tasks
    }
    if (activeListId === 'completed') {
      return tasks.filter((t) => t.completed)
    }
    return tasks.filter((t) => t.listId === activeListId)
  }, [tasks, activeListId, todayKey])

  const activeTasks = useMemo(() => filteredTasks.filter((t) => !t.completed), [filteredTasks])
  const completedTasks = useMemo(() => filteredTasks.filter((t) => t.completed), [filteredTasks])

  const totalCount = filteredTasks.length
  const completedCount = completedTasks.length

  const handleAddTask = (title, day, explicitInMyDay = false) => {
    let dueDate = null
    if (day === 'today') {
      dueDate = todayKey
    } else if (day === 'tomorrow') {
      dueDate = tomorrowKey
    } else if (day && day !== 'none') {
      dueDate = day
    }
    const inMyDay = activeListId === 'my-day' || Boolean(explicitInMyDay)
    addTask(title, activeListId, dueDate, 'medium', false, inMyDay)
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
            <span>{isMyDay ? "Focus on what matters most today." : currentListObj?.description}</span>
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
          <TaskListNav />
        </div>

        {/* Right Tasks Content - Fixed Stationary Width */}
        <div className="lg:col-span-9 xl:col-span-9 space-y-6 min-w-0">
          {/* Add Task Bar */}
          {activeListId !== 'completed' && (
            <AddTask
              onAddTask={handleAddTask}
              defaultDay={activeListId === 'my-day' ? 'today' : 'none'}
              defaultInMyDay={activeListId === 'my-day'}
            />
          )}

          {/* Tasks List */}
          {filteredTasks.length === 0 ? (
            <EmptyTasks />
          ) : (
            <div className="space-y-6">
              {/* Active Tasks Group */}
              {activeTasks.length > 0 && (
                <div className="space-y-2.5">
                  <AnimatePresence mode="popLayout">
                    {activeTasks.map((task) => (
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
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Completed Tasks Group (Collapsible) */}
              {completedTasks.length > 0 && (
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
            task={selectedTask}
            lists={lists}
            onClose={() => setSelectedTask(null)}
            onUpdateTask={updateTask}
            onToggleComplete={toggleTask}
            onDeleteTask={deleteTask}
            onAddSubtask={addSubtask}
            onToggleSubtask={toggleSubtask}
            onDeleteSubtask={deleteSubtask}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
