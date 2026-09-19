import { Target } from 'lucide-react'

export default function TaskInput({ taskName, setTaskName }) {
  return (
    <div className="w-full max-w-sm mx-auto">
      <label htmlFor="current-task" className="sr-only">
        Current Task
      </label>
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-nocturn-muted pointer-events-none">
          <Target className="w-4 h-4 text-nocturn-accent/70" />
        </div>
        <input
          id="current-task"
          type="text"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="What are you working on?"
          className="w-full bg-white/[0.03] text-white text-xs sm:text-sm pl-10 pr-4 py-2 rounded-full border border-white/[0.08] hover:border-white/15 focus:border-nocturn-accent/80 focus:outline-none focus:ring-2 focus:ring-nocturn-accent/20 transition-all duration-150 placeholder:text-nocturn-muted/60 text-center sm:text-left shadow-sm"
        />
      </div>
    </div>
  )
}
