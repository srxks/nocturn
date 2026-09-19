export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={`w-full py-12 px-4 flex flex-col items-center justify-center text-center space-y-3.5 select-none ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-muted mb-1">
          <Icon className="w-6 h-6 stroke-[1.75]" />
        </div>
      )}

      <div className="space-y-1 max-w-sm">
        {title && (
          <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-xs sm:text-sm text-nocturn-muted leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}

export default EmptyState
