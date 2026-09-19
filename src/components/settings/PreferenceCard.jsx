import { Moon } from 'lucide-react'
import { Card, Badge } from '../ui'

export default function PreferenceCard() {
  return (
    <section className="space-y-3">
      <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight px-0.5">
        Display Mode
      </h2>

      <Card className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-accent shrink-0">
            <Moon className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <span className="text-sm sm:text-base font-semibold text-white block">
              Dark Mode
            </span>
            <span className="text-xs text-nocturn-muted block">
              Always-on dark theme engineered for prolonged focus and eye comfort.
            </span>
          </div>
        </div>

        {/* Active Dark Mode Pill */}
        <Badge variant="accent" size="sm" dot>
          Always Active
        </Badge>
      </Card>
    </section>
  )
}

