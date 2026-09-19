import { forwardRef } from 'react'

export const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    helperText,
    className = '',
    containerClassName = '',
    id,
    disabled,
    rows = 4,
    ...props
  },
  ref
) {
  const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <div className={`w-full space-y-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-medium text-nocturn-muted select-none"
        >
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        disabled={disabled}
        className={`w-full bg-nocturn-card text-white text-sm placeholder:text-nocturn-muted/60 border rounded-xl p-3.5 transition-all duration-150 outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-y ${
          error
            ? 'border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
            : 'border-nocturn-border focus:border-nocturn-accent/80 focus:ring-2 focus:ring-nocturn-accent/20 hover:border-white/15'
        } ${className}`}
        {...props}
      />

      {error ? (
        <p className="text-xs text-rose-400 select-none font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-nocturn-muted/80 select-none">{helperText}</p>
      ) : null}
    </div>
  )
})

export default Textarea
