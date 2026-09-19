import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

export const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    children,
    options = [],
    className = '',
    containerClassName = '',
    id,
    disabled,
    ...props
  },
  ref
) {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <div className={`w-full space-y-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-medium text-nocturn-muted select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={`w-full bg-nocturn-card text-white text-sm border rounded-xl pl-3.5 pr-9 py-2.5 appearance-none cursor-pointer transition-all duration-150 outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? 'border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-nocturn-border focus:border-nocturn-accent/80 focus:ring-2 focus:ring-nocturn-accent/20 hover:border-white/15'
          } ${className}`}
          {...props}
        >
          {children
            ? children
            : options.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-nocturn-surface text-white py-1"
                >
                  {opt.label}
                </option>
              ))}
        </select>

        <ChevronDown className="absolute right-3 w-4 h-4 text-nocturn-muted pointer-events-none stroke-[2]" />
      </div>

      {error ? (
        <p className="text-xs text-rose-400 select-none font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-nocturn-muted/80 select-none">{helperText}</p>
      ) : null}
    </div>
  )
})

export default Select
