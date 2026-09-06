import { Moon, Check } from 'lucide-react'

export default function PreferenceCard() {
  return (
    <section className="space-y-3">
      <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide px-1">
        Preferences
      </h2>

      <div className="nocturn-card p-5 sm:p-6 border border-nocturn-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-nocturn-surface border border-nocturn-border flex items-center justify-center text-nocturn-accent shrink-0">
            <Moon className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <span className="text-sm sm:text-base font-semibold text-white block">
              Appearance
            </span>
            <span className="text-xs text-nocturn-muted block">
              Always-on dark theme optimized for focus
            </span>
          </div>
        </div>

        {/* Active Dark Mode Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-nocturn-accent-bright bg-nocturn-accent/15 border border-nocturn-accent/30 shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.25)] select-none">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          <span>Dark Mode</span>
        </div>
      </div>
    </section>
  )
}
