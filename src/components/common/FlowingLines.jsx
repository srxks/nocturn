/**
 * FlowingLines.jsx
 *
 * Distinctive Nocturn visual signature: thin, flowing curved lines representing
 * orbits, time flow, and focus trajectories.
 *
 * Designed with very low opacity, smooth bezier curves, and subtle ambient glows.
 */
export default function FlowingLines({
  className = '',
  opacity = 0.18,
  accent = 'currentColor',
  variant = 'default', // 'default' | 'orbital' | 'corner'
}) {
  if (variant === 'corner') {
    return (
      <svg
        className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
        style={{ opacity }}
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M-50,380 C80,360 160,280 220,180 C280,80 340,20 450,0"
          stroke={accent}
          strokeWidth="1.2"
          strokeDasharray="4 6"
        />
        <path
          d="M-30,420 C100,390 200,300 270,190 C340,80 400,20 500,-10"
          stroke={accent}
          strokeWidth="0.8"
        />
        <path
          d="M-10,460 C120,420 240,320 320,200 C400,80 460,20 550,-20"
          stroke={accent}
          strokeWidth="0.6"
          strokeDasharray="6 8"
        />
      </svg>
    )
  }

  if (variant === 'orbital') {
    return (
      <svg
        className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
        style={{ opacity }}
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <ellipse
          cx="300"
          cy="260"
          rx="250"
          ry="120"
          stroke={accent}
          strokeWidth="1"
          strokeDasharray="4 8"
        />
        <ellipse
          cx="300"
          cy="260"
          rx="340"
          ry="180"
          stroke={accent}
          strokeWidth="0.8"
        />
        <ellipse
          cx="300"
          cy="260"
          rx="430"
          ry="240"
          stroke={accent}
          strokeWidth="0.6"
          strokeDasharray="6 10"
        />
      </svg>
    )
  }

  // Default flowing waves
  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
      style={{ opacity }}
      viewBox="0 0 1000 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M-50,450 C180,480 320,380 500,320 C680,260 820,340 1050,220"
        stroke={accent}
        strokeWidth="1.2"
        strokeDasharray="5 7"
      />
      <path
        d="M-80,500 C150,520 300,410 490,340 C680,270 850,330 1080,200"
        stroke={accent}
        strokeWidth="0.9"
      />
      <path
        d="M-100,550 C120,560 280,440 480,360 C680,280 880,320 1100,180"
        stroke={accent}
        strokeWidth="0.6"
        strokeDasharray="4 8"
      />
    </svg>
  )
}
