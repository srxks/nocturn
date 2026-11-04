import { useEffect, useState, useRef, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  ChevronDown,
  ChevronUp,
  MoreVertical,
} from 'lucide-react'
import { getTaskDeadlineConfig } from '../../utils/deadlineUtils'
import { requestNotificationPermission } from '../../services/notificationService'
import DatePickerPopover from '../ui/DatePickerPopover'

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
  onUpdateSubtask,
  onReorderSubtasks,
  onToggleSubtask,
  onDeleteSubtask,
  isDesktopInline = false,
}) {
  const navigate = useNavigate()
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [editingSubtaskId, setEditingSubtaskId] = useState(null)
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('')
  const [newLabelInput, setNewLabelInput] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [showOverflowMenu, setShowOverflowMenu] = useState(false)
  const [prevTaskId, setPrevTaskId] = useState(task?.id)
  const [localTitle, setLocalTitle] = useState(task?.title || '')
  const [localNotes, setLocalNotes] = useState(task?.notes || '')
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false
  })

  const titleTimeoutRef = useRef(null)
  const notesTimeoutRef = useRef(null)
  const subtaskInputRef = useRef(null)
  const overflowMenuRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close overflow menu on outside click
  useEffect(() => {
    if (!showOverflowMenu) return
    const handleClickOutside = (e) => {
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(e.target)) {
        setShowOverflowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showOverflowMenu])

  // Synchronize local title and notes when selected task changes
  if (task && task.id !== prevTaskId) {
    setPrevTaskId(task.id)
    setLocalTitle(task.title || '')
    setLocalNotes(task.notes || '')
    setShowMoreOptions(Boolean(task.deadline || task.reminder || task.recurrence !== 'none' || task.estimatedDuration || (task.labels && task.labels.length > 0) || (task.dependencies && task.dependencies.length > 0)))
  }

  const hasTask = Boolean(task)
  useEffect(() => {
    if (hasTask) {
      document.body.dataset.drawerOpen = 'true'
      if (!isDesktopInline && isMobile) {
        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
          document.body.dataset.drawerOpen = 'false'
          document.body.style.overflow = originalOverflow
        }
      }
    } else {
      document.body.dataset.drawerOpen = 'false'
    }
    return () => {
      document.body.dataset.drawerOpen = 'false'
    }
  }, [hasTask, isDesktopInline, isMobile])

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
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false)
        } else if (showOverflowMenu) {
          setShowOverflowMenu(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, showDeleteConfirm, showOverflowMenu])

  if (!task) return null

  const deadlineConfig = getTaskDeadlineConfig(task)

  const handleFocus = () => {
    navigate('/timer', { state: { taskName: task.title, taskId: task.id } })
  }

  const commitSubtask = () => {
    const trimmed = newSubtaskTitle.trim()
    if (!trimmed) return
    onAddSubtask(task.id, trimmed)
    setNewSubtaskTitle('')
  }

  const handleSubtaskSubmit = (e) => {
    e.preventDefault()
    commitSubtask()
    subtaskInputRef.current?.focus()
  }

  const handleSubtaskKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commitSubtask()
      subtaskInputRef.current?.focus()
    }
  }

  const startEditingSubtask = (sub) => {
    setEditingSubtaskId(sub.id)
    setEditingSubtaskTitle(sub.title || '')
  }

  const saveEditingSubtask = () => {
    if (!editingSubtaskId) return
    const trimmed = editingSubtaskTitle.trim()
    if (trimmed && onUpdateSubtask) {
      onUpdateSubtask(task.id, editingSubtaskId, { title: trimmed })
    }
    setEditingSubtaskId(null)
    setEditingSubtaskTitle('')
  }

  const cancelEditingSubtask = () => {
    setEditingSubtaskId(null)
    setEditingSubtaskTitle('')
  }

  const handleMoveSubtask = (subIndex, direction) => {
    if (!task.subtasks || !onReorderSubtasks) return
    const targetIndex = direction === 'up' ? subIndex - 1 : subIndex + 1
    if (targetIndex < 0 || targetIndex >= task.subtasks.length) return
    const updated = [...task.subtasks]
    const [moved] = updated.splice(subIndex, 1)
    updated.splice(targetIndex, 0, moved)
    onReorderSubtasks(task.id, updated)
  }

  // Count active "more options" to show badges on collapsed header
  const activeMoreCount = [
    task.reminder,
    task.recurrence && task.recurrence !== 'none',
    task.deadline,
    task.estimatedDuration,
    task.labels && task.labels.length > 0,
    task.dependencies && task.dependencies.length > 0,
  ].filter(Boolean).length

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
          ? 'w-full bg-[#0d0f14] border border-white/[0.08] rounded-2xl shadow-xl flex flex-col justify-between overflow-hidden max-h-[calc(100vh-6rem)]'
          : 'fixed z-[75] bg-[#0d0f14] shadow-2xl flex flex-col justify-between overflow-hidden inset-y-0 right-0 w-full md:w-[440px] md:border-l md:border-white/[0.08] md:rounded-l-2xl max-md:inset-0 max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:rounded-none max-md:border-0'
      }
      style={{
        boxShadow: 'var(--elev-2)',
      }}
    >
      {/* Mobile Top Drag Handle Bar */}
      <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-2 md:hidden shrink-0" />

      {/* Drawer Header: Checkbox + Title + My Day Pill + Close */}
      <div className="p-3.5 sm:p-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] md:pt-4 border-b border-white/[0.08] bg-neutral-900/60 backdrop-blur-md flex items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => onToggleComplete(task.id)}
            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              task.completed
                ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                : 'border-white/20 hover:border-emerald-400 bg-white/5 text-transparent'
            }`}
            title={task.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </button>
          <input
            type="text"
            value={localTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Task title..."
            className="w-full bg-transparent text-white font-semibold text-base sm:text-lg border-b border-transparent focus:border-emerald-500/50 outline-none truncate"
          />
        </div>

        {/* Header Actions: My Day Toggle Pill + Close Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onUpdateTask(task.id, { inMyDay: !task.inMyDay })}
            className={`px-2.5 py-1 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer border ${
              task.inMyDay
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:border-white/20'
            }`}
            title={task.inMyDay ? 'Remove from My Day' : 'Add to My Day'}
          >
            <Sun className={`w-3.5 h-3.5 ${task.inMyDay ? 'text-amber-400 fill-amber-400/30' : 'text-neutral-400'}`} />
            <span className="hidden sm:inline">{task.inMyDay ? 'In My Day' : 'My Day'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close task detail panel"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drawer Scrollable Content Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Section 1: Primary Properties (Due Date, List, Priority) */}
        <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.08] space-y-3">
          {/* Due Date Row with Popover */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-neutral-400 font-medium flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Due Date
            </span>
            <div className="flex items-center gap-1.5">
              <DatePickerPopover
                value={task.dueDate || ''}
                onChange={(val) => onUpdateTask(task.id, { dueDate: val || null })}
                onClear={() => onUpdateTask(task.id, { dueDate: null })}
                placeholder="Set due date"
                variant="due"
                align="right"
              />
            </div>
          </div>

          {/* List Selector Row */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-neutral-400 font-medium flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-emerald-400" /> List
            </span>
            <select
              value={task.listId}
              onChange={(e) => onUpdateTask(task.id, { listId: e.target.value })}
              className="bg-neutral-900 text-white text-xs px-2.5 py-1.5 rounded-xl border border-white/10 outline-none focus:border-emerald-500 cursor-pointer"
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Selector Row */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-neutral-400 font-medium flex items-center gap-2">
              <Flag className="w-3.5 h-3.5 text-emerald-400" /> Priority
            </span>
            <div className="flex items-center gap-1">
              {['low', 'medium', 'high'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onUpdateTask(task.id, { priority: p, starred: p === 'high' })}
                  className={`px-2 py-0.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                    task.priority === p
                      ? 'bg-emerald-500 text-black font-semibold shadow-[0_0_8px_rgba(16,185,129,0.35)]'
                      : 'bg-white/5 text-neutral-400 border border-white/5 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Subtasks Checklist */}
        <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.08] space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-white">
            <span className="flex items-center gap-2">
              <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
              Subtasks
            </span>
            {task.subtasks && task.subtasks.length > 0 && (
              <span className="text-[11px] text-neutral-400 font-normal">
                {task.subtasks.filter((s) => s.completed).length} / {task.subtasks.length}
              </span>
            )}
          </div>

          {/* Subtasks List */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="space-y-1.5">
              {task.subtasks.map((sub, idx) => (
                <div key={sub.id} className="flex items-center justify-between gap-1.5 text-xs group py-0.5 rounded-lg hover:bg-white/[0.02] px-1 -mx-1 transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleSubtask(task.id, sub.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        sub.completed
                          ? 'bg-emerald-500 border-emerald-500 text-black'
                          : 'border-white/20 text-transparent hover:border-emerald-400'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>
                    {editingSubtaskId === sub.id ? (
                      <input
                        type="text"
                        value={editingSubtaskTitle}
                        onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            saveEditingSubtask()
                          } else if (e.key === 'Escape') {
                            e.preventDefault()
                            cancelEditingSubtask()
                          }
                        }}
                        onBlur={saveEditingSubtask}
                        autoFocus
                        className="flex-1 bg-neutral-900 text-white text-xs px-2 py-0.5 rounded-md border border-emerald-500 outline-none"
                      />
                    ) : (
                      <span
                        onClick={() => startEditingSubtask(sub)}
                        title="Click to edit step"
                        className={`truncate cursor-text hover:text-white transition-colors flex-1 ${sub.completed ? 'line-through text-neutral-500' : 'text-neutral-200'}`}
                      >
                        {sub.title}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    {onReorderSubtasks && task.subtasks.length > 1 && (
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handleMoveSubtask(idx, 'up')}
                          disabled={idx === 0}
                          title="Move step up"
                          className="p-1 text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSubtask(idx, 'down')}
                          disabled={idx === task.subtasks.length - 1}
                          title="Move step down"
                          className="p-1 text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteSubtask(task.id, sub.id)}
                      title="Delete step"
                      className="p-1 text-neutral-500 hover:text-rose-400 cursor-pointer transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Subtask Input Form */}
          <form onSubmit={handleSubtaskSubmit} className="flex items-center gap-2 pt-1">
            <input
              ref={subtaskInputRef}
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={handleSubtaskKeyDown}
              placeholder="Add step (Press Enter)..."
              className="w-full bg-neutral-900 text-white text-xs px-2.5 py-1.5 rounded-xl border border-white/10 outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!newSubtaskTitle.trim()}
              className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl disabled:opacity-30 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </form>
        </div>

        {/* Section 3: Notes & Details */}
        <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.08] space-y-1.5">
          <label htmlFor="task-notes" className="text-xs font-semibold text-neutral-300 block">
            Notes & Details
          </label>
          <textarea
            id="task-notes"
            rows={3}
            value={localNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add context, research links, or checklist notes..."
            className="w-full bg-transparent text-white text-xs p-2 rounded-xl border border-white/10 outline-none focus:border-emerald-500/50 resize-y placeholder:text-neutral-600 transition-all"
          />
        </div>

        {/* Section 4: Collapsible "More Options" Section */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.015] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>More Options</span>
              {activeMoreCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  {activeMoreCount} active
                </span>
              )}
            </div>
            {showMoreOptions ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          <AnimatePresence>
            {showMoreOptions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-3.5 pt-0 space-y-3.5 border-t border-white/[0.06]"
              >
                {/* 1. Hard Deadline (Strict cutoff) */}
                <div className="flex items-center justify-between gap-2 text-xs pt-3">
                  <div>
                    <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Hard Deadline
                    </span>
                    <p className={`text-[10px] ${deadlineConfig?.isUrgent ? 'text-rose-400 font-semibold' : 'text-neutral-500'}`}>
                      {task.deadline && deadlineConfig?.label ? deadlineConfig.label : 'Strict cutoff date'}
                    </p>
                  </div>
                  <DatePickerPopover
                    value={task.deadline || ''}
                    onChange={(val) => onUpdateTask(task.id, { deadline: val || null })}
                    onClear={() => onUpdateTask(task.id, { deadline: null })}
                    placeholder="Set hard cutoff"
                    variant="deadline"
                    align="right"
                  />
                </div>

                {/* 2. Reminder Selector */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-emerald-400" /> Reminder
                  </span>
                  <div className="flex items-center gap-1.5">
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
                      className="bg-neutral-900 text-white text-xs px-2.5 py-1.5 rounded-xl border border-white/10 outline-none focus:border-emerald-500 cursor-pointer"
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
                        className="p-1 text-neutral-400 hover:text-rose-400 cursor-pointer"
                        title="Clear reminder"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Recurrence Selector */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-emerald-400" /> Repeat
                  </span>
                  <select
                    value={task.recurrence || 'none'}
                    onChange={(e) => onUpdateTask(task.id, { recurrence: e.target.value })}
                    className="bg-neutral-900 text-white text-xs px-2.5 py-1.5 rounded-xl border border-white/10 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="none">Never</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {/* 4. Estimated Duration */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" /> Duration
                    </span>
                    <span className="font-mono text-neutral-400 text-xs">
                      {task.estimatedDuration ? `${task.estimatedDuration}m` : 'None'}
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
                        className={`px-2 py-0.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                          task.estimatedDuration === mins
                            ? 'bg-emerald-500 text-black font-semibold'
                            : 'bg-white/5 text-neutral-400 border border-white/5 hover:text-white'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Labels & Tags */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" /> Labels & Tags
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {Array.isArray(task.labels) &&
                      task.labels.map((lbl) => (
                        <span
                          key={lbl}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
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
                        placeholder="+ tag..."
                        className="bg-neutral-900 text-white text-xs px-2 py-1 rounded-lg border border-white/10 outline-none focus:border-emerald-500 w-20"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. Dependencies (Blocked By) */}
                {allTasks.length > 1 && (
                  <div className="space-y-1.5 text-xs">
                    <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-amber-400" /> Dependencies
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
                      className="w-full bg-neutral-900 text-white text-xs px-2.5 py-1.5 rounded-xl border border-white/10 outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">Select blocking task...</option>
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
                              className="flex items-center justify-between text-xs px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/[0.05]"
                            >
                              <span className={`truncate ${depTask?.completed ? 'line-through text-neutral-500' : 'text-amber-300'}`}>
                                {depTask ? depTask.title : 'Dependency'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = task.dependencies.filter((id) => id !== depId)
                                  onUpdateTask(task.id, { dependencies: updated })
                                }}
                                className="text-neutral-400 hover:text-rose-400 cursor-pointer p-0.5"
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Drawer Footer Actions: Focus Primary + Overflow Menu for Duplicate/Delete */}
      <div className="flex-shrink-0 p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-4 border-t border-white/[0.08] bg-neutral-900/80 backdrop-blur-md flex items-center justify-between gap-2 relative z-10">
        {/* Start Focus Timer Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleFocus}
          className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold inline-flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer transition-colors"
        >
          <Timer className="w-4 h-4 fill-black stroke-black" />
          <span>Focus Task</span>
        </motion.button>

        {/* Overflow Menu Button (...) */}
        <div className="relative" ref={overflowMenuRef}>
          <button
            type="button"
            onClick={() => setShowOverflowMenu(!showOverflowMenu)}
            aria-label="More task actions"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showOverflowMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 bottom-full mb-2 w-44 rounded-xl bg-neutral-950/95 backdrop-blur-xl border border-white/10 p-1 shadow-2xl z-30"
              >
                {onDuplicateTask && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowOverflowMenu(false)
                      onDuplicateTask(task.id)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-left"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate Task</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowOverflowMenu(false)
                    setShowDeleteConfirm(true)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Task</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
          <div className="w-full max-w-sm bg-neutral-900 border border-rose-500/30 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Delete Task?</h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Are you sure you want to delete <span className="text-white font-medium">"{task.title}"</span>? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-white/5 border border-white/10 transition-colors cursor-pointer"
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
      {/* Translucent Backdrop with Blur */}
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
