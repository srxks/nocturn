import { useState, useRef, useEffect } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'

export default function TaskItem({ task, onToggleComplete, onEditTask, onDeleteTask }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== task.title) {
      onEditTask(task.id, trimmed)
    } else {
      setEditTitle(task.title)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTitle(task.title)
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <div
      className={`group relative flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
        task.completed
          ? 'bg-nocturn-card/40 border-nocturn-border/50 opacity-75'
          : 'bg-nocturn-card border-nocturn-border hover:border-nocturn-accent/30 shadow-md shadow-black/40'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Custom Accessible Checkbox */}
        <button
          type="button"
          role="checkbox"
          aria-checked={task.completed}
          aria-label={task.completed ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
          onClick={() => onToggleComplete(task.id)}
          className={`shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent ${
            task.completed
              ? 'bg-nocturn-accent border-nocturn-accent text-black shadow-[0_0_10px_rgba(var(--color-nocturn-accent-rgb),0.5)]'
              : 'border-nocturn-muted/40 hover:border-nocturn-accent bg-nocturn-surface/50 text-transparent'
          }`}
        >
          <Check className={`w-4 h-4 stroke-[3] transition-transform duration-150 ${task.completed ? 'scale-100' : 'scale-0'}`} />
        </button>

        {/* Task Title or Inline Edit Input */}
        {isEditing ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Edit task title"
              className="w-full bg-nocturn-bg text-white text-sm sm:text-base px-2.5 py-1 rounded-lg border border-nocturn-accent focus:outline-none focus:ring-1 focus:ring-nocturn-accent-bright"
            />
            <button
              type="button"
              onClick={handleSave}
              aria-label="Save edited task"
              className="p-1.5 rounded-lg text-nocturn-accent hover:bg-nocturn-accent/10 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Cancel editing"
              className="p-1.5 rounded-lg text-nocturn-muted hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => onToggleComplete(task.id)}
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer select-none"
          >
            <span
              className={`text-sm sm:text-base break-words transition-all duration-200 ${
                task.completed
                  ? 'line-through text-nocturn-dim font-normal'
                  : 'text-white font-medium'
              }`}
            >
              {task.title}
            </span>
            {task.priority && (
              <span
                className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md border font-medium capitalize shrink-0 ${
                  task.priority === 'high'
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/25'
                    : task.priority === 'low'
                    ? 'text-blue-400 bg-blue-500/10 border-blue-500/25'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                }`}
              >
                {task.priority === 'high' ? 'High' : task.priority === 'low' ? 'Low' : 'Medium'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!isEditing && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label={`Edit task: ${task.title}`}
            className="p-1.5 rounded-lg text-nocturn-muted hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent"
          >
            <Pencil className="w-4 h-4 stroke-[2]" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteTask(task.id)}
            aria-label={`Delete task: ${task.title}`}
            className="p-1.5 rounded-lg text-nocturn-muted hover:text-rose-400 hover:bg-rose-400/10 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <Trash2 className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      )}
    </div>
  )
}
