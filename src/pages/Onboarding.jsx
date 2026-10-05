import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Check,
  Target,
  Timer,
  Clock,
  Zap,
  Flame,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { db } from '../db/db'

const FOCUS_STYLES = [
  {
    id: 'pomodoro',
    name: 'Pomodoro',
    duration: '25m / 5m',
    description: 'Classic rhythm with regular short pauses. Best for sustained daily productivity.',
    icon: Timer,
    recommended: true,
  },
  {
    id: '52-17',
    name: '52 / 17 Rhythm',
    duration: '52m / 17m',
    description: 'Scientifically calibrated work sprints with full cognitive recovery.',
    icon: Flame,
  },
  {
    id: 'ultradian',
    name: '90m Ultradian',
    duration: '90m / 20m',
    description: 'Extended deep immersion for complex coding, research, and writing.',
    icon: Clock,
  },
  {
    id: 'quick',
    name: '15m Sprint',
    duration: '15m / 3m',
    description: 'Quick bursts to overcome friction and defeat procrastination.',
    icon: Zap,
  },
  {
    id: 'focus_stopwatch',
    name: 'Focus Stopwatch',
    duration: 'Open-ended',
    description: 'Track uninterrupted deep work without the pressure of a countdown.',
    icon: Target,
  },
]

