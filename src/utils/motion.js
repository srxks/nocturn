/**
 * Global Framer Motion variants and physics tokens for Nocturn v2
 * Fast, fluid, GPU-friendly (transform & opacity only)
 */

export const ease = [0.22, 1, 0.36, 1]

// FAST — 140–180ms for micro-interactions
export const micro = { duration: 0.15, ease }

// STANDARD — 220–260ms for cards, drawers, modals
export const standard = { duration: 0.24, ease }

// SPRING — only for hero moments (timer start, task complete)
export const spring = { type: 'spring', stiffness: 320, damping: 30, mass: 0.8 }
export const springSoft = { type: 'spring', stiffness: 220, damping: 26 }
export const softSpring = springSoft

export const pageEnter = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: standard },
  exit: { opacity: 0, y: -4, transition: { duration: 0.14, ease } },
}

export const listStagger = {
  animate: { transition: { staggerChildren: 0.03 } },
}

export const itemIn = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease } },
}

export const modal = {
  initial: { opacity: 0, scale: 0.97, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.16, ease } },
}

export const drawerRight = {
  initial: { x: '100%' },
  animate: { x: 0, transition: { type: 'spring', stiffness: 320, damping: 32 } },
  exit: { x: '100%', transition: { duration: 0.2, ease } },
}

export const drawerBottom = {
  initial: { y: '100%' },
  animate: { y: 0, transition: { type: 'spring', stiffness: 320, damping: 32 } },
  exit: { y: '100%', transition: { duration: 0.2, ease } },
}

export const drawer = drawerRight


