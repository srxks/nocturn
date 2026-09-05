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
          className="w-full bg-nocturn-card/90 text-white text-xs sm:text-sm pl-10 pr-4 py-2.5 rounded-full border border-nocturn-border hover:border-nocturn-accent/30 focus:border-nocturn-accent focus:outline-none focus:ring-1 focus:ring-nocturn-accent transition-all duration-200 placeholder:text-nocturn-muted/60 text-center sm:text-left"
        />
      </div>
    </div>
  )
}
