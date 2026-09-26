import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, Sparkles, Plus, Minus, RotateCcw, Play, Check } from 'lucide-react'

export default function VocabSessionConfigModal({
  isOpen,
  onClose,
  onStartSession,
  initialConfig = {
    easy: { enabled: true, count: 3 },
    medium: { enabled: true, count: 4 },
    hard: { enabled: true, count: 3 },
  },
}) {
  const [config, setConfig] = useState(initialConfig)

  const toggleDifficulty = (tier) => {
    setConfig((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        enabled: !prev[tier].enabled,
      },
    }))
  }

  const updateCount = (tier, delta) => {
    setConfig((prev) => {
      const current = prev[tier].count || 1
      const updated = Math.min(20, Math.max(1, current + delta))
      return {
        ...prev,
        [tier]: {
          ...prev[tier],
          count: updated,
        },
      }
    })
  }

  const setCountDirect = (tier, rawValue) => {
    const val = parseInt(rawValue, 10)
    setConfig((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        count: isNaN(val) ? 0 : Math.min(20, Math.max(0, val)),
      },
    }))
  }

  const handleReset = () => {
    setConfig({
      easy: { enabled: true, count: 3 },
      medium: { enabled: true, count: 4 },
      hard: { enabled: true, count: 3 },
    })
  }

  const totalWords = useMemo(() => {
    let sum = 0
    if (config.easy.enabled) sum += config.easy.count || 0
    if (config.medium.enabled) sum += config.medium.count || 0
    if (config.hard.enabled) sum += config.hard.count || 0
    return sum
  }, [config])

  const handleStart = () => {
    if (totalWords <= 0) return
    onStartSession({
      easy: config.easy.enabled ? config.easy.count : 0,
      medium: config.medium.enabled ? config.medium.count : 0,
      hard: config.hard.enabled ? config.hard.count : 0,
      total: totalWords,
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md bg-[#12141c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-nocturn-card/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent-bright">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Configure Study Session</h2>
              <p className="text-xs text-nocturn-muted">Select difficulty distribution and word counts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-nocturn-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close configuration"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Configuration Options */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto min-h-0 flex-1">
          {/* Difficulty Tiers */}
          <div className="space-y-3">
            {/* EASY TIER */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                config.easy.enabled
                  ? 'bg-emerald-500/[0.06] border-emerald-500/30'
                  : 'bg-white/[0.02] border-white/[0.06] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    onClick={() => toggleDifficulty('easy')}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                      config.easy.enabled
                        ? 'bg-emerald-500 border-emerald-400 text-black'
                        : 'bg-white/[0.05] border-white/20 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                      Easy
                    </span>
                    <span className="text-[11px] text-nocturn-muted">High-frequency foundational words</span>
                  </div>
                </label>

                {/* Count Stepper */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={!config.easy.enabled || config.easy.count <= 1}
                    onClick={() => updateCount('easy', -1)}
                    className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-white disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    disabled={!config.easy.enabled}
                    value={config.easy.count || ''}
                    onChange={(e) => setCountDirect('easy', e.target.value)}
                    className="w-10 text-center font-mono font-bold text-xs bg-nocturn-surface border border-white/10 rounded-lg py-1 text-white outline-none focus:border-emerald-400 disabled:opacity-40"
                  />
                  <button
                    type="button"
                    disabled={!config.easy.enabled || config.easy.count >= 20}
                    onClick={() => updateCount('easy', 1)}
                    className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-white disabled:opacity-30 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* MEDIUM TIER */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                config.medium.enabled
                  ? 'bg-amber-500/[0.06] border-amber-500/30'
                  : 'bg-white/[0.02] border-white/[0.06] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    onClick={() => toggleDifficulty('medium')}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                      config.medium.enabled
                        ? 'bg-amber-400 border-amber-300 text-black'
                        : 'bg-white/[0.05] border-white/20 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                      Medium
                    </span>
                    <span className="text-[11px] text-nocturn-muted">Core GRE academic vocabulary</span>
                  </div>
                </label>

                {/* Count Stepper */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={!config.medium.enabled || config.medium.count <= 1}
                    onClick={() => updateCount('medium', -1)}
                    className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-white disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    disabled={!config.medium.enabled}
                    value={config.medium.count || ''}
                    onChange={(e) => setCountDirect('medium', e.target.value)}
                    className="w-10 text-center font-mono font-bold text-xs bg-nocturn-surface border border-white/10 rounded-lg py-1 text-white outline-none focus:border-amber-400 disabled:opacity-40"
                  />
                  <button
                    type="button"
                    disabled={!config.medium.enabled || config.medium.count >= 20}
                    onClick={() => updateCount('medium', 1)}
                    className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-white disabled:opacity-30 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* HARD TIER */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                config.hard.enabled
                  ? 'bg-rose-500/[0.06] border-rose-500/30'
                  : 'bg-white/[0.02] border-white/[0.06] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    onClick={() => toggleDifficulty('hard')}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                      config.hard.enabled
                        ? 'bg-rose-500 border-rose-400 text-white'
                        : 'bg-white/[0.05] border-white/20 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">
                      Hard
                    </span>
                    <span className="text-[11px] text-nocturn-muted">Advanced & nuanced GRE terms</span>
                  </div>
                </label>

                {/* Count Stepper */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={!config.hard.enabled || config.hard.count <= 1}
                    onClick={() => updateCount('hard', -1)}
                    className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-white disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    disabled={!config.hard.enabled}
                    value={config.hard.count || ''}
                    onChange={(e) => setCountDirect('hard', e.target.value)}
                    className="w-10 text-center font-mono font-bold text-xs bg-nocturn-surface border border-white/10 rounded-lg py-1 text-white outline-none focus:border-rose-400 disabled:opacity-40"
                  />
                  <button
                    type="button"
                    disabled={!config.hard.enabled || config.hard.count >= 20}
                    onClick={() => updateCount('hard', 1)}
                    className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-white disabled:opacity-30 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Instant Total Banner */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
            <span className="text-xs font-medium text-nocturn-muted">Session Word Total:</span>
            <span className="text-sm font-mono font-bold text-nocturn-accent-bright bg-nocturn-accent/15 px-2.5 py-0.5 rounded-lg border border-nocturn-accent/30">
              {totalWords} {totalWords === 1 ? 'Word' : 'Words'}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-[#11131a] flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl text-xs font-medium text-nocturn-muted hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-nocturn-muted hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={totalWords <= 0}
              onClick={handleStart}
              className="px-4 py-2 rounded-xl bg-nocturn-accent hover:bg-nocturn-accent-bright text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(var(--color-nocturn-accent-rgb),0.35)] flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Learning</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
