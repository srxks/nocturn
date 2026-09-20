/**
 * soundService.js
 *
 * Professional, calm, low-latency audio feedback synthesized purely with the Web Audio API.
 * Never requires external audio asset downloads.
 *
 * Supported sounds:
 * - Timer Start: Warm rising harmonic tone
 * - Timer Pause: Gentle descending soft blip
 * - Timer Resume: Calm confirmation chime
 * - Timer Complete: Warm multi-harmonic chord
 * - UI Click: Ultra-subtle tactile tick
 */

const STORAGE_SOUND_EFFECTS = 'nocturn_sound_effects_enabled'
const STORAGE_TIMER_SOUNDS = 'nocturn_timer_sounds_enabled'

let sharedAudioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  try {
    if (!sharedAudioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext
      if (AudioCtxClass) {
        sharedAudioCtx = new AudioCtxClass()
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {})
    }
    return sharedAudioCtx
  } catch {
    return null
  }
}

export function isSoundEffectsEnabled() {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem(STORAGE_SOUND_EFFECTS)
  return stored !== 'false'
}

export function setSoundEffectsEnabled(enabled) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_SOUND_EFFECTS, enabled ? 'true' : 'false')
}

export function isTimerSoundsEnabled() {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem(STORAGE_TIMER_SOUNDS)
  return stored !== 'false'
}

export function setTimerSoundsEnabled(enabled) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_TIMER_SOUNDS, enabled ? 'true' : 'false')
}

/**
 * Play a gentle ascending tone when starting a timer session
 */
export function playTimerStartSound() {
  if (!isTimerSoundsEnabled()) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, now) // A4
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15) // E5

    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.25)
  } catch {
    // Audio optional
  }
}

/**
 * Play a soft descending tone when pausing a timer
 */
export function playTimerPauseSound() {
  if (!isTimerSoundsEnabled()) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, now) // D5
    osc.frequency.exponentialRampToValueAtTime(392.0, now + 0.14) // G4

    gain.gain.setValueAtTime(0.06, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.2)
  } catch {
    // Audio optional
  }
}

/**
 * Play a gentle confirmation chime when resuming a timer
 */
export function playTimerResumeSound() {
  if (!isTimerSoundsEnabled()) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, now) // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12) // E5

    gain.gain.setValueAtTime(0.07, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.22)
  } catch {
    // Audio optional
  }
}

/**
 * Play a celebratory harmonic chord when timer reaches completion
 */
export function playTimerCompleteSound() {
  if (!isTimerSoundsEnabled()) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    // Harmonic triad: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
    const freqs = [523.25, 659.25, 783.99, 1046.50]

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + idx * 0.06)

      const start = now + idx * 0.06
      gain.gain.setValueAtTime(0.08, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(start)
      osc.stop(start + 0.65)
    })
  } catch {
    // Audio optional
  }
}

/**
 * Play an ultra-subtle tactile tick for key UI interactions
 */
export function playClickSound() {
  if (!isSoundEffectsEnabled()) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.03)

    gain.gain.setValueAtTime(0.03, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.04)
  } catch {
    // Audio optional
  }
}

/**
 * Play a gentle, rewarding ascending chime when a task is checked off as completed
 */
export function playTaskCompleteSound() {
  if (!isSoundEffectsEnabled()) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    // Uplifting subtle major third dyad (G5 -> B5)
    const notes = [783.99, 987.77]

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + idx * 0.05

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.045, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(start)
      osc.stop(start + 0.23)
    })
  } catch {
    // Audio optional
  }
}
