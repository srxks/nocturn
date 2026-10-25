/**
 * ambientSoundService.js
 *
 * Professional multi-stem ambient focus sound generator synthesized entirely with the Web Audio API.
 * 100% offline, zero external audio asset downloads, ultra-low memory footprint.
 *
 * Supported soundscapes / stems:
 * - 'rain': Layered pink noise with soft rain filtration
 * - 'brown': Deep, warm Brownian noise (-6dB/oct) for deep work & ADHD focus
 * - 'white': Balanced gentle white noise for masking distractions
 * - 'binaural': Dual-channel 10Hz Alpha wave binaural beats (200Hz carrier)
 * - 'waves': Modulated rolling ocean swell generator
 */

let audioCtx = null
let masterGainNode = null
let masterVolume = 0.5
let isMuted = false

// Map of stemId -> { sources: Array<AudioNode>, gainNode: GainNode }
const activeStemsMap = new Map()

// Stored volumes per stem (0.0 to 1.0)
const stemVolumes = {
  rain: 0.6,
  brown: 0.5,
  white: 0.4,
  binaural: 0.5,
  waves: 0.6,
}

// Event subscribers
const listeners = new Set()

function notifyListeners() {
  const state = {
    activeStems: getActiveStems(),
    stemVolumes: { ...stemVolumes },
    masterVolume,
    isMuted,
  }
  listeners.forEach((listener) => {
    try {
      listener(state)
    } catch (e) {
      console.warn('[ambientSoundService] Listener error:', e)
    }
  })
}

export function subscribeAmbientState(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getAudioContext() {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass()
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
    return audioCtx
  } catch {
    return null
  }
}

function ensureMasterGain(ctx) {
  if (!masterGainNode && ctx) {
    masterGainNode = ctx.createGain()
    masterGainNode.gain.setValueAtTime(isMuted ? 0 : masterVolume, ctx.currentTime)
    masterGainNode.connect(ctx.destination)
  }
  return masterGainNode
}

/**
 * Generate a 5-second looped noise buffer
 */
function createNoiseBuffer(ctx, type = 'white') {
  const bufferSize = ctx.sampleRate * 5
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  if (type === 'white') {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
  } else if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
  } else if (type === 'brown') {
    let lastOut = 0.0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + 0.02 * white) / 1.02
      lastOut = data[i]
      data[i] *= 3.5 // Gain compensation
    }
  }

  return buffer
}

/**
 * Start a specific ambient stem
 */
export function startStem(stemId, initialVolume) {
  if (!stemId || stemId === 'none') return
  if (activeStemsMap.has(stemId)) return // Already active

  const ctx = getAudioContext()
  if (!ctx) return

  ensureMasterGain(ctx)

  if (typeof initialVolume === 'number') {
    stemVolumes[stemId] = Math.max(0, Math.min(1, initialVolume))
  }
  const stemVol = stemVolumes[stemId] ?? 0.5

  try {
    const stemGain = ctx.createGain()
    stemGain.gain.setValueAtTime(stemVol, ctx.currentTime)
    stemGain.connect(masterGainNode)

    const sources = []

    if (stemId === 'white' || stemId === 'brown') {
      const noiseBuffer = createNoiseBuffer(ctx, stemId)
      const noiseSource = ctx.createBufferSource()
      noiseSource.buffer = noiseBuffer
      noiseSource.loop = true

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(stemId === 'brown' ? 450 : 2800, ctx.currentTime)

      noiseSource.connect(filter)
      filter.connect(stemGain)

      noiseSource.start()
      sources.push(noiseSource)
    } else if (stemId === 'rain') {
      const rainBuffer = createNoiseBuffer(ctx, 'pink')
      const rainSource = ctx.createBufferSource()
      rainSource.buffer = rainBuffer
      rainSource.loop = true

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(1400, ctx.currentTime)

      const bandpass = ctx.createBiquadFilter()
      bandpass.type = 'bandpass'
      bandpass.frequency.setValueAtTime(800, ctx.currentTime)
      bandpass.Q.setValueAtTime(0.7, ctx.currentTime)

      rainSource.connect(filter)
      filter.connect(bandpass)
      bandpass.connect(stemGain)

      rainSource.start()
      sources.push(rainSource)
    } else if (stemId === 'binaural') {
      const leftOsc = ctx.createOscillator()
      const rightOsc = ctx.createOscillator()

      leftOsc.type = 'sine'
      rightOsc.type = 'sine'

      leftOsc.frequency.setValueAtTime(200, ctx.currentTime)
      rightOsc.frequency.setValueAtTime(210, ctx.currentTime)

      const merger = ctx.createChannelMerger(2)

      const leftGain = ctx.createGain()
      const rightGain = ctx.createGain()
      leftGain.gain.setValueAtTime(0.35, ctx.currentTime)
      rightGain.gain.setValueAtTime(0.35, ctx.currentTime)

      leftOsc.connect(leftGain)
      leftGain.connect(merger, 0, 0)

      rightOsc.connect(rightGain)
      rightGain.connect(merger, 0, 1)

      merger.connect(stemGain)

      leftOsc.start()
      rightOsc.start()
      sources.push(leftOsc, rightOsc)
    } else if (stemId === 'waves') {
      const noiseBuffer = createNoiseBuffer(ctx, 'brown')
      const noiseSource = ctx.createBufferSource()
      noiseSource.buffer = noiseBuffer
      noiseSource.loop = true

      const swellGain = ctx.createGain()
      swellGain.gain.setValueAtTime(0.2, ctx.currentTime)

      const lfo = ctx.createOscillator()
      lfo.frequency.setValueAtTime(0.12, ctx.currentTime)

      const lfoGain = ctx.createGain()
      lfoGain.gain.setValueAtTime(0.3, ctx.currentTime)

      lfo.connect(lfoGain)
      lfoGain.connect(swellGain.gain)

      noiseSource.connect(swellGain)
      swellGain.connect(stemGain)

      lfo.start()
      noiseSource.start()
      sources.push(noiseSource, lfo)
    }

    activeStemsMap.set(stemId, { sources, gainNode: stemGain })
    notifyListeners()
  } catch (err) {
    console.warn('[ambientSoundService] Failed to start stem ' + stemId + ':', err)
  }
}

