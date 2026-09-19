import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary:
    'bg-nocturn-accent text-white hover:bg-nocturn-accent-bright shadow-sm hover:shadow-[0_4px_14px_-2px_rgba(var(--color-nocturn-accent-rgb,99,102,241),0.3)] border border-transparent',
  secondary:
    'bg-nocturn-card text-white hover:bg-nocturn-surface border border-nocturn-border hover:border-white/15',
  ghost:
    'bg-transparent text-nocturn-muted hover:text-white hover:bg-white/[0.06] border border-transparent',
  danger:
    'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 hover:border-rose-500/50',
  subtle:
    'bg-white/[0.04] text-white hover:bg-white/[0.08] border border-white/[0.08]',
}

const SIZES = {
  sm: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5',
  md: 'text-sm px-3.5 py-2 rounded-xl gap-2',
  lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5 font-medium',
}

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    loading = false,
    disabled = false,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary
  const sizeClass = SIZES[size] || SIZES.md

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent/60 cursor-pointer ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : LeftIcon ? (
        <LeftIcon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
      {!loading && RightIcon && <RightIcon className="w-4 h-4 shrink-0" />}
    </button>
  )
})

export default Button
