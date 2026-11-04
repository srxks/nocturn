import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import {
  Sun,
  Play,
  Clock,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useTasks } from '../context/useTasks'
import { useAuth } from '../context/useAuth'
import { formatDateKey } from '../services/calendarService'
import { getSessionDurationMinutes, isFocusSessionRecord } from '../services/statsService'
import TaskItemRow from '../components/tasks/TaskItemRow'
import TaskDetailDrawer from '../components/tasks/TaskDetailDrawer'

export default function Today() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    tasks,
    lists,
    addTask,
    updateTask,
    toggleTask,
    toggleStar,
    deleteTask,
    duplicateTask,
    addSubtask,
    updateSubtask,
    reorderSubtasks,
    toggleSubtask,
    deleteSubtask,
    selectedTask,
    setSelectedTask,
  } = useTasks()

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const inputRef = useRef(null)

  // Today date formatting
  const today = useMemo(() => new Date(), [])
  const todayKey = useMemo(() => formatDateKey(today), [today])
  const formattedDate = useMemo(() => {
    return today.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }, [today])

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = today.getHours()
    const name =
      user?.user_metadata?.full_name?.split(' ')[0] ||
      user?.user_metadata?.name?.split(' ')[0] ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('nocturn_user_name') : null) ||
      'there'

    if (hour < 12) return `Good morning, ${name}`
    if (hour < 17) return `Good afternoon, ${name}`
    return `Good evening, ${name}`
  }, [today, user])

  // Query today's focus sessions from Dexie
  const liveSessions = useLiveQuery(async () => {
    if (!db || !db.pomodoroSessions) return []
    return await db.pomodoroSessions.toArray()
  }, [])
  const rawSessions = useMemo(() => liveSessions || [], [liveSessions])

  // Calculate today's focus minutes
  const todayFocusMinutes = useMemo(() => {
    const focusSessions = rawSessions
      .filter(isFocusSessionRecord)
      .filter((s) => {
        const d = s.completedAt || s.ended_at || s.createdAt || s.created_at || s.startedAt
        return d && formatDateKey(new Date(d)) === todayKey
      })
    const mins = focusSessions.reduce((acc, s) => acc + getSessionDurationMinutes(s), 0)
    return Math.round(mins)
  }, [rawSessions, todayKey])

  const targetMinutes = 100 // Target 100 mins daily default
  const focusProgressPercent = Math.min(100, Math.round((todayFocusMinutes / targetMinutes) * 100))

  // Filter Tasks for Today (My Day + Due Today)
  const todayTasks = useMemo(() => {
    return (tasks || []).filter(
      (t) => !t.completed && (t.inMyDay || t.myDayDate === todayKey || t.dueDate === todayKey)
    )
  }, [tasks, todayKey])

  // Overdue Tasks (Due prior to today, not yet completed)
  const overdueTasks = useMemo(() => {
    return (tasks || []).filter(
      (t) =>
        !t.completed &&
        t.dueDate &&
        t.dueDate < todayKey &&
        !t.inMyDay &&
        t.myDayDate !== todayKey
    )
  }, [tasks, todayKey])

  // Completed Today
  const completedTodayTasks = useMemo(() => {
    return (tasks || []).filter(
      (t) =>
        t.completed &&
        ((t.completedAt && formatDateKey(new Date(t.completedAt)) === todayKey) ||
          (t.updatedAt && formatDateKey(new Date(t.updatedAt)) === todayKey))
    )
  }, [tasks, todayKey])

  // Upcoming Tasks (next 5 items due in future)
  const upcomingTasks = useMemo(() => {
    return (tasks || [])
      .filter((t) => !t.completed && t.dueDate && t.dueDate > todayKey)
      .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
      .slice(0, 4)
  }, [tasks, todayKey])

  // Quick Add task for Today
  const handleQuickAdd = async (e) => {
    e.preventDefault()
    const trimmed = newTaskTitle.trim()
    if (!trimmed) return

    await addTask(trimmed, 'tasks', todayKey, 'medium', false, true)
    setNewTaskTitle('')
  }

  // Reschedule all overdue tasks to today
  const handleRescheduleOverdueToToday = async () => {
    for (const task of overdueTasks) {
      await updateTask(task.id, {
        dueDate: todayKey,
        inMyDay: true,
        myDayDate: todayKey,
      })
    }
  }

  const handleStartFocus = () => {
    const firstTask = todayTasks[0]
    if (firstTask) {
      navigate('/timer', { state: { taskName: firstTask.title, taskId: firstTask.id } })
    } else {
      navigate('/timer')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 1. Greeting & Date Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-emerald-400 font-mono">
            {formattedDate}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
            {greeting}
          </h1>
        </div>

        {/* Quick Focus CTA */}
        <button
          type="button"
          onClick={handleStartFocus}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Start Focus</span>
        </button>
      </div>

      {/* 2. Today's Focus Progress Summary Strip */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white font-mono">
                {todayFocusMinutes}m
              </span>
              <span className="text-xs text-neutral-400">
                focused today ({focusProgressPercent}%)
              </span>
            </div>
            <div className="w-40 sm:w-48 h-1.5 bg-white/10 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${focusProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-neutral-400 self-end sm:self-auto">
          <span>
            <strong className="text-white font-mono">{completedTodayTasks.length}</strong> tasks completed
          </span>
          <span className="text-white/20">•</span>
          <button
            type="button"
            onClick={() => navigate('/plan')}
            className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>AI Day Plan</span>
          </button>
        </div>
      </div>

      {/* 3. Overdue Tasks Alert Strip (if any) */}
      {overdueTasks.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-300 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span className="truncate">
              <strong>{overdueTasks.length}</strong> overdue {overdueTasks.length === 1 ? 'task' : 'tasks'} from previous days
            </span>
          </div>
          <button
            type="button"
            onClick={handleRescheduleOverdueToToday}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium whitespace-nowrap cursor-pointer transition-colors"
          >
            Move to Today
          </button>
        </div>
      )}

      {/* 4. Today's Action Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sun className="w-4 h-4 text-emerald-400" />
            <span>Today's Tasks</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-neutral-400 font-mono font-normal">
              {todayTasks.length}
            </span>
          </h2>

          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>All Tasks</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleQuickAdd} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="+ Add task for today... (Press Enter)"
            className="w-full bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.05] text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 outline-none focus:border-emerald-500/70 transition-all placeholder:text-neutral-500"
          />
          {newTaskTitle.trim() && (
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-emerald-500 text-black text-[11px] font-semibold cursor-pointer"
            >
              Add
            </button>
          )}
        </form>

        {/* Task List or Empty State */}
        {todayTasks.length > 0 ? (
          <div className="space-y-1.5">
            {todayTasks.map((task) => (
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
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-white/[0.015] border border-white/[0.06] text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Your day is clear</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                No tasks scheduled for today. Add a new objective above or start a focused session.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.focus()}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-colors cursor-pointer"
              >
                + Add a Task
              </button>
              <button
                type="button"
                onClick={handleStartFocus}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold shadow-md transition-colors cursor-pointer"
              >
                Start Focus
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Coming Up Next (Preview of next scheduled tasks) */}
      {upcomingTasks.length > 0 && (
        <div className="space-y-2.5 pt-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              <span>Coming Up Next</span>
            </h3>
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View Calendar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1.5">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="p-2.5 rounded-xl bg-white/[0.015] hover:bg-white/[0.04] border border-white/[0.06] flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors group"
              >
                <span className="text-neutral-300 group-hover:text-white truncate">
                  {task.title}
                </span>
                <span className="text-[11px] font-mono text-neutral-500 shrink-0">
                  {task.dueDate}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Details Drawer */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailDrawer
            key={selectedTask.id}
            task={selectedTask}
            lists={lists}
            allTasks={tasks}
            onClose={() => setSelectedTask(null)}
            onUpdateTask={updateTask}
            onToggleComplete={toggleTask}
            onDeleteTask={deleteTask}
            onDuplicateTask={duplicateTask}
            onAddSubtask={addSubtask}
            onUpdateSubtask={updateSubtask}
            onReorderSubtasks={reorderSubtasks}
            onToggleSubtask={toggleSubtask}
            onDeleteSubtask={deleteSubtask}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
