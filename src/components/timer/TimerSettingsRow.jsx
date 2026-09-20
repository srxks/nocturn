import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'

export default function TimerSettingsRow({
  label,
  value,
  unit = 'min',
  min = 1,
  max,
  onChange,
  onDecrease,
  onIncrease,
}) {
  const safeValue = Number.isFinite(Number(value)) && Number(value) >= min ? Number(value) : min
  const [isFocused, setIsFocused] = useState(false)
  const [localInput, setLocalInput] = useState(String(safeValue))

  const handleFocus = () => {
    setIsFocused(true)
    setLocalInput(String(safeValue))
  }

  const handleInputChange = (e) => {
    const raw = e.target.value

    // Allow empty string temporarily so user can clear and retype
    if (raw === '') {
      setLocalInput('')
      return
    }

    // Only allow positive integer digits
    if (/^\d+$/.test(raw)) {
      setLocalInput(raw)
      const num = parseInt(raw, 10)
      if (!isNaN(num)) {
        const clamped = Math.max(min, max != null ? Math.min(max, num) : num)
        onChange(clamped)
      }
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    if (localInput === '' || isNaN(parseInt(localInput, 10))) {
      onChange(value)
    } else {
      const num = parseInt(localInput, 10)
      const clamped = Math.max(min, max != null ? Math.min(max, num) : num)
      onChange(clamped)
    }
  }

  const displayValue = isFocused ? localInput : String(safeValue)

  const isMin = safeValue <= min
  const isMax = max != null && safeValue >= max

  return (
    <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-nocturn-card border border-nocturn-border hover:border-nocturn-accent/30 transition-all duration-200 shadow-md shadow-black/40">
      <div className="space-y-0.5 min-w-0 flex-1 pr-2">
        <span className="text-sm sm:text-base font-semibold text-white block truncate">
          {label}
        </span>
        <span className="text-xs text-nocturn-muted font-normal block">
          {max != null && max < 999 ? `Range: ${min}–${max} ${unit}` : `Min: ${min} ${unit}`}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Decrease Button */}
        <button
          type="button"
          onClick={onDecrease}
          disabled={isMin}
          aria-label={`Decrease ${label}`}
          className="w-10 h-10 rounded-xl bg-nocturn-surface border border-nocturn-border text-nocturn-muted hover:text-white hover:border-nocturn-accent/50 disabled:opacity-30 disabled:hover:border-nocturn-border flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent"
        >
          <Minus className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Editable Numeric Input */}
        <div className="flex items-center justify-center">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={displayValue}
            onFocus={handleFocus}
            onChange={handleInputChange}
            onBlur={handleBlur}
            aria-label={`${label} in ${unit || 'units'}`}
            className="w-16 sm:w-20 text-center text-base sm:text-xl font-bold font-mono text-nocturn-accent-bright bg-nocturn-surface border border-nocturn-border hover:border-nocturn-accent/40 focus:border-nocturn-accent py-1.5 px-1 rounded-xl outline-none focus:ring-1 focus:ring-nocturn-accent transition-all duration-150"
          />
          {unit && (
            <span className="text-xs text-nocturn-muted font-medium ml-1.5 hidden sm:inline">
              {unit}
            </span>
          )}
        </div>

        {/* Increase Button */}
        <button
          type="button"
          onClick={onIncrease}
          disabled={isMax}
          aria-label={`Increase ${label}`}
          className="w-10 h-10 rounded-xl bg-nocturn-surface border border-nocturn-border text-nocturn-muted hover:text-white hover:border-nocturn-accent/50 disabled:opacity-30 disabled:hover:border-nocturn-border flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  )
}
