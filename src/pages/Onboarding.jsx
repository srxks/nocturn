import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
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
    <div className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-6 bg-[#16171b] text-white selection:bg-nocturn-accent selection:text-black overflow-hidden relative">
      {/* Floating Cinematic Tall Card */}
      <div className="relative w-full max-w-[420px] min-h-[620px] bg-[#090a0d] border border-white/[0.08] rounded-[38px] p-8 sm:p-9 flex flex-col justify-between shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden z-10">
        {/* Soft Ambient Glows inside panel */}
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-teal-500/15 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-1/2 -right-16 w-56 h-56 bg-amber-500/12 rounded-full blur-[80px] pointer-events-none" />

        {/* Thin Flowing Curved Lines Artwork emerging from lower-left */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none select-none opacity-25"
          viewBox="0 0 420 620"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M-40,580 C60,540 140,460 220,380 C300,300 370,240 460,220"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1.2"
            strokeDasharray="4 6"
          />
          <path
            d="M-20,620 C80,570 170,480 250,390 C330,300 400,240 480,210"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="0.8"
          />
          <path
            d="M0,660 C100,600 200,500 280,400 C360,300 430,230 500,200"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.6"
            strokeDasharray="6 8"
          />
        </svg>

        {/* Card Top: Skip link */}
        <div className="relative z-10 flex items-center justify-end">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-medium text-nocturn-muted hover:text-white px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer"
          >
            Skip
          </button>
        </div>

        {/* Middle: Step Specific Content */}
        <div className="relative z-10 my-auto py-4">
          <AnimatePresence mode="wait">
            {/* Step 0: Welcome (Direct recreation of reference image) */}
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 pt-2"
              >
                {/* Smiling Emoji at Top-Left */}
                <div className="text-3xl sm:text-4xl mb-3">🙂</div>

                {/* Large White Heading */}
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
                  Welcome
                </h1>

                {/* Two-Line Subtitle */}
                <p className="text-base sm:text-lg text-nocturn-muted leading-snug font-normal pt-1">
                  Manage your task<br />
                  very easily!
                </p>
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

          {/* Compact Pill Button matching reference */}
          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2 rounded-full bg-[#1c1d22] hover:bg-white text-white hover:text-black border border-white/10 text-xs font-semibold transition-all duration-150 flex items-center gap-2.5 cursor-pointer shadow-sm active:scale-95 group"
          >
            <span>{step === totalSteps - 1 ? 'Enter Nocturn' : 'Next'}</span>
            <span className="text-[13px] tracking-tight text-white/70 group-hover:text-black transition-colors">»</span>
          </button>
        </div>
      </div>
    </div>
  )
}
