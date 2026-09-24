/**
 * ambientSoundService.js
 *
 * Professional ambient focus sound generator synthesized entirely with the Web Audio API.
 * 100% offline, zero external audio asset downloads, ultra-low memory footprint.
 *
 * Supported soundscapes:
 * - 'rain': Layered pink noise with soft rain filtration
 * - 'brown': Deep, warm Brownian noise (-6dB/oct) for deep work & ADHD focus
 * - 'white': Balanced gentle white noise for masking distractions
 * - 'binaural': Dual-channel 10Hz Alpha wave binaural beats (200Hz carrier)
 * - 'waves': Modulated rolling ocean swell generator
 */

let audioCtx = null
let activeSourceNodes = []
let masterGainNode = null
let currentSoundType = null
let currentVolume = 0.5

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

/**
 * Stop any currently running ambient soundscape
 */
export function stopAmbientSound() {
  try {
    activeSourceNodes.forEach((node) => {
      try {
        if (node.stop) node.stop()
        if (node.disconnect) node.disconnect()
      } catch {
        // Node already stopped
      }
    })
    activeSourceNodes = []
    if (masterGainNode) {
      try {
        masterGainNode.disconnect()
      } catch {
        // ignore
      }
      masterGainNode = null
    }
    currentSoundType = null
  } catch (err) {
    console.warn('[ambientSoundService] Error stopping audio:', err)
  }
}

/**
 * Set ambient volume (0 to 1)
 */
export function setAmbientVolume(vol) {
  currentVolume = Math.max(0, Math.min(1, vol))
  if (masterGainNode && audioCtx) {
    try {
      masterGainNode.gain.setValueAtTime(currentVolume, audioCtx.currentTime)
    } catch {
      // ignore
    }
  }
}

export function getCurrentAmbientSound() {
  return currentSoundType
}

export function getCurrentAmbientVolume() {
  return currentVolume
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
 * Start playing an ambient soundscape
 */
export function playAmbientSound(type, volume = 0.5) {
  stopAmbientSound()

  if (!type || type === 'none') {
    return
  }

  const ctx = getAudioContext()
  if (!ctx) return

  currentSoundType = type
  currentVolume = volume

  try {
    masterGainNode = ctx.createGain()
    masterGainNode.gain.setValueAtTime(volume, ctx.currentTime)
    masterGainNode.connect(ctx.destination)

    if (type === 'white' || type === 'brown') {
      const noiseBuffer = createNoiseBuffer(ctx, type)
      const noiseSource = ctx.createBufferSource()
      noiseSource.buffer = noiseBuffer
      noiseSource.loop = true

      // Mild low-pass filter for ear comfort
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(type === 'brown' ? 450 : 2800, ctx.currentTime)

      noiseSource.connect(filter)
      filter.connect(masterGainNode)

      noiseSource.start()
      activeSourceNodes.push(noiseSource)
    } else if (type === 'rain') {
      // Pink noise + lowpass + bandpass with soft lfo flutter
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
      bandpass.connect(masterGainNode)

      rainSource.start()
      activeSourceNodes.push(rainSource)
    } else if (type === 'binaural') {
      // Left ear: 200 Hz, Right ear: 210 Hz (Alpha brainwave 10 Hz difference)
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
      leftGain.connect(merger, 0, 0) // Left channel

      rightOsc.connect(rightGain)
      rightGain.connect(merger, 0, 1) // Right channel

      merger.connect(masterGainNode)

      leftOsc.start()
      rightOsc.start()

      activeSourceNodes.push(leftOsc, rightOsc)
    } else if (type === 'waves') {
      // Brownian noise with sinusoidal gain modulation (ocean swell)
      const noiseBuffer = createNoiseBuffer(ctx, 'brown')
      const noiseSource = ctx.createBufferSource()
      noiseSource.buffer = noiseBuffer
      noiseSource.loop = true

      const swellGain = ctx.createGain()
      swellGain.gain.setValueAtTime(0.2, ctx.currentTime)

      // LFO for ocean wave cycles (approx 0.12 Hz = 8.3s cycle)
      const lfo = ctx.createOscillator()
      lfo.frequency.setValueAtTime(0.12, ctx.currentTime)

      const lfoGain = ctx.createGain()
      lfoGain.gain.setValueAtTime(0.3, ctx.currentTime)

      lfo.connect(lfoGain)
      lfoGain.connect(swellGain.gain)

      noiseSource.connect(swellGain)
      swellGain.connect(masterGainNode)

      lfo.start()
      noiseSource.start()

      activeSourceNodes.push(noiseSource, lfo)
    }
  } catch (err) {
    console.warn('[ambientSoundService] Failed to start sound:', err)
  }
}
