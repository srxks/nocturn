import { useState } from 'react'
import { Plus } from 'lucide-react'

export default function AddTask({ onAddTask }) {
  const [title, setTitle] = useState('')
  const [day, setDay] = useState('today')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    onAddTask(trimmed, day)
    setTitle('')
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
          className="absolute right-2 p-2 rounded-xl bg-nocturn-accent text-black hover:bg-nocturn-accent-bright disabled:opacity-40 disabled:hover:bg-nocturn-accent transition-all duration-200 cursor-pointer disabled:cursor-not-allowed shadow-[0_0_12px_rgba(0,230,118,0.4)]"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Target Day Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-nocturn-muted font-medium">Add to:</span>
        <div className="inline-flex bg-nocturn-card p-0.5 rounded-xl border border-nocturn-border">
          <button
            type="button"
            onClick={() => setDay('today')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
              day === 'today'
                ? 'bg-nocturn-accent text-black font-semibold shadow-[0_0_10px_rgba(0,230,118,0.3)]'
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
                ? 'bg-nocturn-accent text-black font-semibold shadow-[0_0_10px_rgba(0,230,118,0.3)]'
                : 'text-nocturn-muted hover:text-white'
            }`}
          >
            Tomorrow
          </button>
        </div>
      </div>
    </form>
  )
}
