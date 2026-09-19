import { motion } from 'framer-motion'

export function Switch({
  checked = false,
  onChange,
  disabled = false,
  label,
  description,
  id,
  className = '',
}) {
  const switchId = id || (label ? `switch-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  const handleToggle = () => {
    if (!disabled) onChange?.(!checked)
  }

  const handleKeyDown = (e) => {
    if (disabled) return
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      handleToggle()
    }
  }

  return (
    <div className={`flex items-start justify-between gap-4 select-none ${className}`}>
      {(label || description) && (
        <div className="space-y-0.5 min-w-0 flex-1">
          {label && (
            <label
              htmlFor={switchId}
              onClick={handleToggle}
              className="text-sm font-medium text-white block cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-nocturn-muted leading-relaxed">{description}</p>
          )}
        </div>
      )}

      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent/60 disabled:opacity-40 disabled:cursor-not-allowed ${
          checked ? 'bg-nocturn-accent' : 'bg-white/10 hover:bg-white/15'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`block w-4 h-4 rounded-full bg-white shadow-sm pointer-events-none ${
            checked ? 'ml-6' : 'ml-1'
          }`}
        />
      </button>
    </div>
  )
}

export default Switch
