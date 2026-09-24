import { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Sparkles, Calendar, Clock, AlertTriangle, Tag } from 'lucide-react'
import { playClickSound } from '../../services/soundService'
import { parseNaturalTaskInput } from '../../services/taskInputParser'
import { useTasks } from '../../context/useTasks'

export default function AddTask({ onAddTask, defaultDay = 'none', defaultInMyDay = false }) {
  const { tasks } = useTasks()
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(defaultDay)
  const [inMyDay, setInMyDay] = useState(defaultInMyDay || defaultDay === 'today')
  const [prevDefaultDay, setPrevDefaultDay] = useState(defaultDay)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef(null)

  if (defaultDay !== prevDefaultDay) {
    setPrevDefaultDay(defaultDay)
    setDay(defaultDay)
    setInMyDay(defaultInMyDay || defaultDay === 'today')
  }

  // All existing tags from tasks for autocomplete
  const allExistingTags = useMemo(() => {
    if (!tasks) return []
    const set = new Set()
    for (const t of tasks) {
      if (Array.isArray(t.tags)) {
        for (const tag of t.tags) {
          if (tag) set.add(tag.toLowerCase())
        }
      }
    }
    return Array.from(set)
  }, [tasks])

  // Detect tag input right at the end of the text e.g. #work
  const tagMatch = useMemo(() => {
    const match = title.match(/#([a-zA-Z0-9_-]*)$/)
    if (!match) return null
    return match[1].toLowerCase()
  }, [title])

  const suggestedTags = useMemo(() => {
    if (tagMatch === null) return []
    return allExistingTags
      .filter((t) => t.includes(tagMatch) && t !== tagMatch)
      .slice(0, 5)
  }, [tagMatch, allExistingTags])

  const applySuggestedTag = (tag) => {
    setTitle((prev) => prev.replace(/#([a-zA-Z0-9_-]*)$/, `#${tag} `))
    inputRef.current?.focus()
  }

  // Live parsed natural language entities
  const naturalParsed = useMemo(() => {
    return parseNaturalTaskInput(title)
  }, [title])

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    const parsed = parseNaturalTaskInput(trimmed)
    const finalTitle = parsed.cleanTitle || trimmed

    // Determine target day: natural language override takes precedence if present
    let targetDay = day === 'none' ? null : day
    if (parsed.day) {
      targetDay = parsed.day
    }

    const finalInMyDay = Boolean(inMyDay || parsed.day === 'today' || targetDay === 'today')
    const finalPriority = parsed.priority || 'medium'
    const finalReminder = parsed.time || null

    playClickSound()
    onAddTask(finalTitle, targetDay, finalInMyDay, finalPriority, finalReminder)

    setTitle('')
    if (defaultDay === 'none') {
      setDay('none')
      setInMyDay(false)
    }
  }

  const hasNaturalTokens =
    naturalParsed.priority ||
    naturalParsed.day ||
    naturalParsed.time ||
    naturalParsed.duration ||
    (naturalParsed.tags && naturalParsed.tags.length > 0)

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-2.5 relative">
      {/* 52px Full-width glass input, radius 14 */}
      <div
        className={`relative h-[52px] rounded-[14px] border transition-all duration-200 flex items-center px-4 shadow-sm ${
          isFocused
            ? 'border-nocturn-accent/60 bg-[#11131a] ring-2 ring-nocturn-accent/20'
            : 'border-white/[0.08] hover:border-white/[0.15] bg-[#11131a]/80 backdrop-blur-xl'
        }`}
        style={{
          boxShadow: isFocused ? 'var(--elev-focus)' : 'var(--elev-1)',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay to allow clicking autocomplete chips
            setTimeout(() => setIsFocused(false), 200)
          }}
          placeholder="Add a task with date, time, #tag, or p1-p3..."
          aria-label="Add a task"
          className="w-full h-full bg-transparent text-sm sm:text-[14.5px] text-white placeholder-nocturn-muted/60 focus:outline-none pr-10 z-10"
        />

        {/* Enter / Submit Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          type="submit"
          aria-label="Submit new task"
          disabled={!title.trim()}
          className="absolute right-2.5 z-10 w-8 h-8 rounded-xl bg-nocturn-accent hover:bg-nocturn-accent-bright disabled:opacity-30 disabled:hover:bg-nocturn-accent text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </motion.button>
      </div>

      {/* Tag Autocomplete Dropdown */}
      <AnimatePresence>
        {isFocused && suggestedTags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-[56px] z-30 flex items-center gap-1.5 p-2 bg-[#12141c]/95 border border-white/10 rounded-xl shadow-xl backdrop-blur-md"
          >
            <span className="text-[11px] text-nocturn-dim px-1 font-medium">Tag suggestions:</span>
            {suggestedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  applySuggestedTag(tag)
                }}
                className="px-2 py-0.5 rounded-lg bg-white/[0.08] hover:bg-nocturn-accent/20 hover:text-nocturn-accent-bright text-white/90 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1"
              >
                #{tag}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Natural Language Entity Chips Pop-in (scale 0.8 -> 1) */}
      <AnimatePresence>
        {hasNaturalTokens && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="flex items-center gap-2 flex-wrap px-1 text-xs"
          >
            <span className="text-[11px] font-medium text-nocturn-dim flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-nocturn-accent" /> Detected:
            </span>

            {naturalParsed.day && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
              >
                <Calendar className="w-3 h-3" />
                {naturalParsed.day}
              </motion.span>
            )}

            {naturalParsed.time && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
              >
                <Clock className="w-3 h-3" />
                {naturalParsed.time}
              </motion.span>
            )}

            {naturalParsed.duration && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
              >
                <Clock className="w-3 h-3" />
                {naturalParsed.duration}m
              </motion.span>
            )}

            {naturalParsed.priority && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium text-[11px] border ${
                  naturalParsed.priority === 'high'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : naturalParsed.priority === 'low'
                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                {naturalParsed.priority}
              </motion.span>
            )}

            {naturalParsed.tags &&
              naturalParsed.tags.map((tag) => (
                <motion.span
                  key={tag}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.06] text-nocturn-muted border border-white/10"
                >
                  <Tag className="w-3 h-3" />#{tag}
                </motion.span>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
}
