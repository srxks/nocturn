/* ── src/motion/presets.js ─────────────────────── */

/* ── EASING ───────────────────────────────────── */
export const ease = [0.22, 1, 0.36, 1]
export const easeIn = [0.4, 0, 1, 1]
export const easeOut = [0, 0, 0.2, 1]

/* ── TRANSITIONS ──────────────────────────────── */
export const tMicro = { duration: 0.15, ease }
export const tFast = { duration: 0.20, ease }
export const tStandard = { duration: 0.24, ease }
export const tSlow = { duration: 0.30, ease }

export const tSpring = { type: 'spring', stiffness: 320, damping: 30, mass: 0.8 }
export const tSpringSoft = { type: 'spring', stiffness: 220, damping: 26 }
export const tSpringSnap = { type: 'spring', stiffness: 420, damping: 34 }

/* ── INTERACTION WRAPPERS ─────────────────────── */
export const tap = { scale: 0.97 }
export const tapSmall = { scale: 0.94 }
export const hoverLift = { y: -1 }
export const hoverLiftBig = { y: -2 }
export const hoverScale = { scale: 1.04 }

/* ── INTERACTIVE ELEMENT PRESETS ──────────────── */
export const buttonPrimary = {
  whileHover: { y: -1, transition: tMicro },
  whileTap: { scale: 0.97, transition: tMicro },
}

export const buttonIcon = {
  whileHover: { scale: 1.06, transition: tMicro },
  whileTap: { scale: 0.92, transition: tMicro },
}

export const buttonGhost = {
  whileHover: { backgroundColor: 'rgba(255,255,255,0.04)', transition: tMicro },
  whileTap: { scale: 0.97, transition: tMicro },
}

export const chip = {
  whileHover: { y: -1, transition: tMicro },
  whileTap: { scale: 0.96, transition: tMicro },
}

export const cardHover = {
  whileHover: { y: -2, transition: tFast },
  whileTap: { scale: 0.99, transition: tMicro },
}

export const rowHover = {
  whileHover: { x: 1, transition: tMicro },
}

export const navItem = {
  whileHover: { x: 1, transition: tMicro },
  whileTap: { scale: 0.98, transition: tMicro },
}

export const swatch = {
  whileHover: { scale: 1.1, transition: tMicro },
  whileTap: { scale: 0.95, transition: tMicro },
}

/* ── PAGE / ROUTE VARIANTS ────────────────────── */
export const pageEnter = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: tStandard },
  exit: { opacity: 0, y: -4, transition: tFast },
}

export const pageFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: tStandard },
  exit: { opacity: 0, transition: tFast },
}

export const pageZen = {
  initial: { opacity: 0, scale: 1.03 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.32, ease } },
  exit: { opacity: 0, scale: 1.02, transition: { duration: 0.22, ease } },
}

/* ── LIST / STAGGER VARIANTS ──────────────────── */
export const listStagger = {
  animate: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } },
}

export const listStaggerFast = {
  animate: { transition: { staggerChildren: 0.02 } },
}

export const itemIn = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: tFast },
  exit: { opacity: 0, y: -4, transition: tMicro },
}

export const itemInX = {
  initial: { opacity: 0, x: 6 },
  animate: { opacity: 1, x: 0, transition: tFast },
}

export const itemPop = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: tSpringSoft },
}

/* ── MODAL / DRAWER / OVERLAY VARIANTS ────────── */
export const modalCenter = {
  initial: { opacity: 0, scale: 0.97, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0, transition: tSpring },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: tFast },
}

export const modalPop = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: tSpringSnap },
  exit: { opacity: 0, scale: 0.94, transition: tMicro },
}

export const drawerRight = {
  initial: { x: '100%' },
  animate: { x: 0, transition: { type: 'spring', stiffness: 320, damping: 32 } },
  exit: { x: '100%', transition: tFast },
}

export const drawerLeft = {
  initial: { x: '-100%' },
  animate: { x: 0, transition: { type: 'spring', stiffness: 320, damping: 32 } },
  exit: { x: '-100%', transition: tFast },
}

export const drawerBottom = {
  initial: { y: '100%' },
  animate: { y: 0, transition: { type: 'spring', stiffness: 320, damping: 32 } },
  exit: { y: '100%', transition: tFast },
}

export const backdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: tFast },
  exit: { opacity: 0, transition: tMicro },
}

export const toastIn = {
  initial: { opacity: 0, y: -16, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: tSpringSoft },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: tFast },
}

export const popoverFromClick = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1, transition: tSpringSoft },
  exit: { opacity: 0, scale: 0.96, transition: tMicro },
}

/* ── TIMER PRESETS ────────────────────────────── */
export const ringIdle = {
  animate: {
    scale: [1, 1.015, 1],
    transition: { duration: 4, ease: 'easeInOut', repeat: Infinity },
  },
}

export const playIconToggle = {
  playing: { rotate: 0, scale: 1, transition: tFast },
  paused: { rotate: 90, scale: 0.9, transition: tSpringSoft },
}

export const digitRoll = {
  initial: { y: '100%', opacity: 0 },
  animate: { y: 0, opacity: 1, transition: tFast },
  exit: { y: '-100%', opacity: 0, transition: tMicro },
}

export const presetPillLayout = { layoutId: 'presetPill' }
export const presetPillTransition = tSpringSoft

export const checkDraw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { pathLength: 1, opacity: 1, transition: { duration: 0.22, ease } },
}

export const confettiParticle = (angle, distance) => ({
  initial: { x: 0, y: 0, opacity: 1, scale: 1 },
  animate: {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    opacity: 0,
    scale: 0.6,
    transition: { duration: 0.6, ease },
  },
})

export const breakShift = {
  focus: { opacity: 1, transition: tSlow },
  break: { opacity: 0.85, transition: tSlow },
}

/* ── CHECKBOX / COMPLETE PRESETS ─────────────── */
export const checkboxPop = {
  whileTap: { scale: 0.9 },
  animate: { scale: [1, 1.08, 1], transition: { duration: 0.22, ease } },
}

export const checkmarkDraw = {
  hidden: { pathLength: 0 },
  visible: { pathLength: 1, transition: { duration: 0.22, ease } },
}

export const taskExit = {
  exit: { opacity: 0, x: 8, transition: tFast },
}

/* ── REORDER PRESETS ─────────────────────────── */
export const reorderItem = {
  whileDrag: {
    scale: 1.02,
    boxShadow: '0 20px 48px rgba(0,0,0,0.55)',
    transition: tMicro,
  },
  transition: tSpringSoft,
}

/* ── CHART PRESETS ───────────────────────────── */
export const barGrow = {
  initial: { scaleY: 0, originY: 1 },
  animate: { scaleY: 1, originY: 1, transition: { duration: 0.28, ease } },
}

export const heatCell = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2, ease } },
}

export const donutSegment = {
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1, transition: { duration: 0.4, ease } },
}

/* ── VOCAB FLIP CARD ─────────────────────────── */
export const flipCard = {
  front: { rotateY: 0, transition: tSpringSoft },
  back: { rotateY: 180, transition: tSpringSoft },
}

export const flipFace = {
  style: { backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' },
}

export const vocabExit = (direction) => ({
  exit: {
    x: direction === 'right' ? 320 : -320,
    opacity: 0,
    rotate: direction === 'right' ? 8 : -8,
    transition: { duration: 0.28, ease },
  },
})

export const vocabCardSwipe = {
  drag: 'x',
  dragConstraints: { left: 0, right: 0 },
  dragElastic: 0.15,
  whileDrag: { scale: 1.01 },
}
