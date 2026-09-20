import { useState, useRef, useMemo } from 'react'
import { Plus, Calendar, Sun, Clock, AlertTriangle, Sparkles } from 'lucide-react'
import { playClickSound } from '../../services/soundService'
import { parseNaturalTaskInput } from '../../services/taskInputParser'

export default function AddTask({ onAddTask, defaultDay = 'none', defaultInMyDay = false }) {
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(defaultDay)
  const [inMyDay, setInMyDay] = useState(defaultInMyDay || defaultDay === 'today')
  const [prevDefaultDay, setPrevDefaultDay] = useState(defaultDay)
  const [customDate, setCustomDate] = useState('')
  const dateInputRef = useRef(null)

  if (defaultDay !== prevDefaultDay) {
    setPrevDefaultDay(defaultDay)
    setDay(defaultDay)
    setInMyDay(defaultInMyDay || defaultDay === 'today')
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
    let targetDay = day === 'custom' && customDate ? customDate : (day === 'none' ? null : day)
    if (parsed.day) {
      targetDay = parsed.day
    }

    // Determine inMyDay: if parsed day is 'today' or explicit inMyDay is on
    const finalInMyDay = Boolean(inMyDay || parsed.day === 'today' || targetDay === 'today')
    const finalPriority = parsed.priority || 'medium'
    const finalReminder = parsed.time || null

    playClickSound()
    onAddTask(finalTitle, targetDay, finalInMyDay, finalPriority, finalReminder)

    setTitle('')
    if (defaultDay === 'none') {
      setDay('none')
      setInMyDay(false)
      setCustomDate('')
    }
  }

  const handleCustomDateChange = (e) => {
    const val = e.target.value
    if (val) {
      setCustomDate(val)
      setDay('custom')
    }
  }

  const hasNaturalTokens = naturalParsed.priority || naturalParsed.day || naturalParsed.time

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div className="relative flex items-center">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task... (e.g. Finish slides tomorrow at 5pm !high)"
          aria-label="Add a task"
          className="w-full nocturn-input pr-12 text-sm sm:text-base py-3 sm:py-3.5 shadow-inner"
        />
        <button
          type="submit"
          aria-label="Submit new task"
          disabled={!title.trim()}
          className="absolute right-2.5 p-2 rounded-xl bg-nocturn-accent text-white hover:bg-nocturn-accent-bright disabled:opacity-40 disabled:hover:bg-nocturn-accent transition-all duration-150 cursor-pointer disabled:cursor-not-allowed shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Live Natural Language Preview Badges */}
      {hasNaturalTokens && (
        <div className="flex items-center gap-2 flex-wrap text-xs px-1 animate-fadeIn">
          <span className="text-[11px] text-nocturn-muted flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-nocturn-accent" /> Detected:
          </span>
          {naturalParsed.priority && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px] border ${
                naturalParsed.priority === 'high'
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : naturalParsed.priority === 'low'
                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              {naturalParsed.priority.toUpperCase()} priority
            </span>
          )}
          {naturalParsed.day && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px] bg-nocturn-accent/15 text-nocturn-accent-bright border border-nocturn-accent/30">
              <Calendar className="w-3 h-3" />
              Due {naturalParsed.day === 'today' ? 'Today' : 'Tomorrow'}
            </span>
          )}
          {naturalParsed.formattedTime && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <Clock className="w-3 h-3" />
              Reminder: {naturalParsed.formattedTime}
            </span>
          )}
        </div>
      )}

      {/* Target Day / Date Toggle & Explicit My Day Toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-nocturn-muted font-medium">Due:</span>
        <div className="inline-flex items-center bg-white/[0.03] p-0.5 rounded-xl border border-nocturn-border">
          <button
            type="button"
            onClick={() => setDay('none')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
              day === 'none'
                ? 'bg-white/[0.1] text-white border border-white/[0.12] shadow-sm font-semibold'
                : 'text-nocturn-muted hover:text-white'
            }`}
          >
            No date
          </button>
          <button
            type="button"
            onClick={() => setDay('today')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
              day === 'today'
                ? 'bg-nocturn-accent/20 text-nocturn-accent-bright border border-nocturn-accent/30 font-semibold shadow-sm'
                : 'text-nocturn-muted hover:text-white'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDay('tomorrow')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
              day === 'tomorrow'
                ? 'bg-nocturn-accent/20 text-nocturn-accent-bright border border-nocturn-accent/30 font-semibold shadow-sm'
                : 'text-nocturn-muted hover:text-white'
            }`}
          >
            Tomorrow
          </button>
          <div className="relative inline-flex items-center">
            <button
              type="button"
              onClick={() => dateInputRef.current?.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.focus()}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                day === 'custom' && customDate
                  ? 'bg-nocturn-accent/20 text-nocturn-accent-bright border border-nocturn-accent/30 font-semibold shadow-sm'
                  : 'text-nocturn-muted hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{day === 'custom' && customDate ? customDate : 'Pick date'}</span>
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={customDate}
              onChange={handleCustomDateChange}
              className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
              tabIndex={-1}
              aria-label="Pick custom date"
            />
          </div>
        </div>

        {/* Explicit Add to My Day Button */}
        <button
          type="button"
          onClick={() => setInMyDay((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border transition-all duration-150 cursor-pointer ${
            inMyDay
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              : 'bg-white/[0.03] text-nocturn-muted hover:text-white border-nocturn-border'
          }`}
        >
          <Sun className={`w-3.5 h-3.5 ${inMyDay ? 'text-amber-400 fill-amber-400' : ''}`} />
          <span>My Day</span>
        </button>
      </div>
    </form>
  )
}
