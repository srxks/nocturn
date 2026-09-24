import { motion } from 'framer-motion'

export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
  size = 'md',
}) {
  const sizeClasses = {
    sm: 'p-1 text-xs rounded-2xl',
    md: 'p-1 text-xs sm:text-sm rounded-2xl',
  }

  const tabPadding = {
    sm: 'px-3 py-1.5 rounded-xl',
    md: 'px-3.5 py-1.5 rounded-xl',
  }

  return (
    <div
      className={`inline-flex items-center bg-white/[0.02] backdrop-blur-md border border-white/[0.06] ${
        sizeClasses[size] || sizeClasses.md
      } ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange?.(tab.id)}
            className={`relative flex items-center gap-2 font-medium transition-colors duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent/60 ${
              tabPadding[size] || tabPadding.md
            } ${isActive ? 'text-white font-semibold' : 'text-nocturn-muted hover:text-white'}`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabPill"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                className="absolute inset-0 bg-white/[0.08] rounded-xl border border-white/[0.12] shadow-sm pointer-events-none"
              />
            )}

            {Icon && <Icon className="w-3.5 h-3.5 shrink-0 relative z-10" />}
            <span className="relative z-10">{tab.label}</span>

            {tab.count !== undefined && tab.count !== null && (
              <span
                className={`relative z-10 text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-colors ${
                  isActive
                    ? 'bg-nocturn-accent/25 text-nocturn-accent-bright font-semibold'
                    : 'bg-white/10 text-nocturn-muted'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
