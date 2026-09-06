import { useState, useRef } from 'react'
import { Plus, Calendar } from 'lucide-react'

export default function AddTask({ onAddTask, defaultDay = 'none' }) {
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(defaultDay)
  const [prevDefaultDay, setPrevDefaultDay] = useState(defaultDay)
  const [customDate, setCustomDate] = useState('')
  const dateInputRef = useRef(null)

  if (defaultDay !== prevDefaultDay) {
    setPrevDefaultDay(defaultDay)
    setDay(defaultDay)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    const targetDate = day === 'custom' && customDate ? customDate : (day === 'none' ? null : day)
    onAddTask(trimmed, targetDate)
    setTitle('')
  }

  const handleCustomDateChange = (e) => {
    const val = e.target.value
    if (val) {
      setCustomDate(val)
      setDay('custom')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div className="relative flex items-center">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task..."
          aria-label="Add a task"
          className="w-full nocturn-input pr-12 text-sm sm:text-base py-3 sm:py-3.5 shadow-inner"
        />
        <button
          type="submit"
          aria-label="Submit new task"
          disabled={!title.trim()}
          className="absolute right-2 p-2 rounded-xl bg-nocturn-accent text-black hover:bg-nocturn-accent-bright disabled:opacity-40 disabled:hover:bg-nocturn-accent transition-all duration-200 cursor-pointer disabled:cursor-not-allowed shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.4)]"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Target Day / Date Toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-nocturn-muted font-medium">Add to:</span>
        <div className="inline-flex items-center bg-nocturn-card p-0.5 rounded-xl border border-nocturn-border">
          <button
            type="button"
            onClick={() => setDay('none')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
              day === 'none'
                ? 'bg-nocturn-accent text-black font-semibold shadow-[0_0_10px_rgba(var(--color-nocturn-accent-rgb),0.3)]'
                : 'text-nocturn-muted hover:text-white'
            }`}
          >
            No date
          </button>
          <button
            type="button"
            onClick={() => setDay('today')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
              day === 'today'
                ? 'bg-nocturn-accent text-black font-semibold shadow-[0_0_10px_rgba(var(--color-nocturn-accent-rgb),0.3)]'
                : 'text-nocturn-muted hover:text-white'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDay('tomorrow')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
              day === 'tomorrow'
                ? 'bg-nocturn-accent text-black font-semibold shadow-[0_0_10px_rgba(var(--color-nocturn-accent-rgb),0.3)]'
                : 'text-nocturn-muted hover:text-white'
            }`}
          >
            Tomorrow
          </button>
          <div className="relative inline-flex items-center">
            <button
              type="button"
              onClick={() => dateInputRef.current?.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.focus()}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                day === 'custom' && customDate
                  ? 'bg-nocturn-accent text-black font-semibold shadow-[0_0_10px_rgba(var(--color-nocturn-accent-rgb),0.3)]'
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
      </div>
    </form>
  )
}
