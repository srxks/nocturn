import { useState, useEffect } from 'react'
import { BookOpen, SlidersHorizontal, Check } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import VocabSessionConfigModal from '../vocab/VocabSessionConfigModal'
import {
  getVocabSessionConfig,
  DEFAULT_VOCAB_SESSION_CONFIG,
} from '../../services/vocabService'

export default function VocabSettingsCard() {
  const { user } = useAuth()
  const [sessionConfig, setSessionConfig] = useState(() => ({ ...DEFAULT_VOCAB_SESSION_CONFIG }))
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function loadConfig() {
      try {
        const cfg = await getVocabSessionConfig(user?.id)
        if (isMounted && cfg) {
          setSessionConfig(cfg)
        }
      } catch (err) {
        console.warn('[VocabSettingsCard] Failed to load config:', err)
      }
    }
    loadConfig()

    const handleUpdate = (e) => {
      if (e?.detail) setSessionConfig(e.detail)
    }
    window.addEventListener('nocturn:vocab-config-updated', handleUpdate)
    return () => {
      isMounted = false
      window.removeEventListener('nocturn:vocab-config-updated', handleUpdate)
    }
  }, [user?.id])

  const totalWords =
    (sessionConfig.easy || 0) + (sessionConfig.medium || 0) + (sessionConfig.hard || 0)

  return (
    <section className="space-y-3">
      <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide px-1">
        Vocabulary
      </h2>

      <div className="nocturn-card p-5 sm:p-6 border border-nocturn-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-nocturn-surface border border-nocturn-border flex items-center justify-center text-nocturn-accent shrink-0">
              <BookOpen className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-semibold text-white block">
                Study Session Configuration
              </span>
              <span className="text-xs text-nocturn-muted block">
                Configure your daily learning session by Easy, Medium, and Hard word counts.
              </span>
            </div>
          </div>

          {/* Current Selection Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-nocturn-accent-bright bg-nocturn-accent/15 border border-nocturn-accent/30 self-start sm:self-auto select-none">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{totalWords} {totalWords === 1 ? 'word' : 'words'} / session</span>
          </div>
        </div>

        {/* Current Distribution Breakdown & Configure Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-nocturn-border/50">
          <div className="text-xs text-nocturn-muted space-x-2">
            <span className="text-emerald-400 font-medium">{sessionConfig.easy} Easy</span>
            <span>•</span>
            <span className="text-amber-400 font-medium">{sessionConfig.medium} Medium</span>
            <span>•</span>
            <span className="text-rose-400 font-medium">{sessionConfig.hard} Hard</span>
          </div>

          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-nocturn-surface border border-nocturn-border hover:border-nocturn-accent text-white text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-nocturn-accent" />
            <span>Configure Study Session</span>
          </button>
        </div>
      </div>

      <VocabSessionConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSaveConfig={(cfg) => setSessionConfig(cfg)}
        initialConfig={sessionConfig}
      />
    </section>
  )
}
