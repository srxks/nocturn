import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Volume2,
  VolumeX,
  CloudRain,
  Waves,
  Radio,
  Wind,
  Sparkles,
  Sliders,
} from 'lucide-react'
import {
  toggleStem,
  getActiveStems,
  setStemVolume,
  getStemVolumes,
  setMasterVolume,
  getMasterVolume,
  toggleMasterMute,
  isMasterMuted,
  stopAllAmbientSounds,
  subscribeAmbientState,
} from '../../services/ambientSoundService'

const SOUND_STEMS = [
  { id: 'rain', name: 'Rain', icon: CloudRain, desc: 'Layered pink noise' },
  { id: 'brown', name: 'Brown Noise', icon: Wind, desc: 'Deep warm rumble (-6dB/oct)' },
  { id: 'white', name: 'White Noise', icon: Radio, desc: 'Crisp focus mask' },
  { id: 'binaural', name: '10Hz Alpha', icon: Sparkles, desc: 'Binaural flow wave' },
  { id: 'waves', name: 'Ocean Waves', icon: Waves, desc: 'Swell oscillation' },
]

function EqualizerBars({ active = true }) {
  return (
    <div className="flex items-end gap-[2px] h-3 px-1" aria-hidden="true">
      <span className={`w-[2.5px] rounded-full ${active ? 'bg-nocturn-accent-bright animate-soundwave-1' : 'bg-white/20 h-1'}`} />
      <span className={`w-[2.5px] rounded-full ${active ? 'bg-nocturn-accent-bright animate-soundwave-2' : 'bg-white/20 h-1'}`} />
      <span className={`w-[2.5px] rounded-full ${active ? 'bg-nocturn-accent-bright animate-soundwave-3' : 'bg-white/20 h-1'}`} />
      <span className={`w-[2.5px] rounded-full ${active ? 'bg-nocturn-accent-bright animate-soundwave-4' : 'bg-white/20 h-1'}`} />
    </div>
  )
}

