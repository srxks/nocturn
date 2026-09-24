import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar as CalendarIcon, ExternalLink, Check, Plus } from 'lucide-react'
import { formatDateKey, openGoogleCalendarForDate, getEventsForDate } from '../../services/calendarService'
import { getTaskDeadlineConfig } from '../../utils/deadlineUtils'

export default function SelectedDayPanel({
  selectedDate,
  tasks,
  onToggleComplete,
  onAddTaskForDate,
  onSelectTask,
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus()
    }
  }, [isAdding])

  const handleCreateTask = (e) => {
    e?.preventDefault()
    const trimmed = newTitle.trim()
    if (!trimmed) return
    onAddTaskForDate(dateKey, trimmed)
    setNewTitle('')
    setIsAdding(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsAdding(false)
      setNewTitle('')
    }
  }

  const dateKey = formatDateKey(selectedDate)
  const dayEvents = getEventsForDate(dateKey, tasks)

  const dateLabel = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const isToday = formatDateKey(new Date()) === dateKey

  const handleOpenGCal = () => {
    openGoogleCalendarForDate(selectedDate)
  }

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/[0.06] space-y-5 shadow-sm">
      {/* Header with Date Label & GCal Bridge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-nocturn-border pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-bold text-white">
              {dateLabel}
            </h3>
            {isToday && (
              <span className="text-[10px] font-bold text-nocturn-accent bg-nocturn-accent/15 px-2 py-0.5 rounded-full border border-nocturn-accent/30">
                Today
              </span>
            )}
          </div>
          <p className="text-xs text-nocturn-muted">
            Selected Day Schedule & Tasks
          </p>
        </div>

        {/* Google Calendar Action Bridge */}
        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleOpenGCal}
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-nocturn-accent/40 text-xs font-semibold text-white inline-flex items-center gap-2 cursor-pointer shadow-sm transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-nocturn-accent stroke-[2.2]" />
            Open in Google Calendar
          </motion.button>
          <span className="text-[10px] text-nocturn-dim font-medium">
            Google Calendar sync coming soon
          </span>
        </div>
      </div>

      {/* Events / Tasks List for Selected Day */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-nocturn-muted">
            Tasks & Events ({dayEvents.length})
          </h4>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setIsAdding((prev) => !prev)}
            className="text-xs font-medium text-nocturn-accent hover:text-nocturn-accent-bright inline-flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            {isAdding ? 'Close' : 'Add for this date'}
          </motion.button>
        </div>

        {/* Inline Add Task Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.form
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onSubmit={handleCreateTask}
              className="p-3.5 rounded-xl bg-white/[0.03] backdrop-blur-md border border-nocturn-accent/40 shadow-sm space-y-3"
            >
              <input
                ref={inputRef}
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What needs to be done on this date?"
                className="w-full bg-transparent text-sm text-white placeholder-nocturn-muted focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false)
                    setNewTitle('')
                  }}
                  className="px-3 py-1 text-xs text-nocturn-muted hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-3.5 py-1 text-xs font-semibold text-nocturn-accent-bright bg-nocturn-accent/20 hover:bg-nocturn-accent/30 border border-nocturn-accent/40 rounded-lg transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Add Task
                </motion.button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {dayEvents.length > 0 ? (
          <div className="space-y-2">
            {dayEvents.map((evt) => {
              const taskObj = evt.taskObj || evt
              const deadlineConfig = getTaskDeadlineConfig(taskObj)

              return (
                <motion.div
                  key={evt.id}
                  whileHover={{ y: -1, scale: 1.005 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => onSelectTask && evt.taskObj && onSelectTask(evt.taskObj)}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] transition-colors duration-150 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleComplete(evt.taskId)
                      }}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                        evt.completed
                          ? 'bg-nocturn-accent border-nocturn-accent text-black'
                          : `border-nocturn-muted/40 ${deadlineConfig.checkboxHoverBorder} bg-nocturn-bg/50 text-transparent hover:border-nocturn-accent`
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                    <span className="text-sm text-white font-medium group-hover:text-nocturn-accent-bright transition-colors truncate">
                      {evt.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {evt?.startTime && (
                      <span className="text-[10px] font-mono text-nocturn-muted bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.08]">
                        {evt.startTime}
                      </span>
                    )}
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${deadlineConfig.badgeClass}`}>
                      {deadlineConfig.formattedLabel}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="p-6 text-center rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-2">
            <CalendarIcon className="w-6 h-6 text-nocturn-muted mx-auto stroke-[1.8]" />
            <p className="text-xs text-nocturn-muted">
              No tasks or events scheduled for this day yet.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
