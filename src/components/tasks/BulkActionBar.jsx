import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCheck,
  Calendar,
  Flag,
  Folder,
  Tag,
  Trash2,
  X,
  Check,
} from 'lucide-react'
import { useTasks } from '../../context/useTasks'
import { formatDateKey } from '../../services/calendarService'

export default function BulkActionBar({
  selectedTaskIds = [],
  onClearSelection,
  onSelectAll,
  totalTasksCount = 0,
}) {
  const {
    lists,
    bulkComplete,
    bulkReschedule,
    bulkChangePriority,
    bulkMove,
    bulkApplyLabels,
    deleteMultipleTasks,
  } = useTasks()

  const [activeMenu, setActiveMenu] = useState(null) // 'reschedule' | 'priority' | 'move' | 'label' | 'delete' | null
  const [customDate, setCustomDate] = useState('')
  const [labelInput, setLabelInput] = useState('')

  const hasSelection = Boolean(selectedTaskIds && selectedTaskIds.length > 0)
  if (typeof document !== 'undefined') {
    document.body.dataset.bulkActive = hasSelection ? 'true' : 'false'
  }

  if (!selectedTaskIds || selectedTaskIds.length === 0) return null

  const count = selectedTaskIds.length
  const todayKey = formatDateKey(new Date())
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowKey = formatDateKey(tomorrowDate)

  const handleComplete = async () => {
    await bulkComplete(selectedTaskIds, true)
    onClearSelection()
  }

  const handleReschedule = async (date) => {
    await bulkReschedule(selectedTaskIds, date)
    setActiveMenu(null)
    onClearSelection()
  }

  const handlePriority = async (p) => {
    await bulkChangePriority(selectedTaskIds, p)
    setActiveMenu(null)
    onClearSelection()
  }

  const handleMove = async (listId) => {
    await bulkMove(selectedTaskIds, listId)
    setActiveMenu(null)
    onClearSelection()
  }

  const handleApplyLabel = async (e) => {
    e.preventDefault()
    const cleaned = labelInput.trim().replace(/^#/, '').toLowerCase()
    if (cleaned) {
      await bulkApplyLabels(selectedTaskIds, [cleaned])
      setLabelInput('')
      setActiveMenu(null)
      onClearSelection()
    }
  }

  const handleDelete = async () => {
    await deleteMultipleTasks(selectedTaskIds)
    setActiveMenu(null)
    onClearSelection()
  }

  return (
    <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom,0px)+12px)] lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-2xl select-none">
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.8 }}
        className="bg-[#12141c]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-2.5 sm:p-3 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex items-center justify-between gap-2"
      >
        {/* Left Count & Selection Control */}
        <div className="flex items-center gap-2 pl-2">
          <span className="relative inline-flex items-center overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={count}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="text-xs font-bold font-mono bg-nocturn-accent/15 text-nocturn-accent-bright px-2 py-0.5 rounded-lg border border-nocturn-accent/30 tabular-nums"
              >
                {count}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="text-xs font-semibold text-white hidden sm:inline">
            selected
          </span>
          {totalTasksCount > count && (
            <button
              type="button"
              onClick={onSelectAll}
              className="text-[11px] text-nocturn-accent hover:underline cursor-pointer ml-1 hidden sm:inline"
            >
              Select all ({totalTasksCount})
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 relative">
          {/* Complete All */}
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleComplete}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-nocturn-accent text-black font-semibold text-xs flex items-center gap-1.5 hover:bg-nocturn-accent-bright shadow-[0_0_10px_rgba(var(--color-nocturn-accent-rgb),0.3)] cursor-pointer"
            title="Complete all selected tasks"
          >
            <CheckCheck className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Complete</span>
          </motion.button>

          {/* Reschedule */}
          <div className="relative">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'reschedule' ? null : 'reschedule')}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-nocturn-muted hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reschedule tasks"
            >
              <Calendar className="w-4 h-4 text-nocturn-accent" />
              <span className="hidden md:inline">Schedule</span>
            </motion.button>

            {activeMenu === 'reschedule' && (
              <div className="absolute bottom-full mb-2 left-0 w-48 bg-nocturn-card border border-nocturn-border rounded-xl shadow-2xl p-2 space-y-1 z-50">
                <button
                  type="button"
                  onClick={() => handleReschedule(todayKey)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-white hover:bg-white/10 cursor-pointer"
                >
                  Due Today
                </button>
                <button
                  type="button"
                  onClick={() => handleReschedule(tomorrowKey)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-white hover:bg-white/10 cursor-pointer"
                >
                  Due Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleReschedule(null)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-nocturn-muted hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  Remove Due Date
                </button>
                <div className="pt-1 border-t border-white/10">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      if (e.target.value) handleReschedule(e.target.value)
                    }}
                    className="w-full bg-nocturn-surface text-white text-xs p-1.5 rounded-lg border border-nocturn-border outline-none font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="relative">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'priority' ? null : 'priority')}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-nocturn-muted hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Set Priority"
            >
              <Flag className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Priority</span>
            </motion.button>

            {activeMenu === 'priority' && (
              <div className="absolute bottom-full mb-2 left-0 w-36 bg-nocturn-card border border-nocturn-border rounded-xl shadow-2xl p-1.5 space-y-1 z-50">
                <button
                  type="button"
                  onClick={() => handlePriority('high')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-300 font-semibold hover:bg-rose-500/10 cursor-pointer"
                >
                  High Priority
                </button>
                <button
                  type="button"
                  onClick={() => handlePriority('medium')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-amber-300 font-semibold hover:bg-amber-500/10 cursor-pointer"
                >
                  Medium Priority
                </button>
                <button
                  type="button"
                  onClick={() => handlePriority('low')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-sky-300 font-semibold hover:bg-sky-500/10 cursor-pointer"
                >
                  Low Priority
                </button>
              </div>
            )}
          </div>

          {/* Move to List */}
          <div className="relative">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'move' ? null : 'move')}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-nocturn-muted hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Move to list"
            >
              <Folder className="w-4 h-4 text-sky-400" />
              <span className="hidden md:inline">Move</span>
            </motion.button>

            {activeMenu === 'move' && (
              <div className="absolute bottom-full mb-2 left-0 w-44 bg-nocturn-card border border-nocturn-border rounded-xl shadow-2xl p-1.5 space-y-1 z-50 max-h-48 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => handleMove('tasks')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-white hover:bg-white/10 cursor-pointer"
                >
                  General Tasks
                </button>
                {lists.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleMove(l.id)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-white hover:bg-white/10 truncate cursor-pointer"
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Apply Label */}
          <div className="relative">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'label' ? null : 'label')}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-nocturn-muted hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Apply Label / Tag"
            >
              <Tag className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Tag</span>
            </motion.button>

            {activeMenu === 'label' && (
              <form
                onSubmit={handleApplyLabel}
                className="absolute bottom-full mb-2 left-0 w-48 bg-nocturn-card border border-nocturn-border rounded-xl shadow-2xl p-2 space-y-2 z-50"
              >
                <input
                  type="text"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="Enter tag (e.g. college)"
                  className="w-full bg-nocturn-surface text-white text-xs px-2.5 py-1.5 rounded-lg border border-nocturn-border outline-none focus:border-nocturn-accent"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!labelInput.trim()}
                  className="w-full py-1 rounded-lg bg-nocturn-accent text-black font-semibold text-xs disabled:opacity-40 cursor-pointer"
                >
                  Apply Tag
                </button>
              </form>
            )}
          </div>

          {/* Delete Selected */}
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleDelete}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Delete selected tasks"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden md:inline">Delete</span>
          </motion.button>
        </div>

        {/* Clear Selection X */}
        <button
          type="button"
          onClick={onClearSelection}
          className="p-1.5 text-nocturn-muted hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          title="Cancel selection"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  )
}
