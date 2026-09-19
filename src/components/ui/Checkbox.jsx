import { motion } from 'framer-motion'

export function Checkbox({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
  id,
}) {
  const sizeMap = {
    sm: 'w-4 h-4 rounded-[5px]',
    md: 'w-5 h-5 rounded-[6px]',
    lg: 'w-6 h-6 rounded-[8px]',
  }

  const iconSizeMap = {
    sm: 10,
    md: 13,
    lg: 16,
  }

  const currentSize = sizeMap[size] || sizeMap.md
  const currentIconSize = iconSizeMap[size] || iconSizeMap.md

  const handleKeyDown = (e) => {
    if (disabled) return
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onChange?.(!checked)
    }
  }

  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onChange?.(!checked)
      }}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex items-center justify-center shrink-0 border transition-colors duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent/60 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed ${currentSize} ${
        checked
          ? 'bg-nocturn-accent border-nocturn-accent text-white'
          : 'bg-white/[0.03] border-white/20 hover:border-nocturn-accent/60'
      } ${className}`}
    >
      <motion.svg
        viewBox="0 0 14 14"
        width={currentIconSize}
        height={currentIconSize}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={checked ? 'checked' : 'unchecked'}
        className="pointer-events-none"
      >
        <motion.path
          d="M2.5 7.5L5.5 10.5L11.5 3.5"
          variants={{
            checked: { pathLength: 1, opacity: 1, scale: 1 },
            unchecked: { pathLength: 0, opacity: 0, scale: 0.5 },
          }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        />
      </motion.svg>
    </button>
  )
}

export default Checkbox
