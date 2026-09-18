import { useEffect, useState, useRef } from 'react'
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
} from 'lucide-react'
import { getTaskDeadlineConfig } from '../../utils/deadlineUtils'
import { requestNotificationPermission } from '../../services/notificationService'

export default function TaskDetailDrawer({
  task,
  lists = [],
  onClose,
  onUpdateTask,
  onToggleComplete,
  onDeleteTask,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  isDesktopInline = false,
}) {
  const navigate = useNavigate()
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [prevTaskId, setPrevTaskId] = useState(task?.id)
  const [localTitle, setLocalTitle] = useState(task?.title || '')
  const [localNotes, setLocalNotes] = useState(task?.notes || '')
  const titleTimeoutRef = useRef(null)
  const notesTimeoutRef = useRef(null)

  // Synchronize local title and notes when selected task changes
  if (task && task.id !== prevTaskId) {
    setPrevTaskId(task.id)
    setLocalTitle(task.title || '')
    setLocalNotes(task.notes || '')
  }

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

  const content = (
    <motion.div
      initial={{ opacity: 0, x: isDesktopInline ? 12 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isDesktopInline ? 12 : 24 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      role="dialog"
      aria-modal={!isDesktopInline}
      aria-label={`Task details for ${task.title}`}
      className={
        isDesktopInline
          ? 'w-full bg-nocturn-card border border-nocturn-border rounded-2xl shadow-xl flex flex-col justify-between overflow-hidden max-h-[calc(100vh-6rem)]'
          : 'fixed inset-y-0 right-0 z-[75] w-full sm:w-[420px] bg-nocturn-card border-l border-nocturn-border shadow-2xl flex flex-col justify-between overflow-hidden'
      }
    >
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
            Notes
          </label>
          <textarea
            id="task-notes"
            rows={4}
            value={localNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add additional notes or detail..."
            className="w-full bg-nocturn-surface text-white text-xs p-3 rounded-xl border border-nocturn-border outline-none focus:border-nocturn-accent resize-none placeholder:text-nocturn-muted/50"
          />
        </div>
      </div>

      {/* Drawer Footer Actions */}
      <div className="flex-shrink-0 p-4 pb-8 sm:pb-4 border-t border-nocturn-border bg-nocturn-card flex items-center justify-between gap-3 relative z-10 pointer-events-auto">
        {/* Start Focus Timer Button */}
        <button
          type="button"
          onClick={handleFocus}
          className="nocturn-btn-primary py-2.5 px-4 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shadow-[0_0_15px_rgba(var(--color-nocturn-accent-rgb),0.35)] cursor-pointer relative z-20 pointer-events-auto"
        >
          <Timer className="w-4 h-4 fill-black stroke-black" />
          Focus Task
        </button>

        {/* Delete Task Button */}
        <button
          type="button"
          onClick={() => {
            onDeleteTask(task.id)
            onClose()
          }}
          aria-label="Delete task"
          className="py-2.5 px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/30 transition-all font-semibold text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer relative z-20 pointer-events-auto"
        >
          <Trash2 className="w-4 h-4 stroke-[2]" />
          <span>Delete Task</span>
        </button>
      </div>
    </motion.div>
  )

  if (isDesktopInline) {
    return content
  }

  return (
    <>
      {/* Translucent Backdrop with Blur for Mobile/Tablet overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-md"
      />
      {content}
    </>
  )
}

