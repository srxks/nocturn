import { motion } from 'framer-motion'

export default function TimerRing({
  remainingSeconds,
  totalSeconds,
  modeLabel,
  isRunning,
}) {
  const size = 300
  const strokeWidth = 8
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius

  // Safely normalize remainingSeconds and totalSeconds
  const validRemaining =
    typeof remainingSeconds === 'number' &&
    !isNaN(remainingSeconds) &&
    isFinite(remainingSeconds) &&
    remainingSeconds >= 0
      ? remainingSeconds
      : 0
  const validTotal =
    typeof totalSeconds === 'number' &&
    !isNaN(totalSeconds) &&
    isFinite(totalSeconds) &&
    totalSeconds > 0
      ? totalSeconds
      : 1500

  // Calculate progress ratio (1.0 down to 0.0)
  const progressRatio = validTotal > 0 ? validRemaining / validTotal : 0
  const strokeDashoffset = circumference * (1 - progressRatio)

  // Format MM:SS safely
  const minutes = Math.floor(validRemaining / 60)
  const seconds = Math.floor(validRemaining % 60)
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-square mx-auto flex items-center justify-center select-none">
      {/* Calm subtle breathing ambient backdrop when active */}
      <motion.div
        animate={
          isRunning
            ? { scale: [1, 1.025, 1], opacity: [0.12, 0.25, 0.12] }
            : { scale: 1, opacity: 0.05 }
        }
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-4 rounded-full bg-nocturn-accent blur-3xl pointer-events-none"
      />

      {/* Circular Progress SVG */}
      <svg
        className="w-full h-full -rotate-90 transform"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        {/* Background Inactive Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={strokeWidth}
        />

        {/* Active Animated Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="var(--color-nocturn-accent, #6366F1)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500 ease-linear"
        />
      </svg>

      {/* Center Countdown Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          aria-live="polite"
          aria-label={`Time remaining: ${formattedTime}`}
          className="text-5xl sm:text-6xl font-semibold tracking-tight text-white font-mono tabular-nums"
        >
          {formattedTime}
        </span>
        <span className="mt-2.5 text-xs font-medium text-nocturn-muted bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-full uppercase tracking-wider">
          {modeLabel}
        </span>
      </div>
    </div>
  )
}

