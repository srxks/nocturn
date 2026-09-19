import { forwardRef } from 'react'

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    leftIcon: LeftIcon,
    rightElement,
    className = '',
    containerClassName = '',
    id,
    disabled,
    ...props
  },
  ref
) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <div className={`w-full space-y-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-nocturn-muted select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {LeftIcon && (
          <div className="absolute left-3 text-nocturn-muted pointer-events-none flex items-center">
            <LeftIcon className="w-4 h-4" />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={`w-full bg-nocturn-card text-white text-sm placeholder:text-nocturn-muted/60 border rounded-xl transition-all duration-150 outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            LeftIcon ? 'pl-9' : 'pl-3.5'
          } ${rightElement ? 'pr-10' : 'pr-3.5'} py-2.5 ${
            error
              ? 'border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-nocturn-border focus:border-nocturn-accent/80 focus:ring-2 focus:ring-nocturn-accent/20 hover:border-white/15'
          } ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 flex items-center text-nocturn-muted">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-rose-400 select-none font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-nocturn-muted/80 select-none">{helperText}</p>
      ) : null}
    </div>
  )
})

export default Input