export default function AmbientSoundWidget({ compact = false }) {
  const [activeStems, setActiveStems] = useState(() => getActiveStems())
  const [stemVols, setStemVols] = useState(() => getStemVolumes())
  const [masterVol, setMasterVol] = useState(() => getMasterVolume())
  const [muted, setMuted] = useState(() => isMasterMuted())
  const [isOpen, setIsOpen] = useState(false)
  const [showMixer, setShowMixer] = useState(false)

  // Subscribe to service state changes
  useEffect(() => {
    const unsubscribe = subscribeAmbientState((state) => {
      setActiveStems(state.activeStems)
      setStemVols(state.stemVolumes)
      setMasterVol(state.masterVolume)
      setMuted(state.isMuted)
    })
    return () => unsubscribe()
  }, [])

  // Global [M] hotkey listener to toggle mute
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        toggleMasterMute()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const hasActiveStems = activeStems.length > 0
  const isPlaying = hasActiveStems && !muted

  const handleToggleStem = (stemId) => {
    toggleStem(stemId)
  }

  const handleStemVolume = (stemId, val) => {
    setStemVolume(stemId, val)
  }

  const handleMasterVolume = (val) => {
    setMasterVolume(val)
  }

  // ── COMPACT MODE (Headers / Popovers) ──
  if (compact) {
    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
            isPlaying
              ? 'bg-nocturn-accent/15 text-nocturn-accent-bright border-nocturn-accent/30'
              : 'bg-white/[0.04] text-nocturn-muted hover:text-white border-white/[0.07]'
          }`}
          title="Multi-stem focus soundscapes (Press [M] to mute)"
        >
          {muted || !hasActiveStems ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-nocturn-accent" />
          )}
          <span>
            {hasActiveStems
              ? `${activeStems.length} ${activeStems.length === 1 ? 'Stem' : 'Stems'}`
              : 'Sound'}
          </span>
          {isPlaying && <EqualizerBars active={true} />}
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 bottom-full mb-2 z-50 w-72 rounded-2xl bg-[#121520]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-nocturn-muted uppercase tracking-wider block">
                  Soundscape Mixer
                </span>
                <button
                  type="button"
                  onClick={toggleMasterMute}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-nocturn-muted hover:text-white transition-colors cursor-pointer"
                >
                  <kbd className="px-1 py-0.5 rounded bg-white/[0.08] border border-white/10 text-[10px]">M</kbd>
                  <span>{muted ? 'Unmute' : 'Mute'}</span>
                </button>
              </div>

              {/* Stem buttons grid */}
              <div className="space-y-1">
                {SOUND_STEMS.map((stem) => {
                  const Icon = stem.icon
                  const active = activeStems.includes(stem.id)
                  return (
                    <button
                      key={stem.id}
                      type="button"
                      onClick={() => handleToggleStem(stem.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        active
                          ? 'bg-nocturn-accent/20 text-white border border-nocturn-accent/35 shadow-xs'
                          : 'bg-white/[0.02] text-nocturn-muted hover:text-white hover:bg-white/[0.06] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${active ? 'text-nocturn-accent-bright' : 'text-nocturn-muted'}`} />
                        <span>{stem.name}</span>
                      </div>
                      {active && isPlaying && <EqualizerBars active={true} />}
                    </button>
                  )
                })}
              </div>

              {/* Master Volume */}
              <div className="pt-2 border-t border-white/[0.08] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-nocturn-muted">
                  <span>Master Volume</span>
                  <span className="font-mono tabular-nums">{Math.round(masterVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={masterVol}
                  onChange={(e) => handleMasterVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-nocturn-accent"
                />
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── FULL SOUNDSCAPE DOCK (In /timer right pane or mobile bottom) ──
  return (
    <div className="w-full bg-[#121520]/80 backdrop-blur-xl border border-white/[0.07] rounded-2xl p-4 shadow-sm space-y-3.5">
      {/* Header with Title & Master Mute Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent">
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-wide block uppercase">
              Soundscape Mixer
            </span>
            <span className="text-[10px] text-nocturn-dim">
              {hasActiveStems ? `${activeStems.length} active stem${activeStems.length > 1 ? 's' : ''}` : 'Layer offline stems'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveStems && (
            <button
              type="button"
              onClick={stopAllAmbientSounds}
              className="text-[11px] text-nocturn-muted hover:text-rose-400 transition-colors cursor-pointer px-1.5 py-0.5 rounded"
              title="Stop all stems"
            >
              Stop All
            </button>
          )}

          <button
            type="button"
            onClick={toggleMasterMute}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer border ${
              muted
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-white/[0.04] text-nocturn-muted hover:text-white border-white/[0.08]'
            }`}
            title="Press [M] anytime to mute"
          >
            <kbd className="text-[10px] px-1 py-0.2 rounded bg-white/[0.08] border border-white/10">M</kbd>
            <span>{muted ? 'Muted' : 'Mute'}</span>
          </button>
        </div>
      </div>

      {/* Multi-Stem Interactive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SOUND_STEMS.map((stem) => {
          const Icon = stem.icon
          const active = activeStems.includes(stem.id)

          return (
            <button
              key={stem.id}
              type="button"
              onClick={() => handleToggleStem(stem.id)}
              className={`flex flex-col items-start justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer relative overflow-hidden group border ${
                active
                  ? 'bg-nocturn-accent/15 text-white border-nocturn-accent/40 shadow-xs'
                  : 'bg-white/[0.02] text-nocturn-muted hover:text-white hover:bg-white/[0.05] border-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <Icon className={`w-4 h-4 ${active ? 'text-nocturn-accent-bright' : 'text-nocturn-muted group-hover:text-white'}`} />
                {active && (
                  <div className="flex items-center gap-1">
                    {isPlaying && <EqualizerBars active={true} />}
                    <span className="w-1.5 h-1.5 rounded-full bg-nocturn-accent shadow-[0_0_6px_var(--color-nocturn-accent)]" />
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold block truncate w-full">{stem.name}</span>
              <span className="text-[9.5px] text-nocturn-dim truncate w-full block mt-0.5">{stem.desc}</span>
            </button>
          )
        })}
      </div>

      {/* Master Volume & Stem Mix Controls Toggle */}
      {hasActiveStems && (
        <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-nocturn-muted font-medium">Master Volume</span>
            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums text-xs text-white">
                {muted ? '0%' : `${Math.round(masterVol * 100)}%`}
              </span>
              <button
                type="button"
                onClick={() => setShowMixer((p) => !p)}
                className="inline-flex items-center gap-1 text-[11px] text-nocturn-accent hover:underline cursor-pointer"
              >
                <Sliders className="w-3 h-3" />
                <span>{showMixer ? 'Hide Mix' : 'Fine Tune'}</span>
              </button>
            </div>
          </div>

          <input
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            disabled={muted}
            value={muted ? 0 : masterVol}
            onChange={(e) => handleMasterVolume(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-nocturn-accent disabled:opacity-40"
          />

          {/* Expanded Fine-Tune Sliders for Active Stems */}
          <AnimatePresence>
            {showMixer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 pt-2 border-t border-white/[0.04]"
              >
                <span className="text-[10px] font-bold text-nocturn-dim uppercase tracking-wider block">
                  Stem Volume Balance:
                </span>
                {activeStems.map((stemId) => {
                  const stem = SOUND_STEMS.find((s) => s.id === stemId)
                  if (!stem) return null
                  const vol = stemVols[stemId] ?? 0.5

                  return (
                    <div key={stemId} className="flex items-center gap-2 text-xs">
                      <span className="w-20 truncate text-nocturn-muted text-[11px]">{stem.name}</span>
                      <input
                        type="range"
                        min="0.05"
                        max="1"
                        step="0.05"
                        value={vol}
                        onChange={(e) => handleStemVolume(stemId, parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-nocturn-accent"
                      />
                      <span className="w-8 text-right font-mono tabular-nums text-[10px] text-nocturn-dim">
                        {Math.round(vol * 100)}%
                      </span>
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
