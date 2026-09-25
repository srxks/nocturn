import { useEffect, useState, useRef, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  X,
  Check,
  Sun,
  Calendar,
  Bell,
  Repeat,
  Flag,
  ListChecks,
  Plus,
  Trash2,
  Timer,
  Tag,
  Clock,
  Link2,
  Copy,
  AlertCircle,
} from 'lucide-react'
import { getTaskDeadlineConfig } from '../../utils/deadlineUtils'
import { requestNotificationPermission } from '../../services/notificationService'

const TaskDetailDrawer = memo(function TaskDetailDrawer({
  task,
  lists = [],
  allTasks = [],
  onClose,
  onUpdateTask,
  onToggleComplete,
  onDeleteTask,
  onDuplicateTask,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  isDesktopInline = false,
}) {
  const navigate = useNavigate()
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newLabelInput, setNewLabelInput] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [prevTaskId, setPrevTaskId] = useState(task?.id)
  const [localTitle, setLocalTitle] = useState(task?.title || '')
  const [localNotes, setLocalNotes] = useState(task?.notes || '')
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false
  })
  const titleTimeoutRef = useRef(null)
  const notesTimeoutRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Synchronize local title and notes when selected task changes
  if (task && task.id !== prevTaskId) {
    setPrevTaskId(task.id)
    setLocalTitle(task.title || '')
    setLocalNotes(task.notes || '')
  }

  const hasTask = Boolean(task)
  useEffect(() => {
    if (hasTask) {
      document.body.dataset.drawerOpen = 'true'
    } else {
      document.body.dataset.drawerOpen = 'false'
    }
    return () => {
      document.body.dataset.drawerOpen = 'false'
    }
  }, [hasTask])

  useEffect(() => {
    return () => {
      if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current)
      if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current)
    }
  }, [])

  const handleTitleChange = (val) => {
    setLocalTitle(val)
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current)
    titleTimeoutRef.current = setTimeout(() => {
      if (task) onUpdateTask(task.id, { title: val })
    }, 300)
  }

  const handleTitleBlur = () => {
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current)
    if (task && localTitle !== task.title) {
      onUpdateTask(task.id, { title: localTitle })
    }
  }

  const handleNotesChange = (val) => {
    setLocalNotes(val)
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current)
    notesTimeoutRef.current = setTimeout(() => {
      if (task) onUpdateTask(task.id, { notes: val })
    }, 300)
  }

  const handleNotesBlur = () => {
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current)
    if (task && localNotes !== task.notes) {
      onUpdateTask(task.id, { notes: localNotes })
    }
  }

  // Close panel on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!task) return null

  const deadlineConfig = getTaskDeadlineConfig(task)

  const handleFocus = () => {
    navigate('/timer', { state: { taskName: task.title } })
  }

  const handleSubtaskSubmit = (e) => {
    e.preventDefault()
    if (!newSubtaskTitle.trim()) return
    onAddSubtask(task.id, newSubtaskTitle.trim())
    setNewSubtaskTitle('')
  }

  const drawerVariants = {
    initial: isDesktopInline
      ? { opacity: 0 }
      : isMobile
      ? { y: '100%' }
      : { x: '100%' },
    animate: isDesktopInline
      ? { opacity: 1 }
      : isMobile
      ? { y: 0 }
      : { x: 0 },
    exit: isDesktopInline
      ? { opacity: 0 }
      : isMobile
      ? { y: '100%' }
      : { x: '100%' },
  }

  const content = (
    <motion.div
      initial={drawerVariants.initial}
      animate={drawerVariants.animate}
      exit={drawerVariants.exit}
      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
      role="dialog"
      aria-modal={!isDesktopInline}
      aria-label={`Task details for ${task.title}`}
      className={
        isDesktopInline
          ? 'w-full bg-[#11131a] border border-white/[0.08] rounded-2xl shadow-xl flex flex-col justify-between overflow-hidden max-h-[calc(100vh-6rem)]'
          : 'fixed z-[75] bg-[#11131a] shadow-2xl flex flex-col justify-between overflow-hidden inset-y-0 right-0 w-full sm:w-[420px] md:w-[480px] border-l border-white/[0.08] sm:rounded-l-[20px] max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:w-full max-md:max-h-[92vh] max-md:rounded-t-[24px] max-md:border-t max-md:border-l-0 max-md:pb-[calc(env(safe-area-inset-bottom)+16px)]'
      }
      style={{
        boxShadow: 'var(--elev-2)',
      }}
    >
      {/* Mobile Top Drag Handle Bar */}
      <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-2 md:hidden shrink-0" />

      {/* Drawer Header */}
      <div className="p-4 sm:p-5 border-b border-nocturn-border flex items-center justify-between gap-3 bg-nocturn-card">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => onToggleComplete(task.id)}
            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
              task.completed
                ? 'bg-nocturn-accent border-nocturn-accent text-black shadow-[0_0_10px_rgba(var(--color-nocturn-accent-rgb),0.5)]'
                : 'border-nocturn-muted/40 hover:border-nocturn-accent bg-nocturn-surface/50 text-transparent'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </button>
          <input
            type="text"
            value={localTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={handleTitleBlur}
            className="w-full bg-transparent text-white font-semibold text-base sm:text-lg border-b border-transparent focus:border-nocturn-accent outline-none"
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close task detail panel"
          className="p-1.5 rounded-lg text-nocturn-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Scrollable Content Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-5">
        {/* Action 1: Add / Remove from My Day */}
        <button
          type="button"
          onClick={() => {
            const nextInMyDay = !task.inMyDay
            onUpdateTask(task.id, { inMyDay: nextInMyDay })
          }}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            task.inMyDay
              ? 'bg-nocturn-accent/15 border-nocturn-accent/40 text-nocturn-accent-bright font-semibold'
              : 'bg-nocturn-surface border-nocturn-border text-nocturn-muted hover:text-white'
          }`}
        >
          <Sun className="w-4 h-4 stroke-[2]" />
          <span>{task.inMyDay ? 'Added to My Day' : 'Add to My Day'}</span>
        </button>

        {/* Action 2: Subtasks Checklist Section */}
        <div className="nocturn-card p-4 border border-nocturn-border space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <ListChecks className="w-4 h-4 text-nocturn-accent" />
            <span>Subtasks</span>
          </div>

          {/* Subtasks List */}
          <div className="space-y-2">
            {task.subtasks &&
              task.subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleSubtask(task.id, sub.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                        sub.completed
                          ? 'bg-nocturn-accent border-nocturn-accent text-black'
                          : 'border-nocturn-muted/40 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>
                    <span className={sub.completed ? 'line-through text-nocturn-dim' : 'text-white'}>
                      {sub.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteSubtask(task.id, sub.id)}
                    className="p-1 text-nocturn-muted hover:text-rose-400 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </div>

          {/* Add Subtask Input Form */}
          <form onSubmit={handleSubtaskSubmit} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Add subtask step..."
              className="w-full bg-nocturn-surface text-white text-xs px-2.5 py-1.5 rounded-lg border border-nocturn-border outline-none focus:border-nocturn-accent"
            />
            <button
              type="submit"
              disabled={!newSubtaskTitle.trim()}
              className="p-1.5 bg-nocturn-accent text-black rounded-lg disabled:opacity-40 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </form>
        </div>

        {/* Action 3: List & Properties Controls */}
        <div className="space-y-3">
          {/* List Assignment */}
          <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
            <span className="text-nocturn-muted font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-nocturn-accent" /> List
            </span>
            <select
              value={task.listId}
              onChange={(e) => onUpdateTask(task.id, { listId: e.target.value })}
              className="bg-nocturn-surface text-white text-xs px-3 py-1.5 rounded-xl border border-nocturn-border outline-none focus:border-nocturn-accent cursor-pointer"
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date Selector */}
          <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
            <span className="text-nocturn-muted font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-nocturn-accent" /> Due Date
            </span>
            <div className="flex items-center gap-2">
              {task.dueDate && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${deadlineConfig.badgeClass}`}>
                  {deadlineConfig.label}
                </span>
              )}
              <input
                type="date"
                value={task.dueDate || ''}
                onChange={(e) => {
                  const val = e.target.value || null
                  onUpdateTask(task.id, { dueDate: val })
                }}
                className="bg-nocturn-surface text-white text-xs px-2.5 py-1.5 rounded-xl border border-nocturn-border outline-none focus:border-nocturn-accent font-mono cursor-pointer"
              />
            </div>
          </div>

          {/* Reminder Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
              <span className="text-nocturn-muted font-medium flex items-center gap-2">
                <Bell className="w-4 h-4 text-nocturn-accent" /> Reminder
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={
                    !task.reminder
                      ? ''
                      : ['09:00', '14:00', '18:00'].includes(task.reminder)
                      ? task.reminder
                      : 'custom'
                  }
                  onChange={(e) => {
                    const val = e.target.value
                    if (!val) {
                      onUpdateTask(task.id, { reminder: null })
                    } else if (val === 'custom') {
                      requestNotificationPermission()
                      onUpdateTask(task.id, { reminder: '12:00' })
                    } else {
                      requestNotificationPermission()
                      onUpdateTask(task.id, { reminder: val })
                    }
                  }}
                  className="bg-nocturn-surface text-white text-xs px-3 py-1.5 rounded-xl border border-nocturn-border outline-none focus:border-nocturn-accent cursor-pointer"
                >
                  <option value="">No reminder</option>
                  <option value="09:00">Morning (09:00)</option>
                  <option value="14:00">Afternoon (14:00)</option>
                  <option value="18:00">Evening (18:00)</option>
                  <option value="custom">Custom Time...</option>
                </select>
                {task.reminder && (
                  <button
                    type="button"
                    onClick={() => onUpdateTask(task.id, { reminder: null })}
                    className="p-1 text-nocturn-muted hover:text-rose-400 cursor-pointer"
                    title="Clear reminder"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            {task.reminder && !['09:00', '14:00', '18:00'].includes(task.reminder) && (
              <div className="flex items-center justify-end gap-2">
                <span className="text-[11px] text-nocturn-muted">Custom time:</span>
                <input
                  type="time"
                  value={task.reminder}
                  onChange={(e) => {
                    const val = e.target.value || null
                    if (val) requestNotificationPermission()
                    onUpdateTask(task.id, { reminder: val })
                  }}
                  className="bg-nocturn-surface text-white text-xs px-2.5 py-1 rounded-lg border border-nocturn-border outline-none focus:border-nocturn-accent font-mono cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Recurrence Selector */}
          <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
            <span className="text-nocturn-muted font-medium flex items-center gap-2">
              <Repeat className="w-4 h-4 text-nocturn-accent" /> Repeat
            </span>
            <select
              value={task.recurrence || 'none'}
              onChange={(e) => onUpdateTask(task.id, { recurrence: e.target.value })}
              className="bg-nocturn-surface text-white text-xs px-3 py-1.5 rounded-xl border border-nocturn-border outline-none focus:border-nocturn-accent cursor-pointer"
            >
              <option value="none">Never</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Strict Deadline Selector (Distinct from Scheduled Due Date) */}
          <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
            <span className="text-nocturn-muted font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" /> Deadline
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={task.deadline || ''}
                onChange={(e) => {
                  const val = e.target.value || null
                  onUpdateTask(task.id, { deadline: val })
                }}
                className="bg-nocturn-surface text-white text-xs px-2.5 py-1.5 rounded-xl border border-nocturn-border outline-none focus:border-rose-400 font-mono cursor-pointer"
              />
              {task.deadline && (
                <button
                  type="button"
                  onClick={() => onUpdateTask(task.id, { deadline: null })}
                  className="p-1 text-nocturn-muted hover:text-rose-400 cursor-pointer"
                  title="Clear deadline"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Estimated Duration Selector */}
          <div className="space-y-1.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-nocturn-muted font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-nocturn-accent" /> Estimated Duration
              </span>
              <span className="font-mono text-white text-xs">
                {task.estimatedDuration ? `${task.estimatedDuration}m` : 'Not set'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[15, 25, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    const nextVal = task.estimatedDuration === mins ? null : mins
                    onUpdateTask(task.id, { estimatedDuration: nextVal })
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                    task.estimatedDuration === mins
                      ? 'bg-nocturn-accent text-black font-bold shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb),0.35)]'
                      : 'bg-nocturn-surface text-nocturn-muted border border-nocturn-border hover:text-white'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Labels / Tags Section */}
          <div className="space-y-2 text-xs sm:text-sm">
            <span className="text-nocturn-muted font-medium flex items-center gap-2">
              <Tag className="w-4 h-4 text-nocturn-accent" /> Labels & Tags
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {Array.isArray(task.labels) &&
                task.labels.map((lbl) => (
                  <span
                    key={lbl}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-nocturn-accent/15 text-nocturn-accent-bright border border-nocturn-accent/30"
                  >
                    #{lbl}
                    <button
                      type="button"
                      onClick={() => {
                        const updatedLabels = task.labels.filter((l) => l !== lbl)
                        onUpdateTask(task.id, { labels: updatedLabels })
                      }}
                      className="hover:text-white cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={newLabelInput}
                  onChange={(e) => setNewLabelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const cleaned = newLabelInput.trim().replace(/^#/, '').toLowerCase()
                      if (cleaned) {
                        const existing = Array.isArray(task.labels) ? task.labels : []
                        if (!existing.includes(cleaned)) {
                          onUpdateTask(task.id, { labels: [...existing, cleaned] })
                        }
                        setNewLabelInput('')
                      }
                    }
                  }}
                  placeholder="+ Add #tag..."
                  className="bg-nocturn-surface text-white text-xs px-2 py-1 rounded-lg border border-nocturn-border outline-none focus:border-nocturn-accent w-24"
                />
              </div>
            </div>
          </div>

          {/* Task Dependencies (Blocked By) */}
          {allTasks.length > 1 && (
            <div className="space-y-1.5 text-xs sm:text-sm">
              <span className="text-nocturn-muted font-medium flex items-center gap-2">
                <Link2 className="w-4 h-4 text-amber-400" /> Blocked By (Dependencies)
              </span>
              <select
                value=""
                onChange={(e) => {
                  const depId = e.target.value
                  if (depId) {
                    const existing = Array.isArray(task.dependencies) ? task.dependencies : []
                    if (!existing.includes(depId)) {
                      onUpdateTask(task.id, { dependencies: [...existing, depId] })
                    }
                  }
                }}
                className="w-full bg-nocturn-surface text-white text-xs px-2.5 py-1.5 rounded-xl border border-nocturn-border outline-none focus:border-nocturn-accent cursor-pointer"
              >
                <option value="">Select a blocking task...</option>
                {allTasks
                  .filter((t) => t.id !== task.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} {t.completed ? '(Completed)' : ''}
                    </option>
                  ))}
              </select>
              {Array.isArray(task.dependencies) && task.dependencies.length > 0 && (
                <div className="space-y-1 pt-1">
                  {task.dependencies.map((depId) => {
                    const depTask = allTasks.find((t) => t.id === depId)
                    return (
                      <div
                        key={depId}
                        className="flex items-center justify-between text-xs px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05]"
                      >
                        <span className={`truncate ${depTask?.completed ? 'line-through text-nocturn-muted' : 'text-amber-300 font-medium'}`}>
                          {depTask ? depTask.title : 'Dependency Task'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = task.dependencies.filter((id) => id !== depId)
                            onUpdateTask(task.id, { dependencies: updated })
                          }}
                          className="text-nocturn-muted hover:text-rose-400 cursor-pointer p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Priority Selector */}
          <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
            <span className="text-nocturn-muted font-medium flex items-center gap-2">
              <Flag className="w-4 h-4 text-nocturn-accent" /> Priority
            </span>
            <div className="flex items-center gap-1">
              {['low', 'medium', 'high'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onUpdateTask(task.id, { priority: p, starred: p === 'high' })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    task.priority === p
                      ? 'bg-nocturn-accent text-black shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb),0.4)]'
                      : 'bg-nocturn-surface text-nocturn-muted border border-nocturn-border hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Free-text Notes Area */}
        <div className="space-y-1.5">
          <label htmlFor="task-notes" className="text-xs font-semibold text-white block">
            Notes & Details
          </label>
          <textarea
            id="task-notes"
            rows={4}
            value={localNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add additional notes, research links, or checklist items..."
            className="w-full bg-nocturn-surface text-white text-xs p-3 rounded-xl border border-nocturn-border outline-none focus:border-nocturn-accent resize-none placeholder:text-nocturn-muted/50"
          />
        </div>
      </div>

      {/* Drawer Footer Actions */}
      <div className="flex-shrink-0 p-4 pb-12 sm:pb-5 border-t border-white/[0.08] bg-[#11131a]/95 backdrop-blur-xl flex items-center justify-between gap-2 relative z-10 pointer-events-auto">
        {/* Start Focus Timer Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={handleFocus}
          className="py-2.5 px-4 rounded-xl bg-nocturn-accent hover:bg-nocturn-accent-bright text-white text-xs font-semibold inline-flex items-center gap-2 shadow-[0_0_20px_rgba(var(--color-nocturn-accent-rgb),0.35)] cursor-pointer relative z-20 pointer-events-auto transition-colors"
        >
          <Timer className="w-4 h-4 fill-white stroke-white" />
          <span>Focus Task</span>
        </motion.button>

        <div className="flex items-center gap-2">
          {/* Duplicate Task Button */}
          {onDuplicateTask && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => onDuplicateTask(task.id)}
              aria-label="Duplicate task"
              className="py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-nocturn-muted hover:text-white border border-white/[0.08] transition-all font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer"
              title="Duplicate this task"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </motion.button>
          )}

          {/* Delete Task Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Delete task"
            className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/30 transition-all font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer relative z-20 pointer-events-auto"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
            <span>Delete Task</span>
          </motion.button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
          <div className="w-full max-w-sm bg-nocturn-card border border-rose-500/30 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Delete Task?</h3>
            </div>
            <p className="text-xs text-nocturn-muted leading-relaxed">
              Are you sure you want to delete <span className="text-white font-medium">"{task.title}"</span>? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-nocturn-muted hover:text-white bg-white/5 border border-nocturn-border transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  onDeleteTask(task.id)
                  onClose()
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-[0_0_12px_rgba(244,63,94,0.35)] cursor-pointer"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )

  if (isDesktopInline) {
    return content
  }

  return (
    <div className="fixed inset-0 z-[75] overflow-hidden pointer-events-none">
      {/* Translucent Backdrop with Blur for Mobile/Tablet overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-md pointer-events-auto"
      />
      <div className="pointer-events-auto">
        {content}
      </div>
    </div>
  )
})

export default TaskDetailDrawer

