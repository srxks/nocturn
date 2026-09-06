import { Timer, Sparkles, CheckCircle2, Calendar, Flame } from 'lucide-react'

export default function OnboardingIllustration({ slideIndex }) {
  return (
    <div
      aria-hidden="true"
      className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-square mx-auto flex items-center justify-center select-none pointer-events-none"
    >
      {/* Background ambient glow */}
      <div className="absolute inset-0 bg-radial from-nocturn-accent/20 via-nocturn-accent-bright/5 to-transparent rounded-full blur-2xl animate-pulse duration-3000" />

      {slideIndex === 0 ? (
        /* Slide 1: Focus & Pomodoro Illustration */
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Outer glowing track */}
          <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-nocturn-accent/25 bg-nocturn-card/60 backdrop-blur-md flex items-center justify-center shadow-[0_0_40px_rgba(var(--color-nocturn-accent-rgb),0.15)]">
            {/* Middle decorative ring */}
            <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-full border border-dashed border-nocturn-accent/40 flex items-center justify-center">
              {/* Inner core circle */}
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-nocturn-bg via-nocturn-card to-nocturn-accent/20 border border-nocturn-accent/40 flex flex-col items-center justify-center shadow-[0_0_25px_rgba(var(--color-nocturn-accent-rgb),0.25)]">
                <Timer className="w-10 h-10 sm:w-12 sm:h-12 text-nocturn-accent-bright mb-1 stroke-[1.8]" />
                <span className="text-xs font-semibold text-white tracking-widest uppercase">
                  25:00
                </span>
              </div>
            </div>
          </div>

          {/* Floating badge 1 */}
          <div className="absolute -top-1 -right-1 sm:top-2 sm:right-2 bg-nocturn-card/95 border border-nocturn-accent/30 rounded-2xl px-3 py-1.5 flex items-center gap-1.5 shadow-lg shadow-black backdrop-blur-md">
            <Flame className="w-3.5 h-3.5 text-nocturn-accent" />
            <span className="text-[11px] font-medium text-white">Deep Work</span>
          </div>

          {/* Floating badge 2 */}
          <div className="absolute -bottom-2 -left-2 sm:bottom-2 sm:left-2 bg-nocturn-card/95 border border-nocturn-accent/30 rounded-2xl px-3 py-1.5 flex items-center gap-1.5 shadow-lg shadow-black backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-nocturn-accent-bright" />
            <span className="text-[11px] font-medium text-white">Zero Distraction</span>
          </div>
        </div>
      ) : (
        /* Slide 2: Plan Your Day Illustration */
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Calendar / Task Stack Container */}
          <div className="w-60 h-60 sm:w-68 sm:h-68 relative flex items-center justify-center">
            {/* Background card angled */}
            <div className="absolute w-48 h-56 rounded-3xl bg-nocturn-card/50 border border-nocturn-border rotate-6 scale-95 transform shadow-lg" />

            {/* Front stylized planner card */}
            <div className="relative w-52 h-60 sm:w-56 sm:h-64 rounded-3xl bg-gradient-to-b from-nocturn-surface via-nocturn-card to-nocturn-bg border border-nocturn-accent/30 p-4 flex flex-col justify-between shadow-[0_15px_35px_rgba(0,0,0,0.9),0_0_25px_rgba(var(--color-nocturn-accent-rgb),0.15)]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-nocturn-border pb-2.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-nocturn-accent" />
                  <span className="text-xs font-semibold text-white">Today's Schedule</span>
                </div>
                <span className="text-[10px] font-medium text-nocturn-muted bg-white/5 px-2 py-0.5 rounded-full">
                  3 sessions
                </span>
              </div>

              {/* Task Items */}
              <div className="space-y-2 py-1">
                <div className="flex items-center gap-2 bg-nocturn-accent/10 border border-nocturn-accent/30 rounded-xl p-2">
                  <CheckCircle2 className="w-4 h-4 text-nocturn-accent-bright shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-white truncate">Architecture Plan</p>
                    <p className="text-[9px] text-nocturn-muted">09:00 - 10:30 AM</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl p-2">
                  <div className="w-4 h-4 rounded-full border border-nocturn-muted/40 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-white/90 truncate">Review & Design</p>
                    <p className="text-[9px] text-nocturn-muted">11:00 - 12:00 PM</p>
                  </div>
                </div>
              </div>

              {/* Bottom indicator */}
              <div className="pt-2 border-t border-nocturn-border flex items-center justify-between text-[10px] text-nocturn-muted">
                <span>Time Blocked</span>
                <span className="text-nocturn-accent-bright font-medium">100% focused</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