const DAILY_GOALS = [
  {
    id: '1h',
    label: '1 - 2 Hours',
    sessions: '2 - 3 Sessions',
    subtitle: 'Gentle, sustainable daily pace',
  },
  {
    id: '2h',
    label: '2 Hours',
    sessions: '4 Sessions',
    subtitle: 'Balanced daily execution standard',
    recommended: true,
  },
  {
    id: '4h',
    label: '4 Hours',
    sessions: '8 Sessions',
    subtitle: 'Dedicated high-performance deep work',
  },
  {
    id: '6h',
    label: '6+ Hours',
    sessions: '12+ Sessions',
    subtitle: 'Intensive study, sprints, or deadline prep',
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isReplay = searchParams.get('replay') === 'true'

  const { user, continueAsGuest } = useAuth()

  // Guard: if user has already completed onboarding and this isn't a replay, redirect
  useEffect(() => {
    if (!isReplay) {
      const isCompleted =
        typeof window !== 'undefined' &&
        localStorage.getItem('nocturn_onboarding_completed') === 'true'
      if (isCompleted || user) {
        navigate('/tasks?view=myday', { replace: true })
      }
    }
  }, [user, isReplay, navigate])

  const [step, setStep] = useState(0)
  const [focusStyle, setFocusStyle] = useState(() => {
    return (
      (typeof localStorage !== 'undefined'
        ? localStorage.getItem('nocturn_timer_preset')
        : null) || 'pomodoro'
    )
  })
  const [focusGoal, setFocusGoal] = useState(() => {
    return (
      (typeof localStorage !== 'undefined'
        ? localStorage.getItem('nocturn_daily_goal')
        : null) || '2h'
    )
  })

  const totalSteps = 4

  const finalizeOnboarding = () => {
    try {
      localStorage.setItem('nocturn_onboarding_completed', 'true')
      localStorage.setItem('nocturn_timer_preset', focusStyle)
      localStorage.setItem('nocturn_daily_goal', focusGoal)

      // Also persist to Dexie local user settings if DB exists
      if (db?.userSettings) {
        db.userSettings.put({
          id: user?.id || 'guest-local-user',
          userId: user?.id || 'guest-local-user',
          onboardingCompleted: true,
          focusStyle,
          dailyGoal: focusGoal,
          updatedAt: new Date().toISOString(),
        }).catch(() => {})
      }
    } catch {
      // ignore
    }

    if (!user) {
      continueAsGuest()
    }

    navigate('/tasks?view=myday', { replace: true })
  }

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep((prev) => prev + 1)
    } else {
      finalizeOnboarding()
    }
  }

  const handleSkip = () => {
    finalizeOnboarding()
  }

  const selectedStyleObj = FOCUS_STYLES.find((s) => s.id === focusStyle) || FOCUS_STYLES[0]
  const selectedGoalObj = DAILY_GOALS.find((g) => g.id === focusGoal) || DAILY_GOALS[1]

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col justify-between p-5 sm:p-8 md:p-12 bg-[#07080A] text-white selection:bg-nocturn-accent selection:text-black overflow-hidden relative pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
      {/* Background Ambient Glows */}
      <div className="absolute -bottom-24 -left-24 w-80 sm:w-[450px] h-80 sm:h-[450px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-80 sm:w-[450px] h-80 sm:h-[450px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header: Brand & Skip Button */}
      <header className="relative z-10 w-full max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-nocturn-accent shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb),0.8)]" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/90">
            Nocturn
          </span>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="text-xs font-medium text-nocturn-muted hover:text-white px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer"
        >
          {isReplay ? 'Close' : 'Skip Setup'}
        </button>
      </header>

      {/* Center Main Step Content */}
      <main className="relative z-10 w-full max-w-2xl mx-auto my-auto py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {/* SCREEN 1: Welcome to Nocturn */}
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent shadow-[0_0_16px_rgba(var(--color-nocturn-accent-rgb),0.3)]">
                <Sparkles className="w-6 h-6 stroke-[2]" />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
                  Welcome to Nocturn
                </h1>
                <p className="text-base sm:text-xl text-nocturn-muted leading-relaxed font-normal pt-1 max-w-lg">
                  Calm, high-performance focus designed without noise, friction, or clutter.
                </p>
              </div>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <ShieldCheck className="w-4 h-4 text-nocturn-accent" />
                    <span>Offline-First</span>
                  </div>
                  <p className="text-[11px] text-nocturn-dim">Instant local execution with optional cloud sync.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Timer className="w-4 h-4 text-emerald-400" />
                    <span>Scientific Focus</span>
                  </div>
                  <p className="text-[11px] text-nocturn-dim">Pomodoro, 52/17, Ultradian, and open flow stopwatches.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <span>Pure Execution</span>
                  </div>
                  <p className="text-[11px] text-nocturn-dim">Natural task scheduling, GRE vocab, and zero clutter.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: Choose Your Focus Style */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Choose Your Focus Style
                </h1>
                <p className="text-xs sm:text-sm text-nocturn-muted">
                  Select your default cadence. You can change this anytime from the Focus Timer.
                </p>
              </div>

              <div className="space-y-2 pt-2 max-h-[50vh] overflow-y-auto pr-1">
                {FOCUS_STYLES.map((style) => {
                  const isSelected = focusStyle === style.id
                  const Icon = style.icon
                  return (
                    <motion.button
                      key={style.id}
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setFocusStyle(style.id)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-nocturn-accent/15 border-nocturn-accent ring-1 ring-nocturn-accent/40 shadow-sm'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-nocturn-accent text-black font-bold'
                              : 'bg-white/[0.04] text-nocturn-muted'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate">
                              {style.name}
                            </span>
                            <span className="text-[10px] font-mono text-nocturn-dim bg-white/[0.04] px-1.5 py-0.2 rounded border border-white/[0.06]">
                              {style.duration}
                            </span>
                            {style.recommended && (
                              <span className="text-[10px] font-semibold text-nocturn-accent bg-nocturn-accent/20 px-1.5 py-0.2 rounded-full">
                                Standard
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-nocturn-muted truncate mt-0.5">
                            {style.description}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-nocturn-accent text-black flex items-center justify-center shrink-0 shadow-sm">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* SCREEN 3: Set Your Daily Goal */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Set Your Daily Target
                </h1>
                <p className="text-xs sm:text-sm text-nocturn-muted">
                  How much uninterrupted focus time do you aim to complete each day?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {DAILY_GOALS.map((goal) => {
                  const isSelected = focusGoal === goal.id
                  return (
                    <motion.button
                      key={goal.id}
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setFocusGoal(goal.id)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-nocturn-accent/15 border-nocturn-accent ring-1 ring-nocturn-accent/40 shadow-sm'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-white">
                          {goal.label}
                        </span>
                        {goal.recommended && (
                          <span className="text-[10px] font-semibold text-nocturn-accent bg-nocturn-accent/20 px-2 py-0.5 rounded-full">
                            Ideal
                          </span>
                        )}
                        {isSelected && !goal.recommended && (
                          <div className="w-4 h-4 rounded-full bg-nocturn-accent text-black flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-mono text-nocturn-dim block mt-1">
                        {goal.sessions}
                      </span>
                      <span className="text-[11px] text-nocturn-muted block mt-1">
                        {goal.subtitle}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* SCREEN 4: You're all set! */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.3)]">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>

              <div className="space-y-1.5">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  You're all set.
                </h1>
                <p className="text-sm sm:text-base text-nocturn-muted">
                  Your workspace is ready. You can modify these anytime in Settings.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.08] flex items-center justify-between">
                  <span className="text-nocturn-muted">Focus Style</span>
                  <span className="text-white font-semibold flex items-center gap-1.5">
                    {selectedStyleObj.name} ({selectedStyleObj.duration})
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.08] flex items-center justify-between">
                  <span className="text-nocturn-muted">Daily Target</span>
                  <span className="text-white font-semibold">
                    {selectedGoalObj.label} ({selectedGoalObj.sessions})
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.08] flex items-center justify-between">
                  <span className="text-nocturn-muted">Database Engine</span>
                  <span className="text-emerald-400 font-mono text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Offline IndexedDB Active
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Footer: Stepper Dots & Action Button */}
      <footer className="relative z-10 w-full max-w-2xl mx-auto flex items-center justify-between pt-4 border-t border-white/[0.08]">
        {/* Stepper Dots (1..4) */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-7 bg-nocturn-accent shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb),0.5)]'
                  : i < step
                  ? 'w-2 bg-white/40'
                  : 'w-2 bg-white/15'
              }`}
            />
          ))}
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleNext}
          className="px-6 py-2.5 rounded-xl bg-white text-black hover:bg-nocturn-accent font-semibold text-xs sm:text-sm transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-md"
        >
          <span>{step === totalSteps - 1 ? 'Enter Nocturn' : 'Continue'}</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </motion.button>
      </footer>
    </div>
  )
}
