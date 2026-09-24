import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreVertical, CheckCheck, Trash2, AlertCircle, CheckSquare } from 'lucide-react'
import { useTasks } from '../../context/useTasks'

export default function BulkTaskMenu({
  activeListId,
  completedCount,
  totalCount,
  isSelectMode = false,
  onToggleSelectMode = null,
}) {
  const { clearCompleted, clearList } = useTasks()
  const [isOpen, setIsOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState(null) // 'clear-completed' | 'clear-list' | null

  const isMyDay = activeListId === 'my-day'

  const handleExecuteClearCompleted = async () => {
    await clearCompleted(activeListId)
    setConfirmModal(null)
    setIsOpen(false)
  }

  const handleExecuteClearList = async () => {
    await clearList(activeListId)
    setConfirmModal(null)
    setIsOpen(false)
  }

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="List options & bulk action menu"
        className="p-2 rounded-xl text-nocturn-muted hover:text-white hover:bg-nocturn-surface border border-transparent hover:border-nocturn-border transition-all cursor-pointer"
      >
        <MoreVertical className="w-4 h-4 stroke-[2]" />
      </button>

      {/* Action Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop click dismiss */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 z-50 mt-1 w-52 rounded-2xl bg-nocturn-card border border-nocturn-border shadow-2xl p-1.5 space-y-1"
            >
              {/* Select Tasks Toggle */}
              {onToggleSelectMode && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleSelectMode()
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-nocturn-muted hover:text-white hover:bg-nocturn-surface transition-colors text-left cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4 text-nocturn-accent shrink-0" />
                  <span>{isSelectMode ? 'Exit select mode' : 'Select tasks'}</span>
                </button>
              )}

              {/* Clear Completed Option */}
              <button
                type="button"
                disabled={completedCount === 0}
                onClick={() => setConfirmModal('clear-completed')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-nocturn-muted hover:text-white hover:bg-nocturn-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left cursor-pointer"
              >
                <CheckCheck className="w-4 h-4 text-nocturn-accent shrink-0" />
                <span>Clear completed ({completedCount})</span>
              </button>

              {/* Clear List Option */}
              <button
                type="button"
                disabled={totalCount === 0}
                onClick={() => setConfirmModal('clear-list')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
                <span>{isMyDay ? 'Clear My Day view' : 'Clear entire list'}</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Clear Completed */}
      {confirmModal === 'clear-completed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm p-5 rounded-2xl bg-nocturn-card border border-nocturn-border space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-nocturn-accent">
              <CheckCheck className="w-6 h-6 stroke-[2]" />
              <h3 className="text-base font-bold text-white">Clear Completed Tasks?</h3>
            </div>
            <p className="text-xs text-nocturn-muted leading-relaxed">
              This will permanently delete all {completedCount} completed tasks in this view from the database.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-1.5 rounded-xl bg-nocturn-surface text-nocturn-muted text-xs font-semibold border border-nocturn-border cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteClearCompleted}
                className="px-3.5 py-1.5 rounded-xl bg-nocturn-accent text-black text-xs font-semibold cursor-pointer hover:bg-nocturn-accent-bright"
              >
                Clear Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clear List */}
      {confirmModal === 'clear-list' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm p-5 rounded-2xl bg-nocturn-card border border-nocturn-border space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6 stroke-[2]" />
              <h3 className="text-base font-bold text-white">
                {isMyDay ? 'Clear My Day View?' : 'Clear Entire List?'}
              </h3>
            </div>
            <p className="text-xs text-nocturn-muted leading-relaxed">
              {isMyDay
                ? 'This will remove the My Day focus assignment from all tasks for today. Underlying task records will be preserved.'
                : `This will permanently delete all ${totalCount} tasks in this list from the database.`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-1.5 rounded-xl bg-nocturn-surface text-nocturn-muted text-xs font-semibold border border-nocturn-border cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteClearList}
                className="px-3.5 py-1.5 rounded-xl bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/40 hover:bg-red-500/30 cursor-pointer"
              >
                {isMyDay ? 'Remove My Day Tasks' : 'Delete All Tasks'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
