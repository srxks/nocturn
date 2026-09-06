import { Coffee, Sliders, Target, Zap } from 'lucide-react'

const PLANNING_STYLES = [
  {
    id: 'relaxed',
    name: 'Relaxed',
    icon: Coffee,
    description: 'Leave plenty of breathing room.',
  },
  {
    id: 'balanced',
    name: 'Balanced',
    icon: Sliders,
    description: 'Mix focused work with reasonable breaks.',
  },
  {
    id: 'focused',
    name: 'Focused',
    icon: Target,
    description: 'Prioritize getting important work completed.',
  },
  {
    id: 'intense',
    name: 'Intense',
    icon: Zap,
    description: 'Fit as much useful work as realistically possible.',
  },
]

export default function PlanningStyleSelector({ selectedStyle, onSelectStyle }) {
  return (
    <div className="nocturn-card p-5 sm:p-6 space-y-4 border border-nocturn-border">
      <div className="space-y-1">
        <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
          Planning Style
        </h2>
        <p className="text-xs text-nocturn-muted">
          Choose how tightly your schedule should be packed today.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PLANNING_STYLES.map((style) => {
          const Icon = style.icon
          const isSelected = selectedStyle === style.id

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelectStyle(style.id)}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-2.5 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-nocturn-surface border-nocturn-accent shadow-[0_0_16px_rgba(var(--color-nocturn-accent-rgb),0.2)] ring-1 ring-nocturn-accent'
                  : 'bg-nocturn-surface/50 border-nocturn-border/80 hover:border-nocturn-accent/35 hover:bg-nocturn-surface/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-nocturn-accent' : 'text-nocturn-muted'}`} />
                  <span>{style.name}</span>
                </span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-nocturn-accent shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb),0.8)]" />
                )}
              </div>

              <p className="text-xs text-nocturn-muted leading-relaxed">
                {style.description}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
