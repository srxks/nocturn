import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingIllustration from '../components/onboarding/OnboardingIllustration'
import OnboardingIndicator from '../components/onboarding/OnboardingIndicator'

const SLIDES = [
  {
    id: 'focus',
    title: 'Focus better.',
    description:
      'Turn your tasks into focused work sessions with a simple Pomodoro workflow.',
  },
  {
    id: 'plan',
    title: 'Plan your day.',
    description:
      'Organize your tasks and create a clear time-blocked plan for your day.',
  },
]

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const navigate = useNavigate()

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((prev) => prev + 1)
    } else {
      navigate('/tasks')
    }
  }

  const handleSkip = () => {
    navigate('/tasks')
  }

  const activeSlide = SLIDES[currentSlide]

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col justify-between p-6 sm:p-8 bg-nocturn-bg text-nocturn-text selection:bg-nocturn-accent selection:text-black">
      {/* Top Header / Skip */}
      <header className="max-w-md mx-auto w-full flex justify-end items-center h-10">
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm font-medium text-nocturn-muted hover:text-white px-3 py-1.5 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent cursor-pointer"
        >
          Skip
        </button>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto w-full flex-1 flex flex-col items-center justify-center text-center px-2 py-4">
        {/* Dynamic Illustration Container */}
        <div className="w-full mb-8 sm:mb-10 transition-transform duration-300 ease-out">
          <OnboardingIllustration slideIndex={currentSlide} />
        </div>

        {/* Text Area with Smooth Transition */}
        <div
          key={currentSlide}
          className="space-y-3 max-w-sm mx-auto"
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            {activeSlide.title}
          </h1>
          <p className="text-sm sm:text-base text-nocturn-muted leading-relaxed font-normal">
            {activeSlide.description}
          </p>
        </div>
      </main>

      {/* Bottom Area: Progress & Action */}
      <footer className="max-w-md mx-auto w-full space-y-6 pt-2 pb-4 sm:pb-6">
        <OnboardingIndicator
          totalSlides={SLIDES.length}
          currentSlide={currentSlide}
          onSelectSlide={setCurrentSlide}
        />

        <button
          type="button"
          onClick={handleNext}
          className="w-full nocturn-btn-primary py-3.5 text-base font-semibold shadow-[0_4px_20px_rgba(0,230,118,0.35)] cursor-pointer"
        >
          {currentSlide === SLIDES.length - 1 ? 'Get Started' : 'Next'}
        </button>
      </footer>
    </div>
  )
}