/**
 * Stop a specific ambient stem
 */
export function stopStem(stemId) {
  const stem = activeStemsMap.get(stemId)
  if (!stem) return

  try {
    stem.sources.forEach((node) => {
      try {
        if (node.stop) node.stop()
        if (node.disconnect) node.disconnect()
      } catch {
        // Node already stopped
      }
    })
    if (stem.gainNode) {
      try {
        stem.gainNode.disconnect()
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.warn('[ambientSoundService] Error stopping stem ' + stemId + ':', err)
  }

  activeStemsMap.delete(stemId)
  notifyListeners()
}

/**
 * Toggle a specific ambient stem
 */
export function toggleStem(stemId) {
  if (activeStemsMap.has(stemId)) {
    stopStem(stemId)
  } else {
    startStem(stemId)
  }
}

/**
 * Check if a stem is currently playing
 */
export function isStemActive(stemId) {
  return activeStemsMap.has(stemId)
}

/**
 * Get array of all currently active stem IDs
 */
export function getActiveStems() {
  return Array.from(activeStemsMap.keys())
}

/**
 * Set individual stem volume (0.0 to 1.0)
 */
export function setStemVolume(stemId, volume) {
  const clamped = Math.max(0, Math.min(1, volume))
  stemVolumes[stemId] = clamped

  const stem = activeStemsMap.get(stemId)
  if (stem && stem.gainNode && audioCtx) {
    try {
      stem.gainNode.gain.setValueAtTime(clamped, audioCtx.currentTime)
    } catch {
      // ignore
    }
  }
  notifyListeners()
}

export function getStemVolumes() {
  return { ...stemVolumes }
}

/**
 * Set master volume (0.0 to 1.0)
 */
export function setMasterVolume(vol) {
  masterVolume = Math.max(0, Math.min(1, vol))
  if (masterGainNode && audioCtx && !isMuted) {
    try {
      masterGainNode.gain.setValueAtTime(masterVolume, audioCtx.currentTime)
    } catch {
      // ignore
    }
  }
  notifyListeners()
}

export function getMasterVolume() {
  return masterVolume
}

/**
 * Toggle master mute
 */
export function toggleMasterMute() {
  isMuted = !isMuted
  if (masterGainNode && audioCtx) {
    try {
      masterGainNode.gain.setValueAtTime(isMuted ? 0 : masterVolume, audioCtx.currentTime)
    } catch {
      // ignore
    }
  }
  notifyListeners()
  return isMuted
}

export function isMasterMuted() {
  return isMuted
}

/**
 * Stop all active ambient stems
 */
export function stopAllAmbientSounds() {
  const stems = Array.from(activeStemsMap.keys())
  stems.forEach((id) => stopStem(id))
}

// ── BACKWARD COMPATIBILITY EXPORTS ──

export function playAmbientSound(type, volume = 0.5) {
  if (!type || type === 'none') {
    stopAllAmbientSounds()
    return
  }
  // If switching single soundscape in legacy mode, stop other stems and start this one
  const stems = Array.from(activeStemsMap.keys())
  stems.forEach((id) => {
    if (id !== type) stopStem(id)
  })
  startStem(type, volume)
}

export function stopAmbientSound() {
  stopAllAmbientSounds()
}

export function setAmbientVolume(vol) {
  setMasterVolume(vol)
}

export function getCurrentAmbientSound() {
  const active = getActiveStems()
  return active.length > 0 ? active[0] : 'none'
}

export function getCurrentAmbientVolume() {
  return masterVolume
}
