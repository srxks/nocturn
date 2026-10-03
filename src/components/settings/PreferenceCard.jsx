import { Moon, Sparkles, ZapOff, Minimize2 } from 'lucide-react'
import { Card, Badge } from '../ui'
import { useAnimation } from '../../context/AnimationContext'

export default function PreferenceCard() {
  const { animationMode, setAnimationMode } = useAnimation()

  const options = [
    {
      id: 'on',
      label: 'ON',
      title: 'Full Motion',
      desc: 'Fluid springs, smooth transitions, and glowing visual cues.',
      icon: Sparkles,
    },
    {
      id: 'reduced',
      label: 'REDUCED',
      title: 'Reduced Motion',
      desc: 'Calm, gentle fades without bouncing or high-frequency movement.',
      icon: Minimize2,
    },
    {
      id: 'off',
      label: 'OFF',
      title: 'Instant / No Motion',
      desc: 'Instant state switches, zero animations for maximum speed & focus.',
      icon: ZapOff,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Display Mode */}
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

          <Badge variant="accent" size="sm" dot>
            Always Active
          </Badge>
        </Card>
      </section>

      {/* Animation & Motion Control */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
              Motion & Animations
            </h2>
            <p className="text-xs text-nocturn-muted">
              Control transitions, layout animations, and interface movement across the app.
            </p>
          </div>
          <Badge
            variant={animationMode === 'on' ? 'accent' : animationMode === 'reduced' ? 'neutral' : 'warning'}
            size="sm"
          >
            {animationMode.toUpperCase()}
          </Badge>
        </div>

        <Card className="space-y-4 p-4 sm:p-5">
          {/* Segmented Button Group */}
          <div
            role="radiogroup"
            aria-label="Animation Mode"
            className="grid grid-cols-3 gap-1.5 p-1 bg-white/[0.03] border border-white/[0.08] rounded-2xl"
          >
            {options.map((opt) => {
              const isSelected = animationMode === opt.id
              const Icon = opt.icon
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setAnimationMode(opt.id)}
                  className={`relative py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-nocturn-accent text-white shadow-[0_0_16px_rgba(var(--color-nocturn-accent-rgb),0.35)]'
                      : 'text-nocturn-muted hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>{opt.label}</span>
                </button>
              )
            })}
          </div>

          {/* Active Mode Explanation */}
          <div className="px-1 text-xs text-nocturn-dim leading-relaxed">
            {options.find((o) => o.id === animationMode)?.desc}
          </div>
        </Card>
      </section>
    </div>
  )
}
