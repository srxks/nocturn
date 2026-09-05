export default function TimerRing({
  remainingSeconds,
  totalSeconds,
  modeLabel,
  isRunning,
}) {
  const size = 300
  const strokeWidth = 10
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius

  // Calculate progress ratio (1.0 down to 0.0)
  const progressRatio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0
  const strokeDashoffset = circumference * (1 - progressRatio)

  // Format MM:SS
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <div className="relative w-full max-w-[290px] sm:max-w-[320px] aspect-square mx-auto flex items-center justify-center select-none">
      {/* Outer ambient glow */}
      <div
        className={`absolute inset-4 rounded-full bg-radial from-nocturn-accent/15 via-nocturn-accent/5 to-transparent blur-2xl transition-opacity duration-700 pointer-events-none ${
          isRunning ? 'opacity-100' : 'opacity-40'
        }`}
      />

      {/* Circular Progress SVG */}
      <svg
        className="w-full h-full -rotate-90 transform"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="greenTimerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#69F0AE" />
            <stop offset="100%" stopColor="#00E676" />
          </linearGradient>
          <filter id="timerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Dark Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#101A13"
          strokeWidth={strokeWidth}
          className="opacity-80"
        />

        {/* Active Animated Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="url(#greenTimerGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          filter="url(#timerGlow)"
          className="transition-[stroke-dashoffset] duration-500 ease-linear"
        />
      </svg>

      {/* Center Countdown Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          aria-live="polite"
          aria-label={`Time remaining: ${formattedTime}`}
          className="text-5xl sm:text-6xl font-bold tracking-tight text-white font-mono drop-shadow-[0_0_15px_rgba(0,230,118,0.2)]"
        >
          {formattedTime}
        </span>
        <span className="mt-2 text-xs sm:text-sm font-semibold text-nocturn-accent-bright uppercase tracking-widest bg-nocturn-surface/80 px-3 py-1 rounded-full border border-nocturn-border shadow-sm">
          {modeLabel}
        </span>
      </div>
    </div>
  )
}
