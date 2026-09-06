import { useState } from 'react'
import { BookOpen, Check } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { useAuth } from '../../context/useAuth'
import { upsertUserSettings } from '../../lib/themes'
import { enqueueMutation } from '../../services/syncQueue'
import { toUuid } from '../../lib/idUtils'

const PRESET_OPTIONS = [3, 5, 10, 15, 20]

export default function VocabSettingsCard() {
  const { user } = useAuth()

  const livePrefs = useLiveQuery(async () => {
    if (!db || !db.userSettings) return null
    return await db.userSettings.get('preferences')
  }, [])

  const currentLimit = Number(livePrefs?.dailyVocabLimit) || 5
  const [customValue, setCustomValue] = useState(String(currentLimit))
  const [prevLimit, setPrevLimit] = useState(currentLimit)

  if (prevLimit !== currentLimit) {
    setPrevLimit(currentLimit)
    setCustomValue(String(currentLimit))
  }

  const handleUpdateLimit = async (newVal) => {
    const num = Math.max(1, Math.min(50, Math.floor(Number(newVal) || 5)))
    setCustomValue(String(num))

    const nowIso = new Date().toISOString()
    const updatedRecord = {
      ...(livePrefs || {}),
      id: 'preferences',
      userId: user?.id || null,
      dailyVocabLimit: num,
      updatedAt: nowIso,
    }

    await db.userSettings.put(updatedRecord)

    if (user?.id) {
      try {
        const res = await upsertUserSettings(user.id, { dailyVocabLimit: num })
        if (!res) {
          enqueueMutation('upsert', 'user_settings', {
            id: toUuid(`settings-${user.id}`),
            user_id: user.id,
            settings: { dailyVocabLimit: num },
            updated_at: nowIso,
          })
        }
      } catch {
        enqueueMutation('upsert', 'user_settings', {
          id: toUuid(`settings-${user.id}`),
          user_id: user.id,
          settings: { dailyVocabLimit: num },
          updated_at: nowIso,
        })
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nocturn:settings-updated', { detail: { dailyVocabLimit: num } })
      )
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide px-1">
        Vocabulary
      </h2>

      <div className="nocturn-card p-5 sm:p-6 border border-nocturn-border space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-nocturn-surface border border-nocturn-border flex items-center justify-center text-nocturn-accent shrink-0">
              <BookOpen className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-semibold text-white block">
                Daily Learning Goal
              </span>
              <span className="text-xs text-nocturn-muted block">
                How many new vocabulary words to generate and learn each day.
              </span>
            </div>
          </div>

          {/* Current Selection Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-nocturn-accent-bright bg-nocturn-accent/15 border border-nocturn-accent/30 self-start sm:self-auto select-none">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{currentLimit} words / day</span>
          </div>
        </div>

        {/* Preset Buttons & Custom Input */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-nocturn-border/50">
          <span className="text-xs text-nocturn-muted font-medium mr-1">Presets:</span>
          {PRESET_OPTIONS.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleUpdateLimit(val)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentLimit === val
                  ? 'bg-nocturn-accent text-black shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.35)]'
                  : 'bg-nocturn-surface text-nocturn-muted border border-nocturn-border hover:text-white hover:border-nocturn-border/80'
              }`}
            >
              {val} words
            </button>
          ))}

          {/* Custom Input */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-nocturn-muted font-medium">Custom:</span>
            <input
              type="number"
              min="1"
              max="50"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onBlur={() => handleUpdateLimit(customValue)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              className="w-16 bg-nocturn-surface text-white text-xs px-2.5 py-1.5 rounded-xl border border-nocturn-border outline-none focus:border-nocturn-accent font-mono text-center"
              aria-label="Custom daily vocabulary limit"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
