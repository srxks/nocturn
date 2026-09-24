import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Check,
  User,
  Target,
  Palette,
} from 'lucide-react'
import { useTheme } from '../context/useTheme'
import { useAuth } from '../context/useAuth'

const FOCUS_GOALS = [
  { id: '2h', label: '2 Hours', subtitle: 'Gentle & Sustainable', hours: 2 },
  { id: '4h', label: '4 Hours', subtitle: 'Standard Deep Work', hours: 4, recommended: true },
  { id: '6h', label: '6 Hours', subtitle: 'Serious Sprint', hours: 6 },
  { id: '8h', label: '8 Hours', subtitle: 'Intense Focus', hours: 8 },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isReplay = searchParams.get('replay') === 'true'

  const { activeTheme, presetThemes, applyTheme } = useTheme()
  const { user, continueAsGuest } = useAuth()

  // Guard: if user has already completed onboarding (or is authenticated) and this isn't a replay, redirect to tasks
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
      if (!user) {
        continueAsGuest()
      }
      navigate('/tasks?view=myday')
    }
  }

  const handleSkip = () => {
    localStorage.setItem('nocturn_onboarding_completed', 'true')
    if (!user) {
      continueAsGuest()
    }
    navigate('/tasks?view=myday')
  }

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col justify-between p-6 sm:p-10 md:p-12 lg:p-16 bg-[#07080A] text-white selection:bg-nocturn-accent selection:text-black overflow-hidden relative pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      {/* Full-Viewport Ambient Glows */}
      <div className="absolute -bottom-24 -left-24 w-96 sm:w-[500px] h-96 sm:h-[500px] bg-teal-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 sm:w-[500px] h-96 sm:h-[500px] bg-indigo-500/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Thin Flowing Curved Lines Artwork emerging from lower-left across full viewport */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none opacity-20"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M-60,950 C200,850 420,680 670,520 C920,360 1170,250 1520,180"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.4"
          strokeDasharray="6 8"
        />
        <path
          d="M-30,1000 C240,900 480,720 740,550 C1000,380 1240,280 1570,220"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.1"
        />
        <path
          d="M0,1050 C300,940 560,760 830,580 C1100,400 1340,300 1620,250"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.8"
          strokeDasharray="8 12"
        />
      </svg>

      {/* Top Header: Brand & Skip */}
      <header className="relative z-10 w-full max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-nocturn-accent shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb,99,102,241),0.8)]" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/90">
            Nocturn
          </span>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="text-xs font-medium text-nocturn-muted hover:text-white px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer"
        >
          {isReplay ? 'Close' : 'Skip'}
        </button>
      </header>

      {/* Center Main Step Content */}
      <main className="relative z-10 w-full max-w-2xl mx-auto my-auto py-8">
        <AnimatePresence mode="wait">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.22 }}
              className="space-y-4"
            >
              <div className="text-4xl sm:text-5xl mb-2">🙂</div>

              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
                Welcome
              </h1>

              <p className="text-lg sm:text-2xl text-nocturn-muted leading-relaxed font-normal pt-1 max-w-lg">
                Manage your tasks<br />
                without the noise.
              </p>
            </motion.div>
          )}

          {/* Step 1: Personalize Name */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.22 }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-accent mb-3">
                  <User className="w-5 h-5" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  What should we call you?
                </h1>
                <p className="text-sm sm:text-base text-nocturn-muted leading-relaxed">
                  Personalize your daily greetings and focus summaries.
                </p>
              </div>

              <div className="pt-3">
                <input
                  type="text"
                  autoFocus
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name or nickname"
                  className="w-full bg-[#111318] border border-white/[0.12] rounded-2xl text-base p-4 text-white placeholder:text-nocturn-muted/60 focus:border-nocturn-accent focus:ring-2 focus:ring-nocturn-accent/20 outline-none transition-all"
                />
              </div>
            </motion.div>
          )}

          {/* Step 2: Daily Focus Goal */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.22 }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-accent mb-3">
                  <Target className="w-5 h-5" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Daily Focus Goal
                </h1>
                <p className="text-sm sm:text-base text-nocturn-muted leading-relaxed">
                  How much uninterrupted focus time do you aim for each day?
                </p>
              </div>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {FOCUS_GOALS.map((goal) => {
                  const isSelected = focusGoal === goal.id
                  return (
                    <motion.button
                      key={goal.id}
                      type="button"
                      whileHover={{ y: -2, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      onClick={() => setFocusGoal(goal.id)}
                      className={`p-4 rounded-2xl border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-nocturn-accent/15 border-nocturn-accent text-white shadow-sm ring-1 ring-nocturn-accent/30'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.14] text-nocturn-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-base font-bold ${isSelected ? 'text-white' : 'text-white/90'}`}>
                          {goal.label}
                        </span>
                        {goal.recommended && (
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-nocturn-accent/20 text-nocturn-accent">
                            Ideal
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-nocturn-muted block mt-1">
                        {goal.subtitle}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Step 3: Aesthetic / Themes */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.22 }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-accent mb-3">
                  <Palette className="w-5 h-5" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Workspace Aesthetic
                </h1>
                <p className="text-sm sm:text-base text-nocturn-muted leading-relaxed">
                  Choose a calm color palette. You can customize this anytime in Settings.
                </p>
              </div>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[46vh] overflow-y-auto pr-1">
                {presetThemes.map((preset) => {
                  const isSelected = activeTheme?.id === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyTheme(preset)}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white/[0.08] border-nocturn-accent shadow-sm ring-1 ring-nocturn-accent/40'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-4.5 h-4.5 rounded-full border border-white/20 shadow-sm shrink-0"
                          style={{ backgroundColor: preset.colors?.accent || '#6366F1' }}
                        />
                        <span className="text-xs font-semibold text-white truncate">
                          {preset.name}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-nocturn-accent shrink-0" />
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
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.22 }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  You're ready to focus.
                </h1>
                <p className="text-sm sm:text-base text-nocturn-muted leading-relaxed">
                  Your preferences are saved locally and will sync smoothly across devices.
                </p>
              </div>

              <div className="pt-2 space-y-2.5 text-sm">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between">
                  <span className="text-nocturn-muted">Display Name</span>
                  <span className="text-white font-medium">{userName || 'Productive Thinker'}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between">
                  <span className="text-nocturn-muted">Daily Target</span>
                  <span className="text-white font-medium">{focusGoal.toUpperCase()} Deep Work</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between">
                  <span className="text-nocturn-muted">Active Theme</span>
                  <span className="text-white font-medium">{activeTheme?.name || 'Nocturn Obsidian'}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation: Stepper Dots & Compact Action Pill */}
      <footer className="relative z-10 w-full max-w-2xl mx-auto flex items-center justify-between pt-6 border-t border-white/[0.08]">
        {/* Stepper Dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-7 bg-nocturn-accent'
                  : i < step
                  ? 'w-2 bg-white/40'
                  : 'w-2 bg-white/15'
              }`}
            />
          ))}
        </div>

        {/* Compact Pill Button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={handleNext}
          className="px-6 py-2.5 rounded-full bg-white/[0.04] hover:bg-white text-white hover:text-black border border-white/15 text-sm font-semibold transition-all duration-150 flex items-center gap-2.5 cursor-pointer shadow-sm group"
        >
          <span>{step === totalSteps - 1 ? 'Enter Nocturn' : 'Next'}</span>
          <span className="text-sm tracking-tight text-white/70 group-hover:text-black transition-colors">»</span>
        </motion.button>
      </footer>
    </div>
  )
}
