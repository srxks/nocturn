import { useState, useEffect } from 'react'
import { Volume2, VolumeX, CloudRain, Waves, Radio, Wind, Sparkles } from 'lucide-react'
import {
  playAmbientSound,
  stopAmbientSound,
  setAmbientVolume,
  getCurrentAmbientSound,
  getCurrentAmbientVolume,
} from '../../services/ambientSoundService'

const SOUNDSCAPES = [
  { id: 'none', name: 'Off', icon: VolumeX },
  { id: 'rain', name: 'Rain', icon: CloudRain },
  { id: 'brown', name: 'Brown Noise', icon: Wind },
  { id: 'white', name: 'White Noise', icon: Radio },
  { id: 'binaural', name: '10Hz Alpha', icon: Sparkles },
  { id: 'waves', name: 'Ocean Waves', icon: Waves },
]

export default function AmbientSoundWidget({ compact = false }) {
  const [activeSound, setActiveSound] = useState(() => getCurrentAmbientSound() || 'none')
  const [volume, setVolume] = useState(() => getCurrentAmbientVolume() || 0.5)
  const [isOpen, setIsOpen] = useState(false)

  const handleSelectSound = (id) => {
    setActiveSound(id)
    if (id === 'none') {
      stopAmbientSound()
    } else {
      playAmbientSound(id, volume)
    }
  }

  const handleVolumeChange = (newVol) => {
    setVolume(newVol)
    setAmbientVolume(newVol)
  }

  // Cleanup on unmount if requested or keep persistent across page navigation
  useEffect(() => {
    return () => {
      // Do not stop sound on page navigate so it stays playing in the background if user wants!
    }
  }, [])

  const currentIcon = SOUNDSCAPES.find((s) => s.id === activeSound)?.icon || Volume2
  const CurrentIcon = currentIcon

  if (compact) {
    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
            activeSound !== 'none'
              ? 'bg-nocturn-accent/15 text-nocturn-accent-bright border-nocturn-accent/30'
              : 'bg-white/[0.04] text-nocturn-muted hover:text-white border-white/[0.08]'
          }`}
          title="Ambient focus soundscape"
        >
          <CurrentIcon className="w-3.5 h-3.5" />
          <span>{SOUNDSCAPES.find((s) => s.id === activeSound)?.name || 'Sound'}</span>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 bottom-full mb-2 z-50 w-56 rounded-2xl bg-[#12141c]/95 backdrop-blur-xl border border-white/15 shadow-2xl p-3 space-y-3">
              <span className="text-[11px] font-bold text-nocturn-muted uppercase tracking-wider block">
                Focus Soundscapes
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {SOUNDSCAPES.map((sound) => {
                  const Icon = sound.icon
                  const isSelected = activeSound === sound.id
                  return (
                    <button
                      key={sound.id}
                      type="button"
                      onClick={() => handleSelectSound(sound.id)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                        isSelected
                          ? 'bg-nocturn-accent/20 text-nocturn-accent-bright border border-nocturn-accent/30'
                          : 'bg-white/[0.03] text-nocturn-muted hover:text-white hover:bg-white/[0.08] border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{sound.name}</span>
                    </button>
                  )
                })}
              </div>

              {activeSound !== 'none' && (
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-nocturn-muted">
                    <span>Volume</span>
                    <span>{Math.round(volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-nocturn-accent"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm bg-nocturn-card border border-nocturn-border rounded-2xl p-3.5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide uppercase">
          <Volume2 className="w-4 h-4 text-nocturn-accent" />
          <span>Ambient Audio</span>
        </div>
        {activeSound !== 'none' && (
          <button
            type="button"
            onClick={() => handleSelectSound('none')}
            className="text-[11px] text-nocturn-muted hover:text-rose-400 transition-colors cursor-pointer"
          >
            Mute
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {SOUNDSCAPES.map((sound) => {
          const Icon = sound.icon
          const isSelected = activeSound === sound.id
          return (
            <button
              key={sound.id}
              type="button"
              onClick={() => handleSelectSound(sound.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl text-center text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'bg-nocturn-accent/15 text-nocturn-accent-bright border border-nocturn-accent/30 shadow-sm'
                  : 'bg-white/[0.02] text-nocturn-muted hover:text-white hover:bg-white/[0.06] border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 mb-1 shrink-0" />
              <span className="text-[11px] truncate w-full">{sound.name}</span>
            </button>
          )
        })}
      </div>

      {activeSound !== 'none' && (
        <div className="pt-2 border-t border-nocturn-border/60 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-nocturn-muted">
            <span>Soundscape Volume</span>
            <span className="font-mono">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-nocturn-accent"
          />
        </div>
      )}
    </div>
  )
}
