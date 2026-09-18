import { useTheme } from '../../context/useTheme'

export default function TimerRing({
  remainingSeconds,
  totalSeconds,
  modeLabel,
  isRunning,
}) {
  const { uiStyle } = useTheme()
  const isAngular = uiStyle === 'angular'

  const size = 300
  const strokeWidth = isAngular ? 8 : 10
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
    <div
      className={`relative w-full max-w-[290px] sm:max-w-[320px] aspect-square mx-auto flex items-center justify-center select-none ${
        isAngular ? 'p-2 font-mono' : ''
      }`}
    >
      {/* Outer ambient glow */}
      <div
        className={`absolute inset-4 ${
          isAngular ? 'rounded-none' : 'rounded-full'
        } bg-radial from-nocturn-accent/15 via-nocturn-accent/5 to-transparent blur-2xl transition-opacity duration-700 pointer-events-none ${
          isRunning ? 'opacity-100' : 'opacity-40'
        }`}
      />

      {/* Angular HUD Corner Crosshairs & Telemetry Frame */}
      {isAngular && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-1 select-none text-[9px] text-nocturn-muted/60 font-mono">
          <div className="flex justify-between items-center">
            <span>[+] 01</span>
            <span className="text-nocturn-accent uppercase tracking-wider text-[8px]">
              {isRunning ? '// LIVE_TELEMETRY' : '// STANDBY'}
            </span>
            <span>02 [+]</span>
          </div>
          <div className="flex justify-between items-center">
            <span>[+] 03</span>
            <span className="text-nocturn-muted/40 text-[8px]">RATE: 100%</span>
            <span>04 [+]</span>
          </div>
        </div>
      )}

      {/* Circular Progress SVG */}
      <svg
        className="w-full h-full -rotate-90 transform"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-nocturn-accent-bright, #69F0AE)" />
            <stop offset="100%" stopColor="var(--color-nocturn-accent, #00E676)" />
          </linearGradient>
          <filter id="timerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Angular Outer Tick Reticle Ring */}
        {isAngular && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius + 14}
            fill="transparent"
            stroke="var(--color-nocturn-border, #18261C)"
            strokeWidth={1.5}
            strokeDasharray="4 8"
            className="opacity-70"
          />
        )}

        {/* Dark Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="var(--color-nocturn-border, #18261C)"
          strokeWidth={strokeWidth}
          className="opacity-80"
        />

        {/* Active Animated Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="url(#timerGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap={isAngular ? 'square' : 'round'}
          filter="url(#timerGlow)"
          className="transition-[stroke-dashoffset] duration-500 ease-linear"
        />
      </svg>

      {/* Center Countdown Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          aria-live="polite"
          aria-label={`Time remaining: ${formattedTime}`}
          className={`text-5xl sm:text-6xl font-bold tracking-tight text-white font-mono drop-shadow-[0_0_15px_rgba(var(--color-nocturn-accent-rgb),0.25)] ${
            isAngular ? 'tracking-wider' : ''
          }`}
        >
          {formattedTime}
        </span>
        <span
          className={`mt-2 text-xs sm:text-sm font-semibold text-nocturn-accent-bright uppercase tracking-widest bg-nocturn-surface/80 border border-nocturn-border shadow-sm ${
            isAngular
              ? 'rounded-none px-2.5 py-0.5 font-mono text-[11px] border-nocturn-accent/40 angular-chamfer-sm'
              : 'px-3 py-1 rounded-full'
          }`}
        >
          {isAngular ? `[ ${modeLabel.toUpperCase()} ]` : modeLabel}
        </span>
      </div>
    </div>
  )
}
