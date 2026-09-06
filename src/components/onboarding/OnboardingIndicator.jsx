export default function OnboardingIndicator({ totalSlides, currentSlide, onSelectSlide }) {
  return (
    <div
      role="tablist"
      aria-label="Onboarding slide indicators"
      className="flex items-center justify-center gap-2.5 my-2"
    >
      {Array.from({ length: totalSlides }).map((_, index) => {
        const isActive = index === currentSlide
        return (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`Go to slide ${index + 1}`}
            onClick={() => onSelectSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nocturn-bg cursor-pointer ${
              isActive
                ? 'w-8 bg-nocturn-accent shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.6)]'
                : 'w-2 bg-white/20 hover:bg-white/40'
            }`}
          />
        )
      })}
    </div>
  )
}
