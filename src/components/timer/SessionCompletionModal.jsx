import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Sparkles,
  Coffee,
  Play,
  Calendar,
  Clock,
  ArrowRight,
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-lg bg-[#11131a] border border-nocturn-border rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-6 text-left"
        >
          {/* Header celebration flourish */}
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent-bright shrink-0 shadow-[0_0_24px_rgba(var(--color-nocturn-accent-rgb),0.3)]">
              <CheckCircle2 className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-nocturn-accent tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-nocturn-accent" />
                <span>Session Finished</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {taskTitle || 'Focus Session'}
              </h2>
              <p className="text-xs text-nocturn-muted">
                {durationMins} minutes of disciplined focus logged to your consistency streak.
              </p>
            </div>
          </div>

          {/* Accomplishment Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white flex items-center justify-between">
              <span>What did you accomplish during this session?</span>
              <span className="text-[11px] text-nocturn-muted font-normal">Optional</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Read chapters 3 & 4, fixed authentication bug, drafted essay outline..."
              rows={3}
              className="w-full bg-[#181a24] text-white text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-white/10 focus:border-nocturn-accent outline-none resize-none placeholder:text-white/30"
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

          {/* Action Choice Buttons */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-nocturn-muted uppercase tracking-wider block px-0.5">
              What's next?
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAction('break')}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-nocturn-accent hover:bg-nocturn-accent-bright text-white text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4" />
                  <span>{isLongBreak ? 'Take Long Break' : 'Take Short Break'}</span>
                </div>
                <ArrowRight className="w-4 h-4 opacity-70" />
              </button>

              <button
                type="button"
                onClick={() => handleAction('next-focus')}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white text-xs font-semibold tracking-wide transition-all active:scale-95 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  <span>Start Next Focus</span>
                </div>
                <ArrowRight className="w-4 h-4 opacity-70" />
              </button>

              <button
                type="button"
                onClick={() => handleAction('plan')}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-nocturn-accent" />
                  <span>Return to Plan</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                type="button"
                onClick={() => handleAction('stay')}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-nocturn-muted hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-nocturn-muted" />
                  <span>Stay on Timer</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 opacity-50" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
