import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  ghost:
    'text-nocturn-muted hover:text-white hover:bg-white/[0.08] border border-transparent',
  secondary:
    'bg-nocturn-card text-nocturn-muted hover:text-white hover:bg-nocturn-surface border border-nocturn-border hover:border-white/15',
  primary:
    'bg-nocturn-accent text-white hover:bg-nocturn-accent-bright border border-transparent shadow-sm',
  danger:
    'text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30',
}

const SIZES = {
  sm: 'w-7 h-7 p-1 rounded-lg',
  md: 'w-8 h-8 p-1.5 rounded-lg',
  lg: 'w-10 h-10 p-2 rounded-xl',
}

export const IconButton = forwardRef(function IconButton(
  {
    icon: Icon,
    variant = 'ghost',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    type = 'button',
    'aria-label': ariaLabel,
    title,
    ...props
  },
  ref
) {
  const variantClass = VARIANTS[variant] || VARIANTS.ghost
  const sizeClass = SIZES[size] || SIZES.md

  return (
    <button
      ref={ref}
      type={type}
      title={title || ariaLabel}
      aria-label={ariaLabel || title}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all duration-150 select-none active:scale-95 disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent/60 cursor-pointer ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
    </button>
  )
})

export default IconButton
