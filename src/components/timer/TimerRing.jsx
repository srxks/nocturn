import { motion, useReducedMotion } from 'framer-motion'

export default function TimerRing({
  remainingSeconds,
  totalSeconds,
  modeLabel,
  isRunning = false,
  isPaused = false,
  isCompleted = false,
}) {
  const prefersReducedMotion = useReducedMotion()
  const size = 300
  const strokeWidth = 7
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
      {/* Calm subtle ambient glow: stops completely when paused, very soft when running */}
      <motion.div
        animate={
          isCompleted
            ? { opacity: [0.25, 0.05], scale: [1.02, 1] }
            : isRunning && !isPaused && !prefersReducedMotion
            ? { opacity: [0.06, 0.12, 0.06] }
            : { opacity: 0.04, scale: 1 }
        }
        transition={
          isCompleted
            ? { duration: 1.2, ease: 'easeOut' }
            : isRunning && !isPaused && !prefersReducedMotion
            ? { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
        className="absolute inset-6 rounded-full bg-nocturn-accent blur-3xl pointer-events-none"
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
          stroke="var(--color-nocturn-accent, #8B5CF6)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
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
          {isPaused ? 'Paused' : modeLabel}
        </span>
      </div>
    </div>
  )
}
