import { motion, useReducedMotion } from 'framer-motion'

export default function TimerRing({
  remainingSeconds = 0,
  totalSeconds = 1500,
  elapsedSeconds = 0,
  mode = 'focus',
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

  const isNormalStopwatch = mode === 'normal_stopwatch'
  const isFocusStopwatch = mode === 'focus_stopwatch'
  const isStopwatch = isNormalStopwatch || isFocusStopwatch
  const isBreak = Boolean(modeLabel && modeLabel.toLowerCase().includes('break'))

  // ── FORMAT TIME STRINGS ──
  let formattedTime
  if (isNormalStopwatch) {
    const validElapsed = Math.max(0, Math.floor(elapsedSeconds))
    const hrs = Math.floor(validElapsed / 3600)
    const mins = Math.floor((validElapsed % 3600) / 60)
    const secs = validElapsed % 60
    formattedTime = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  } else if (isFocusStopwatch) {
    const validElapsed = Math.max(0, Math.floor(elapsedSeconds))
    const hrs = Math.floor(validElapsed / 3600)
    const mins = Math.floor((validElapsed % 3600) / 60)
    const secs = validElapsed % 60
    formattedTime = hrs > 0
      ? `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  } else {
    const validRemaining = Math.max(0, Math.floor(remainingSeconds))
    const minutes = Math.floor(validRemaining / 60)
    const seconds = Math.floor(validRemaining % 60)
    formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  // ── PROGRESS RATIO & STROKE OFFSET ──
  let progressRatio
  if (isNormalStopwatch) {
    // Continuous 60-second cycle sweep indicator
    const validElapsed = Math.max(0, elapsedSeconds)
    progressRatio = (validElapsed % 60) / 60
  } else if (isFocusStopwatch) {
    // Focus stopwatch uses a full static ring with breathing halo, not a countdown arc
    progressRatio = 1.0
  } else {
    // Standard Countdown (1.0 down to 0.0)
    const validTotal = totalSeconds > 0 ? totalSeconds : 1500
    const validRemaining = Math.max(0, remainingSeconds)
    progressRatio = validTotal > 0 ? validRemaining / validTotal : 0
  }

  const strokeDashoffset = circumference * (1 - progressRatio)
  const ringStrokeColor = isBreak ? '#10B981' : isNormalStopwatch ? '#94A3B8' : 'var(--color-nocturn-accent, #8B5CF6)'

  // ── AMBIENT BREATHING HALO CONFIGURATION ──
  // Normal Stopwatch: Still when paused or idle, subtle pulse when running
  // Focus Stopwatch: Slow breathing halo around the timer using theme accent glow; still when paused
  // Countdown: Calm ambient breathing or tick pulse
  const haloAnimate = isFocusStopwatch
    ? isRunning && !isPaused && !prefersReducedMotion
      ? { opacity: [0.12, 0.28, 0.12], scale: [1, 1.04, 1] }
      : isPaused
      ? { opacity: 0.06, scale: 1 }
      : { opacity: 0.05, scale: 1 }
    : isNormalStopwatch
    ? isRunning && !isPaused && !prefersReducedMotion
      ? { opacity: [0.06, 0.14, 0.06], scale: [1, 1.01, 1] }
      : isPaused
      ? { opacity: 0.03, scale: 1 }
      : { opacity: 0.03, scale: 1 }
    : isCompleted
    ? { opacity: [0.25, 0.05], scale: [1.02, 1] }
    : isRunning && !isPaused && !prefersReducedMotion
    ? { opacity: [0.08, 0.16, 0.08], scale: [1, 1.01, 1] }
    : !isRunning && !isPaused && !prefersReducedMotion
    ? { opacity: [0.04, 0.08, 0.04], scale: [1, 1.02, 1] }
    : { opacity: 0.04, scale: 1 }

  const haloTransition = isFocusStopwatch
    ? isRunning && !isPaused && !prefersReducedMotion
      ? { duration: 4, repeat: Infinity, ease: 'easeInOut' }
      : { duration: 0.4 }
    : isNormalStopwatch
    ? isRunning && !isPaused && !prefersReducedMotion
      ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
      : { duration: 0.3 }
    : isCompleted
    ? { duration: 1.2, ease: 'easeOut' }
    : isRunning && !isPaused && !prefersReducedMotion
    ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
    : { duration: 4, repeat: Infinity, ease: 'easeInOut' }

  return (
    <div className="relative w-full max-w-[240px] xs:max-w-[270px] sm:max-w-[310px] aspect-square mx-auto flex items-center justify-center select-none">
      {/* Restrained Ambient Glow Halo */}
      <motion.div
        animate={haloAnimate}
        transition={haloTransition}
        className={`absolute inset-6 rounded-full blur-3xl pointer-events-none ${
          isBreak
            ? 'bg-emerald-500'
            : isNormalStopwatch
            ? 'bg-slate-400'
            : 'bg-nocturn-accent'
        }`}
      />

      {/* Circular Progress SVG */}
      <svg
        className={`w-full h-full transform ${isStopwatch ? '-rotate-90' : '-rotate-90'}`}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={strokeWidth}
        />

        {/* Animated Arc / Progress Track */}
        {isFocusStopwatch ? (
          // Focus Stopwatch: Soft breathing glowing accent ring (no countdown shrink)
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={ringStrokeColor}
            strokeWidth={strokeWidth}
            strokeOpacity={isRunning ? 0.85 : 0.4}
            className="transition-opacity duration-300"
          />
        ) : (
          // Countdown or Normal Stopwatch sweep arc
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={ringStrokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset,stroke] duration-300 ease-out"
          />
        )}
      </svg>

      {/* Center Countdown or Elapsed Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          aria-live="polite"
          aria-label={`Timer display: ${formattedTime}`}
          className={`font-semibold tracking-tight text-white font-mono tabular-nums ${
            isNormalStopwatch
              ? 'text-4xl sm:text-5xl'
              : 'text-5xl sm:text-6xl'
          }`}
        >
          {formattedTime}
        </span>
        <span className="mt-2.5 text-xs font-medium text-nocturn-muted bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-full uppercase tracking-wider">
          {isPaused
            ? 'Paused'
            : isNormalStopwatch
            ? (isRunning ? 'Stopwatch' : 'Normal Stopwatch')
            : isFocusStopwatch
            ? (isRunning ? 'Focusing' : 'Focus Stopwatch')
            : modeLabel}
        </span>
      </div>
    </div>
  )
}
