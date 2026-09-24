import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Moon,
  Sparkles,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Star,
  Clock,
  X,
} from 'lucide-react'

export default function EveningReviewModal({
  isOpen,
  onClose,
  plan,
  tasks = [],
  onRolloverTasks,
  onSaveReview,
}) {
  const [productivityRating, setProductivityRating] = useState(4)
  const [reflectionNote, setReflectionNote] = useState('')
  const [selectedRolloverIds, setSelectedRolloverIds] = useState(() => {
    // Default to select all today's incomplete tasks
    return tasks.filter((t) => !t.completed).map((t) => t.id)
  })

  if (!isOpen) return null

  const completedBlocks = (plan?.blocks || []).filter((b) => b.completed)
  const totalBlocks = (plan?.blocks || []).length
  const completedTasks = tasks.filter((t) => t.completed)
  const incompleteTasks = tasks.filter((t) => !t.completed)

  const toggleTaskSelection = (id) => {
    setSelectedRolloverIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleFinishReview = () => {
    if (selectedRolloverIds.length > 0 && onRolloverTasks) {
      onRolloverTasks(selectedRolloverIds)
    }

    if (onSaveReview) {
      onSaveReview({
        rating: productivityRating,
        notes: reflectionNote.trim(),
        completedBlocksCount: completedBlocks.length,
        totalBlocksCount: totalBlocks,
        completedTasksCount: completedTasks.length,
        date: new Date().toISOString().slice(0, 10),
      })
    }

    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg bg-[#11131a] border border-nocturn-border rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Moon className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Evening Ritual</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Day in Review
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-nocturn-muted hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stats Accomplishment Summary */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div>
              <span className="text-[11px] text-nocturn-muted block">Focus Blocks Done</span>
              <span className="text-xl font-bold font-mono text-nocturn-accent-bright">
                {completedBlocks.length} / {totalBlocks}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-nocturn-muted block">Tasks Checked Off</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {completedTasks.length}
              </span>
            </div>
          </div>

          {/* Productivity Rating (1-5 Stars) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white block">
              How would you rate today's focus & energy?
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setProductivityRating(star)}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    productivityRating >= star
                      ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                      : 'bg-white/[0.03] text-nocturn-muted border border-transparent hover:text-white'
                  }`}
                >
                  <Star
                    className={`w-5 h-5 ${productivityRating >= star ? 'fill-amber-400' : ''}`}
                  />
                </button>
              ))}
              <span className="text-xs font-medium text-nocturn-muted pl-2">
                {productivityRating === 5
                  ? 'Peak flow 🚀'
                  : productivityRating === 4
                  ? 'Great focus ✨'
                  : productivityRating === 3
                  ? 'Solid day 👍'
                  : productivityRating === 2
                  ? 'A bit scattered 🌀'
                  : 'Rough day 🌧️'}
              </span>
            </div>
          </div>

          {/* Unfinished Tasks Rollover */}
          {incompleteTasks.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white">
                  Roll over unfinished tasks to Tomorrow
                </label>
                <span className="text-[11px] text-nocturn-muted">
                  {selectedRolloverIds.length} selected
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                {incompleteTasks.map((task) => {
                  const isChecked = selectedRolloverIds.includes(task.id)
                  return (
                    <div
                      key={task.id}
                      onClick={() => toggleTaskSelection(task.id)}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-nocturn-accent/10 border-nocturn-accent/30 text-white'
                          : 'bg-white/[0.02] border-white/[0.05] text-nocturn-muted hover:text-white'
                      }`}
                    >
                      <span className="truncate">{task.title}</span>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          isChecked
                            ? 'bg-nocturn-accent border-nocturn-accent text-black'
                            : 'border-white/30'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Reflection Note */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white flex items-center justify-between">
              <span>Evening reflection note</span>
              <span className="text-[11px] text-nocturn-muted font-normal">Optional</span>
            </label>
            <textarea
              value={reflectionNote}
              onChange={(e) => setReflectionNote(e.target.value)}
              placeholder="What went well today? What can improve tomorrow? Any key takeaways..."
              rows={3}
              className="w-full bg-[#181a24] text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:border-indigo-400 outline-none resize-none placeholder:text-white/30"
            />
          </div>

          {/* Finish Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleFinishReview}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold tracking-wide transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <span>Complete Review & Roll Over Tasks</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
