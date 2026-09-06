import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Sparkles } from 'lucide-react'
import ScheduleBlock from './ScheduleBlock'

export default function ScheduleTimeline({
  schedule,
  onToggleTask,
  onUpdateBlock,
  onRemoveBlock,
  onMoveBlock,
}) {
  if (!schedule || schedule.length === 0) return null

  const totalFocusBlocks = schedule.filter((b) => b.type === 'focus').length
  const totalMinutes = schedule.reduce((sum, b) => sum + (b.duration || 0), 0)
  const totalHours = (totalMinutes / 60).toFixed(1)

  return (
    <div className="space-y-4">
      {/* Timeline Summary Bar */}
      <div className="nocturn-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-nocturn-border/90 bg-nocturn-card">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent shrink-0">
            <Sparkles className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
              Planned Timeline
            </h2>
            <p className="text-xs text-nocturn-muted">
              {totalFocusBlocks} focus blocks • {totalMinutes} min ({totalHours} hrs) scheduled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-nocturn-accent font-semibold bg-nocturn-surface px-3 py-1.5 rounded-xl border border-nocturn-border">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {schedule[0]?.startTime || '09:00'} – {schedule[schedule.length - 1]?.startTime || '17:00'}
          </span>
        </div>
      </div>

      {/* Vertical Timeline List */}
      <div className="relative space-y-3">
        <AnimatePresence initial={false}>
          {schedule.filter(Boolean).map((block, index) => (
            <motion.div
              key={block.id || index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <ScheduleBlock
                block={block}
                index={index}
                totalBlocks={schedule.length}
                onToggleTask={onToggleTask}
                onUpdateBlock={onUpdateBlock}
                onRemoveBlock={onRemoveBlock}
                onMoveBlock={onMoveBlock}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
