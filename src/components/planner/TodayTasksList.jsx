import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Clock, Play, AlertCircle, Sun, Subtitles, Calendar } from 'lucide-react'
import { getEstimatedDuration } from '../../utils/planner'
import { getTaskDeadlineConfig } from '../../utils/deadlineUtils'

export default function TodayTasksList({ tasks, onToggleTask }) {
  const navigate = useNavigate()

  const handleFocusTask = (task) => {
    navigate('/timer', { state: { taskName: task.title } })
  }

  if (!tasks || tasks.length === 0) return null

  return (
    <div className="nocturn-card p-5 sm:p-6 space-y-4 border border-nocturn-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-nocturn-accent" />
          <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide">
            Today's Pending Tasks
          </h2>
        </div>
        <span className="text-xs text-nocturn-muted font-medium bg-nocturn-surface px-2.5 py-1 rounded-full border border-nocturn-border">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {tasks.map((task) => {
            const estimatedMins = getEstimatedDuration(task)
            const subtaskCount = task.subtasks ? task.subtasks.length : 0
            const deadlineConfig = getTaskDeadlineConfig(task)

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-nocturn-surface/50 border border-nocturn-border/80 hover:border-nocturn-accent/30 transition-all duration-200"
              >
                {/* Deadline Left Color Bar Accent */}
                {deadlineConfig.status !== 'none' && (
                  <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${deadlineConfig.indicatorBg}`} />
                )}

                <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
                  {/* Task Completion Checkbox */}
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    aria-label={`Mark ${task.title} as completed`}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                      task.completed
                        ? 'bg-nocturn-accent border-nocturn-accent text-black'
                        : `border-nocturn-muted/60 ${deadlineConfig.checkboxHoverBorder}`
                    }`}
                  >
                    {task.completed && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                  </button>

                  {/* Task Title & Details */}
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-white truncate block">
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-nocturn-muted flex-wrap">
                      {/* Deadline Status Badge */}
                      {task.dueDate && (
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${deadlineConfig.badgeClass}`}>
                          <Calendar className="w-2.5 h-2.5 stroke-[2]" />
                          {deadlineConfig.formattedLabel}
                        </span>
                      )}

                      {/* Priority Badge */}
                      {task.priority && task.priority !== 'medium' && (
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            task.priority === 'high'
                              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                              : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          <AlertCircle className="w-2.5 h-2.5" />
                          {task.priority}
                        </span>
                      )}

                      {/* Estimated Duration */}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-nocturn-accent" />
                        <span>{estimatedMins} min</span>
                      </span>

                      {/* Subtasks Count if present */}
                      {subtaskCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-nocturn-dim">
                          <Subtitles className="w-3 h-3" />
                          <span>{subtaskCount} subtasks</span>
                        </span>
                      )}

                      {/* Due Time/Reminder if present */}
                      {task.reminder && (
                        <span className="text-nocturn-accent font-medium">
                          at {task.reminder}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Focus CTA */}
                <button
                  type="button"
                  onClick={() => handleFocusTask(task)}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-nocturn-surface hover:bg-nocturn-accent/15 text-nocturn-muted hover:text-nocturn-accent border border-nocturn-border hover:border-nocturn-accent/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Focus</span>
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
