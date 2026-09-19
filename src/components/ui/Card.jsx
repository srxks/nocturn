import { forwardRef } from 'react'

const VARIANTS = {
  default:
    'bg-nocturn-card border border-nocturn-border shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)]',
  elevated:
    'bg-nocturn-surface border border-nocturn-border shadow-[0_16px_36px_-8px_rgba(0,0,0,0.55)]',
  ghost:
    'bg-white/[0.02] border border-white/[0.05]',
  interactive:
    'bg-nocturn-card border border-nocturn-border hover:border-white/15 hover:bg-nocturn-surface/70 transition-all duration-150 cursor-pointer shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)]',
}

const PADDINGS = {
  none: 'p-0',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
}

export const Card = forwardRef(function Card(
  {
    children,
    variant = 'default',
    padding = 'md',
    className = '',
    ...props
  },
  ref
) {
  const variantClass = VARIANTS[variant] || VARIANTS.default
  const paddingClass = PADDINGS[padding] || PADDINGS.md

  return (
    <div
      ref={ref}
      className={`rounded-2xl ${variantClass} ${paddingClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
})

export default Card
