import { forwardRef } from 'react'

const VARIANTS = {
  default:
    'bg-white/[0.02] backdrop-blur-md border border-white/[0.06] shadow-sm',
  elevated:
    'bg-white/[0.04] backdrop-blur-md border border-white/[0.08] shadow-md',
  ghost:
    'bg-white/[0.01] border border-white/[0.04]',
  interactive:
    'bg-white/[0.02] hover:bg-white/[0.04] backdrop-blur-md border border-white/[0.06] hover:border-white/[0.12] transition-colors duration-150 cursor-pointer shadow-sm',
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
