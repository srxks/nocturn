import { motion } from 'framer-motion'

export function Progress({
  value = 0,
  max = 100,
  size = 'md',
  label,
  valueText,
  variant = 'accent',
  className = '',
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  const sizeClasses = {
    sm: 'h-1.5 rounded-full',
    md: 'h-2 rounded-full',
    lg: 'h-3 rounded-full',
  }

  const fillColors = {
    accent: 'bg-nocturn-accent',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
  }

  const fillColor = fillColors[variant] || fillColors.accent

  return (
    <div className={`w-full space-y-1.5 select-none ${className}`}>
      {(label || valueText) && (
        <div className="flex items-center justify-between text-xs font-medium">
          {label && <span className="text-nocturn-muted">{label}</span>}
          {valueText ? (
            <span className="text-white font-mono">{valueText}</span>
          ) : (
            <span className="text-white font-mono">{Math.round(percent)}%</span>
          )}
        </div>
      )}

      <div
        className={`w-full bg-white/[0.08] overflow-hidden ${
          sizeClasses[size] || sizeClasses.md
        }`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`h-full rounded-full ${fillColor}`}
        />
      </div>
    </div>
  )
}

export default Progress
