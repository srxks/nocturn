import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Calendar,
  Sun,
  Clock,
  AlertTriangle,
  Sparkles,
  X,
} from 'lucide-react'
import { parseNaturalTaskInput } from '../../services/taskInputParser'
import { playClickSound } from '../../services/soundService'

export default function MobileQuickAddSheet({
  isOpen,
  onClose,
  onAddTask,
  defaultDay = 'today',
  defaultInMyDay = true,
}) {
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(defaultDay)
  const [priority, setPriority] = useState('medium')
  const [inMyDay, setInMyDay] = useState(defaultInMyDay)
  const [customDate, setCustomDate] = useState('')
  const inputRef = useRef(null)
  const dateInputRef = useRef(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleClose = () => {
    setTitle('')
    onClose()
  }

  const naturalParsed = useMemo(() => {
    return parseNaturalTaskInput(title)
  }, [title])

  const handleSubmit = (e) => {
    e?.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    const parsed = parseNaturalTaskInput(trimmed)
    const finalTitle = parsed.cleanTitle || trimmed

    let targetDay = day === 'custom' && customDate ? customDate : (day === 'none' ? null : day)
    if (parsed.day) targetDay = parsed.day

    const finalInMyDay = Boolean(inMyDay || parsed.day === 'today' || targetDay === 'today')
    const finalPriority = parsed.priority || priority || 'medium'
    const finalReminder = parsed.time || null

    playClickSound()
    onAddTask(finalTitle, targetDay, finalInMyDay, finalPriority, finalReminder)

    setTitle('')
    onClose()
  }

  const hasNaturalTokens = naturalParsed.priority || naturalParsed.day || naturalParsed.time

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center select-none lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Bottom Sheet Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-lg bg-[#0e0f14] border-t border-white/12 rounded-t-[32px] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-[0_-25px_60px_rgba(0,0,0,0.95)] z-10 space-y-4"
          >
            {/* Drag Handle */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto" />

            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-nocturn-muted">
                Quick Task Creation
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded-lg text-nocturn-muted hover:text-white bg-white/[0.04] border border-white/[0.06] transition-colors cursor-pointer"
                aria-label="Close sheet"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  aria-label="Task title"
                  className="w-full bg-transparent text-lg font-medium text-white placeholder:text-nocturn-muted/60 focus:outline-none border-b border-white/10 pb-3"
                />

                {/* Natural Language Live Tokens Preview */}
                {hasNaturalTokens && (
                  <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1">
                    <span className="text-[11px] text-nocturn-muted flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-nocturn-accent" />
                    </span>
                    {naturalParsed.priority && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px] bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        {naturalParsed.priority.toUpperCase()}
                      </span>
                    )}
                    {naturalParsed.day && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px] bg-nocturn-accent/15 text-nocturn-accent-bright border border-nocturn-accent/30">
                        <Calendar className="w-3 h-3" />
                        {naturalParsed.day === 'today' ? 'Today' : 'Tomorrow'}
                      </span>
                    )}
                    {naturalParsed.formattedTime && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <Clock className="w-3 h-3" />
                        {naturalParsed.formattedTime}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Controls Row */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                {/* Due Date Chips */}
                <div className="inline-flex items-center bg-white/[0.04] p-0.5 rounded-xl border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setDay('today')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      day === 'today'
                        ? 'bg-nocturn-accent text-white font-semibold shadow-sm'
                        : 'text-nocturn-muted hover:text-white'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setDay('tomorrow')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      day === 'tomorrow'
                        ? 'bg-nocturn-accent text-white font-semibold shadow-sm'
                        : 'text-nocturn-muted hover:text-white'
                    }`}
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => dateInputRef.current?.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.focus()}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                      day === 'custom' && customDate
                        ? 'bg-nocturn-accent text-white font-semibold shadow-sm'
                        : 'text-nocturn-muted hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{day === 'custom' && customDate ? customDate : 'Date'}</span>
                  </button>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        setCustomDate(e.target.value)
                        setDay('custom')
                      }
                    }}
                    className="sr-only"
                    tabIndex={-1}
                    aria-label="Pick custom date"
                  />
                </div>

                {/* Priority Selector */}
                <div className="inline-flex items-center bg-white/[0.04] p-0.5 rounded-xl border border-white/[0.08]">
                  {['low', 'medium', 'high'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                        priority === p
                          ? p === 'high'
                            ? 'bg-rose-500 text-white font-semibold'
                            : 'bg-white/15 text-white font-semibold'
                          : 'text-nocturn-muted hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* My Day Toggle */}
                <button
                  type="button"
                  onClick={() => setInMyDay((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    inMyDay
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-white/[0.04] text-nocturn-muted border-white/[0.08]'
                  }`}
                >
                  <Sun className={`w-3.5 h-3.5 ${inMyDay ? 'text-amber-400 fill-amber-400' : ''}`} />
                  <span>My Day</span>
                </button>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="w-full py-3.5 rounded-2xl bg-nocturn-accent hover:bg-nocturn-accent-bright disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-nocturn-accent/25 active:scale-[0.98] cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add Task</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
