import { forwardRef } from 'react'

const VARIANTS = {
  neutral:
    'bg-white/[0.06] text-nocturn-muted border-white/[0.08]',
  accent:
    'bg-nocturn-accent/15 text-nocturn-accent-bright border-nocturn-accent/30',
  success:
    'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  warning:
    'bg-amber-500/15 text-amber-300 border-amber-500/30',
  danger:
    'bg-rose-500/15 text-rose-300 border-rose-500/30',
  info:
    'bg-sky-500/15 text-sky-300 border-sky-500/30',
}

const SIZES = {
  sm: 'text-[10px] px-1.5 py-0.5 rounded-md gap-1 font-medium',
  md: 'text-xs px-2 py-0.5 rounded-lg gap-1.5 font-medium',
}

export const Badge = forwardRef(function Badge(
  {
    children,
    variant = 'neutral',
    size = 'md',
    dot = false,
    icon: Icon,
    className = '',
    ...props
  },
  ref
) {
  const variantClass = VARIANTS[variant] || VARIANTS.neutral
  const sizeClass = SIZES[size] || SIZES.md

  return (
    <span
      ref={ref}
      className={`inline-flex items-center border select-none ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            variant === 'success'
              ? 'bg-emerald-400'
              : variant === 'warning'
              ? 'bg-amber-400'
              : variant === 'danger'
              ? 'bg-rose-400'
              : variant === 'accent'
              ? 'bg-nocturn-accent'
              : 'bg-nocturn-muted'
          }`}
        />
      )}
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  )
})

export default Badge
