import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Coffee,
  Play,
  Calendar,
  Check,
} from 'lucide-react'

export default function SessionCompletionModal({
  isOpen,
  sessionData,
  onCompleteSession,
}) {
  const [note, setNote] = useState('')
  const [markTaskDone, setMarkTaskDone] = useState(true)

  if (!isOpen || !sessionData) return null

  const {
    sessionId,
    taskTitle = '',
    durationMins = 25,
    isLongBreak = false,
  } = sessionData

  const handleAction = (nextAction) => {
    onCompleteSession({
      sessionId,
      note: note.trim(),
      markTaskDone,
      nextAction, // 'break' | 'next-focus' | 'plan' | 'stay'
    })
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="w-full max-w-[440px] bg-[#11131a]/95 backdrop-blur-2xl border border-white/[0.1] rounded-[24px] p-6 sm:p-7 shadow-2xl space-y-6 text-left relative overflow-hidden"
          style={{
            boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 0 32px var(--glow), var(--elev-2)',
          }}
        >
          {/* Header celebration flourish */}
          <div className="flex items-start gap-4">
            {/* Popping circle with animated SVG pathLength checkmark */}
            <motion.div
              initial={{ scale: 0.6, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 20 }}
              className="w-13 h-13 rounded-2xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent shrink-0 shadow-[0_0_24px_rgba(var(--color-nocturn-accent-rgb),0.35)]"
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <motion.path
                  d="M4 12.5L9.5 18L20 6"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, ease: 'easeOut', delay: 0.15 }}
                />
              </svg>
            </motion.div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-nocturn-accent tracking-wider uppercase font-mono">
                <Sparkles className="w-3.5 h-3.5 text-nocturn-accent" />
                <span>Session Finished</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-display">
                {taskTitle || 'Focus Session'}
              </h2>
              <p className="text-xs text-nocturn-muted">
                {durationMins} minutes of disciplined focus logged.
              </p>
            </div>
          </div>

          {/* Accomplishment Prompt with Character Counter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white flex items-center justify-between">
              <span>What did you accomplish?</span>
              <span className="text-[10px] font-mono text-nocturn-dim">
                {note.length}/250
              </span>
            </label>
            <textarea
              value={note}
              maxLength={250}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Read 2 chapters, resolved bug, outlined paper..."
              rows={3}
              className="w-full bg-[#161924] text-white text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-white/10 focus:border-nocturn-accent outline-none resize-none placeholder:text-nocturn-dim"
              autoFocus
            />
          </div>

          {/* Mark Task Complete Toggle (if task attached) */}
          {taskTitle && (
            <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.05] transition-colors">
              <input
                type="checkbox"
                checked={markTaskDone}
                onChange={(e) => setMarkTaskDone(e.target.checked)}
                className="w-4 h-4 rounded border-white/30 text-nocturn-accent accent-nocturn-accent cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-white block">
                  Mark task as completed
                </span>
                <span className="text-[11px] text-nocturn-muted block">
                  Check this off from your task list and daily plan
                </span>
              </div>
            </label>
          )}

          {/* Action Decision Options with Distinct Hover Lift */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-nocturn-dim block">
              Next Step
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <motion.button
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => handleAction('break')}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-nocturn-accent hover:bg-nocturn-accent-bright text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
              >
                <Coffee className="w-4 h-4" />
                <span>{isLongBreak ? 'Start Long Break' : 'Start Short Break'}</span>
              </motion.button>

              <motion.button
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => handleAction('next-focus')}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Next Focus Block</span>
              </motion.button>

              <motion.button
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => handleAction('plan')}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-nocturn-muted hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>View Today's Plan</span>
              </motion.button>

              <motion.button
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => handleAction('stay')}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-transparent hover:bg-white/[0.04] text-nocturn-muted hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <span>Log & Close</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
