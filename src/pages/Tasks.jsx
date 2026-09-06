import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TaskListNav from '../components/tasks/TaskListNav'
import TaskItemRow from '../components/tasks/TaskItemRow'
import TaskDetailDrawer from '../components/tasks/TaskDetailDrawer'
import EmptyTasks from '../components/tasks/EmptyTasks'
import AddTask from '../components/tasks/AddTask'
import BulkTaskMenu from '../components/tasks/BulkTaskMenu'
import { useTasks } from '../context/useTasks'
import { formatDateKey } from '../services/calendarService'
import { Sun, ListTodo, CheckCircle2, CheckSquare } from 'lucide-react'

export default function Tasks() {
  const {
    tasks,
    lists,
    activeListId,
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

  const todayKey = formatDateKey(new Date())
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowKey = formatDateKey(tomorrowDate)

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
        // Strict rule: ONLY tasks explicitly added to My Day belong in My Day
        const isExplicitlyInMyDay = Boolean(t.inMyDay || t.myDayDate === todayKey)
        if (!isExplicitlyInMyDay) return false

        // If it has a due date, it must be today or tomorrow (tasks due later do not belong in My Day)
        if (t.dueDate) {
          return t.dueDate === todayKey || t.dueDate === tomorrowKey
        }
        return true
      })
    }
    if (activeListId === 'all') {
      return tasks
    }
    if (activeListId === 'completed') {
      return tasks.filter((t) => t.completed)
    }
    return tasks.filter((t) => t.listId === activeListId)
  }, [tasks, activeListId, todayKey, tomorrowKey])

  const activeTasks = useMemo(() => filteredTasks.filter((t) => !t.completed), [filteredTasks])
  const completedTasks = useMemo(() => filteredTasks.filter((t) => t.completed), [filteredTasks])

  const totalCount = filteredTasks.length
  const completedCount = completedTasks.length

  const handleAddTask = (title, day) => {
    let dueDate = null
    if (day === 'today') {
      dueDate = todayKey
    } else if (day === 'tomorrow') {
      dueDate = tomorrowKey
    } else if (day && day !== 'none') {
      dueDate = day
    }
    const inMyDay = activeListId === 'my-day'
    addTask(title, activeListId, dueDate, 'medium', false, inMyDay)
  }

  const HeaderIcon = currentListObj?.icon || CheckSquare

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Page Header with Bulk Task Action Menu */}
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs sm:text-sm font-medium text-nocturn-muted uppercase tracking-wider">
            Task Manager
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <HeaderIcon className="w-6 h-6 sm:w-7 sm:h-7 text-nocturn-accent" />
            <span>{currentListObj?.name}</span>
          </h1>
          <p className="text-xs sm:text-sm text-nocturn-muted flex items-center gap-2 flex-wrap">
            <span>{currentListObj?.description}</span>
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
                          isSelected={selectedTask?.id === task.id}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Completed Tasks Group */}
              {completedTasks.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-nocturn-muted border-b border-nocturn-border/60 pb-1.5">
                    <span>Completed ({completedTasks.length})</span>
                  </div>
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
                            isSelected={selectedTask?.id === task.id}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
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
