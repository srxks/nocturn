/**
 * Global Framer Motion variants and physics tokens for Nocturn
 * Soft-out ease and tactile spring curves
 */

export const ease = [0.22, 1, 0.36, 1] // "soft-out"
export const spring = { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 }
export const softSpring = { type: 'spring', stiffness: 320, damping: 32 }

export const pageEnter = {
  initial: { opacity: 0, y: 8, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -6, filter: 'blur(6px)' },
  transition: { duration: 0.28, ease },
}

export const listStagger = {
  animate: { transition: { staggerChildren: 0.035 } },
}

export const itemIn = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease } },
}

export const modal = {
  initial: { opacity: 0, scale: 0.97, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.18 } },
}

export const drawer = {
  initial: { x: '100%' },
  animate: { x: 0, transition: softSpring },
  exit: { x: '100%', transition: { duration: 0.22, ease } },
}
