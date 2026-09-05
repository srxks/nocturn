import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock,
  Sparkles,
  Coffee,
  Check,
  Play,
  Trash2,
  ChevronUp,
  ChevronDown,
  Edit2,
  X,
  Save,
} from 'lucide-react'
import { formatTimeRange } from '../../utils/planner'
import { getTaskDeadlineConfig } from '../../utils/deadlineUtils'

export default function ScheduleBlock({
  block,
  index,
  totalBlocks,
  onToggleTask,
  onUpdateBlock,
  onRemoveBlock,
  onMoveBlock,
}) {
  const navigate = useNavigate()
  const isFocus = block.type === 'focus'
  const isBreak = block.type === 'break'

  const [isEditing, setIsEditing] = useState(false)
  const [editTime, setEditTime] = useState(block.startTime || '09:00')
  const [editDuration, setEditDuration] = useState(block.duration || 45)

  const deadlineConfig = getTaskDeadlineConfig(block.taskObj || block)

  const handleFocus = () => {
    navigate('/timer', { state: { taskName: block.title } })
  }

  const handleSaveEdit = () => {
    onUpdateBlock(block.id, {
      startTime: editTime,
      duration: Number(editDuration),
    })
    setIsEditing(false)
  }

  return (
    <div
      className={`relative group flex flex-col gap-3 p-4 sm:p-4.5 rounded-2xl border transition-all duration-200 ${
        isFocus
          ? 'bg-nocturn-card border-nocturn-accent/40 shadow-[0_0_20px_rgba(0,230,118,0.1)] hover:border-nocturn-accent/60'
          : 'bg-nocturn-surface/40 border-nocturn-border/60 text-nocturn-muted opacity-85'
      }`}
    >
      {/* Deadline Indicator Accent Bar for Focus Tasks */}
      {isFocus && deadlineConfig.status !== 'none' && (
        <div className={`absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r-full ${deadlineConfig.indicatorBg}`} />
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
        {/* Left Info: Checkbox + Time Pillar + Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1 w-full sm:w-auto pl-1">
          {/* Completion Checkbox for focus tasks */}
          {isFocus && block.taskId && (
            <button
              type="button"
              onClick={() => onToggleTask(block.taskId)}
              aria-label={`Complete ${block.title}`}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${deadlineConfig.checkboxHoverBorder}`}
            >
              <Check className="w-3.5 h-3.5 text-nocturn-accent stroke-[3] opacity-0 hover:opacity-100" />
            </button>
          )}

          {/* Time Badge */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono font-semibold text-nocturn-accent bg-nocturn-surface px-2.5 py-1.5 rounded-xl border border-nocturn-border">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimeRange(block.startTime, block.duration)}</span>
          </div>

          {/* Title */}
          <span
            className={`text-sm sm:text-base font-semibold truncate flex-1 ${
              isBreak ? 'text-nocturn-muted italic' : 'text-white'
            }`}
          >
            {block.title}
          </span>
        </div>

        {/* Right Info: Duration Badge + Type Badge + Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
          {/* Deadline Badge if present */}
          {isFocus && deadlineConfig.status !== 'none' && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${deadlineConfig.badgeClass}`}>
              {deadlineConfig.formattedLabel}
            </span>
          )}

          {/* Duration Badge */}
          <span className="text-xs font-medium text-nocturn-muted bg-nocturn-surface px-2 py-1 rounded-lg border border-nocturn-border">
            {block.duration} min
          </span>

          {/* Type Badge */}
          {isFocus ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-nocturn-accent-bright bg-nocturn-accent/15 px-2.5 py-1 rounded-full border border-nocturn-accent/30 shadow-sm">
              <Sparkles className="w-3 h-3 stroke-[2.5]" />
              Focus
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-nocturn-muted bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              <Coffee className="w-3 h-3 stroke-[2]" />
              Break
            </span>
          )}

          {/* Quick Focus Button for Focus Tasks */}
          {isFocus && (
            <button
              type="button"
              onClick={handleFocus}
              className="nocturn-btn-primary py-1 px-3 text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,230,118,0.3)] cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current text-black" />
              <span>Focus</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Schedule Block Actions / Controls Bar */}
      <div className="pt-2 border-t border-nocturn-border/50 flex items-center justify-between gap-2 text-xs text-nocturn-muted">
        {isEditing ? (
          /* Inline Editing Mode */
          <div className="flex items-center gap-2.5 flex-wrap w-full">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-nocturn-dim font-medium">Start:</span>
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="bg-nocturn-surface border border-nocturn-border rounded-lg px-2 py-1 text-xs text-white focus:border-nocturn-accent focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-nocturn-dim font-medium">Duration:</span>
              <select
                value={editDuration}
                onChange={(e) => setEditDuration(Number(e.target.value))}
                className="bg-nocturn-surface border border-nocturn-border rounded-lg px-2 py-1 text-xs text-white focus:border-nocturn-accent focus:outline-none cursor-pointer"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
                <option value={120}>120 min</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-2.5 py-1 rounded-lg bg-nocturn-accent/20 text-nocturn-accent border border-nocturn-accent/40 font-semibold hover:bg-nocturn-accent/30 flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3 h-3" />
                <span>Save</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-lg bg-nocturn-surface text-nocturn-muted hover:text-white border border-nocturn-border cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          /* Default Controls Bar */
          <>
            <div className="flex items-center gap-1">
              {/* Edit Button */}
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg hover:bg-nocturn-surface text-nocturn-muted hover:text-white border border-transparent hover:border-nocturn-border transition-colors cursor-pointer flex items-center gap-1"
                title="Edit start time & duration"
              >
                <Edit2 className="w-3 h-3" />
                <span className="text-[11px] font-medium hidden sm:inline">Edit</span>
              </button>

              {/* Reorder Buttons */}
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMoveBlock(index, -1)}
                className="p-1.5 rounded-lg hover:bg-nocturn-surface text-nocturn-muted hover:text-white border border-transparent hover:border-nocturn-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Move up in schedule"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={index === totalBlocks - 1}
                onClick={() => onMoveBlock(index, 1)}
                className="p-1.5 rounded-lg hover:bg-nocturn-surface text-nocturn-muted hover:text-white border border-transparent hover:border-nocturn-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Move down in schedule"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Remove Block Button */}
            <button
              type="button"
              onClick={() => onRemoveBlock(block.id)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-nocturn-muted hover:text-red-400 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer flex items-center gap-1"
              title="Remove from schedule"
            >
              <Trash2 className="w-3 h-3" />
              <span className="text-[11px] font-medium hidden sm:inline">Remove</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
