import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Timer,
  Calendar,
  Check,
  User,
  Target,
  Palette,
} from 'lucide-react'
import { useTheme } from '../context/useTheme'

const FOCUS_GOALS = [
  { id: '2h', label: '2 Hours', subtitle: 'Gentle & Sustainable', hours: 2 },
  { id: '4h', label: '4 Hours', subtitle: 'Standard Deep Work', hours: 4, recommended: true },
  { id: '6h', label: '6 Hours', subtitle: 'Serious Sprint', hours: 6 },
  { id: '8h', label: '8 Hours', subtitle: 'Intense Focus', hours: 8 },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { activeTheme, presetThemes, applyTheme } = useTheme()

  const [step, setStep] = useState(0)
  const [userName, setUserName] = useState(() => localStorage.getItem('nocturn_user_name') || '')
  const [focusGoal, setFocusGoal] = useState('4h')

  const totalSteps = 5

  const handleNext = () => {
    if (step === 1 && userName.trim()) {
      localStorage.setItem('nocturn_user_name', userName.trim())
    }
    if (step < totalSteps - 1) {
      setStep((prev) => prev + 1)
    } else {
      localStorage.setItem('nocturn_onboarding_completed', 'true')
      navigate('/tasks')
    }
  }

  const handleSkip = () => {
    localStorage.setItem('nocturn_onboarding_completed', 'true')
    navigate('/tasks')
  }

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-6 bg-[#070709] text-white selection:bg-nocturn-accent selection:text-black overflow-hidden relative">
      {/* Ambient background glows */}
      <div className="fixed top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-1/2 right-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Cinematic Tall Card */}
      <div className="relative w-full max-w-[440px] min-h-[580px] bg-[#0d0e13]/90 border border-white/[0.08] rounded-3xl p-7 sm:p-8 flex flex-col justify-between shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden z-10">
        {/* Orbital Curved Lines SVG in Background */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
          fill="none"
          viewBox="0 0 440 600"
          aria-hidden="true"
        >
          <ellipse
            cx="220"
            cy="150"
            rx="190"
            ry="90"
            stroke="rgba(255,255,255,0.12)"
            strokeDasharray="4 8"
            strokeWidth="1"
          />
          <ellipse
            cx="220"
            cy="150"
            rx="260"
            ry="140"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.8"
          />
          <ellipse
            cx="220"
            cy="150"
            rx="340"
            ry="190"
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="6 10"
            strokeWidth="0.6"
          />
        </svg>

        {/* Card Top: Emoji / Avatar + Skip Pill */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-xl shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              🙂
            </div>
            <span className="text-xs font-semibold tracking-wider text-nocturn-muted uppercase">
              Nocturn
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-medium text-nocturn-muted hover:text-white px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer"
          >
            Skip
          </button>
        </div>

        {/* Middle: Step Specific Content */}
        <div className="relative z-10 my-auto py-6">
          <AnimatePresence mode="wait">
            {/* Step 0: Welcome */}
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    Calm, intentional productivity.
                  </h1>
                  <p className="text-xs sm:text-sm text-nocturn-muted leading-relaxed">
                    A distraction-free workspace combining structured daily scheduling with reliable Pomodoro focus sessions.
                  </p>
                </div>

                <div className="pt-3 space-y-2.5">
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">Plan My Day</span>
                      <span className="text-[11px] text-nocturn-muted block">AI-structured timeline from natural text</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent shrink-0">
                      <Timer className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">Unbroken Focus</span>
                      <span className="text-[11px] text-nocturn-muted block">Never loops or loses completed minutes</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 1: Personalize Name */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-accent mb-2">
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    What should we call you?
                  </h1>
                  <p className="text-xs sm:text-sm text-nocturn-muted leading-relaxed">
                    Personalize your daily greetings and focus summaries.
                  </p>
                </div>

                <div className="pt-2">
                  <input
                    type="text"
                    autoFocus
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name or nickname"
                    className="w-full bg-nocturn-surface border border-nocturn-border rounded-xl text-sm p-3.5 text-white placeholder:text-nocturn-muted/60 focus:border-nocturn-accent focus:ring-2 focus:ring-nocturn-accent/20 outline-none transition-all"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Focus Goals */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-accent mb-2">
                    <Target className="w-4.5 h-4.5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    Daily Focus Goal
                  </h1>
                  <p className="text-xs sm:text-sm text-nocturn-muted leading-relaxed">
                    How much uninterrupted focus time do you aim for each day?
                  </p>
                </div>

                <div className="pt-1 grid grid-cols-2 gap-2.5">
                  {FOCUS_GOALS.map((goal) => {
                    const isSelected = focusGoal === goal.id
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => setFocusGoal(goal.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-nocturn-accent/15 border-nocturn-accent text-white shadow-sm ring-1 ring-nocturn-accent/30'
                            : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15 text-nocturn-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-white/90'}`}>
                            {goal.label}
                          </span>
                          {goal.recommended && (
                            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-nocturn-accent/20 text-nocturn-accent">
                              Ideal
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-nocturn-muted block mt-0.5">
                          {goal.subtitle}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 3: Aesthetic / Themes */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-accent mb-2">
                    <Palette className="w-4.5 h-4.5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    Workspace Aesthetic
                  </h1>
                  <p className="text-xs sm:text-sm text-nocturn-muted leading-relaxed">
                    Choose a color palette. You can customize this anytime in Settings.
                  </p>
                </div>

                <div className="pt-1 space-y-2">
                  {presetThemes.slice(0, 5).map((preset) => {
                    const isSelected = activeTheme?.id === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyTheme(preset)}
                        className={`w-full p-2.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white/[0.07] border-nocturn-accent/70 shadow-sm ring-1 ring-nocturn-accent/30'
                            : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-5 h-5 rounded-full border border-white/20 shadow-sm shrink-0"
                            style={{ backgroundColor: preset.colors?.accent || '#00E676' }}
                          />
                          <span className="text-xs font-semibold text-white">
                            {preset.name}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-nocturn-accent" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 4: Ready */}
            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
                    <Sparkles className="w-4.5 h-4.5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    You're ready to focus.
                  </h1>
                  <p className="text-xs sm:text-sm text-nocturn-muted leading-relaxed">
                    Your preferences are saved locally and will sync smoothly across devices.
                  </p>
                </div>

                <div className="pt-2 space-y-2 text-xs">
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                    <span className="text-nocturn-muted">Display Name</span>
                    <span className="text-white font-medium">{userName || 'Productive Thinker'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                    <span className="text-nocturn-muted">Daily Target</span>
                    <span className="text-white font-medium">{focusGoal.toUpperCase()} Deep Work</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                    <span className="text-nocturn-muted">Active Theme</span>
                    <span className="text-white font-medium">{activeTheme?.name || 'Nocturn'}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card Bottom: Dots Indicator + Compact [ Next ›› ] Pill */}
        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/[0.06]">
          {/* Indicator Dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-6 bg-nocturn-accent'
                    : i < step
                    ? 'w-1.5 bg-white/40'
                    : 'w-1.5 bg-white/15'
                }`}
              />
            ))}
          </div>

          {/* Compact Pill Button */}
          <button
            type="button"
            onClick={handleNext}
            className="px-4 py-2 rounded-full bg-white text-black hover:bg-white/90 text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.15)] active:scale-95"
          >
            <span>{step === totalSteps - 1 ? 'Enter Nocturn' : 'Next'}</span>
            <span className="text-[10px] tracking-tighter opacity-70">››</span>
          </button>
        </div>
      </div>
    </div>
  )
}
