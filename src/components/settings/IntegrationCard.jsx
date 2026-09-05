import { Lock } from 'lucide-react'

export default function IntegrationCard({ title, description, icon: Icon }) {
  return (
    <div className="nocturn-card p-5 sm:p-6 border border-nocturn-border flex items-center justify-between gap-4 opacity-90">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-nocturn-surface border border-nocturn-border flex items-center justify-center text-nocturn-muted shrink-0">
          <Icon className="w-5 h-5 stroke-[2]" />
        </div>
        <div className="min-w-0">
          <span className="text-sm sm:text-base font-semibold text-white block truncate">
            {title}
          </span>
          <span className="text-xs text-nocturn-muted block truncate">
            {description}
          </span>
        </div>
      </div>

      {/* Disabled / Coming Soon Badge */}
      <button
        type="button"
        disabled
        aria-label={`${title} integration coming soon`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-nocturn-muted bg-nocturn-surface/60 border border-nocturn-border cursor-not-allowed opacity-75 shrink-0"
      >
        <Lock className="w-3 h-3 stroke-[2]" />
        <span>Coming soon</span>
      </button>
    </div>
  )
}
