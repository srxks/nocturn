import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Plus, Minus, RotateCcw, Play, Check, AlertCircle, Save } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import {
  DEFAULT_VOCAB_SESSION_CONFIG,
  getVocabSessionConfig,
  saveVocabSessionConfig,
  getAvailableWordsCountByDifficulty,
} from '../../services/vocabService'

export default function VocabSessionConfigModal({
  isOpen,
  onClose,
  onStartSession,
  onSaveConfig,
  initialConfig = null,
}) {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [savedConfig, setSavedConfig] = useState(() => initialConfig || { ...DEFAULT_VOCAB_SESSION_CONFIG })
  const [counts, setCounts] = useState(() => initialConfig || { ...DEFAULT_VOCAB_SESSION_CONFIG })
  const [availablePool, setAvailablePool] = useState({ easy: 20, medium: 20, hard: 20 })
  const [isSaving, setIsSaving] = useState(false)

  // Load saved config & available counts when modal opens
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    async function loadData() {
      try {
        const [config, pool] = await Promise.all([
          getVocabSessionConfig(user?.id),
          getAvailableWordsCountByDifficulty(user?.id),
        ])
        if (isMounted) {
          const resolved = initialConfig || config || { ...DEFAULT_VOCAB_SESSION_CONFIG }
          setSavedConfig(resolved)
          setCounts(resolved)
          if (pool) setAvailablePool(pool)
        }
      } catch (err) {
        console.warn('[VocabSessionConfigModal] Load error:', err)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [isOpen, user?.id, initialConfig])

  // Independent numeric stepper (-1 / +1)
  const updateCount = (tier, delta) => {
    setCounts((prev) => {
      const current = prev[tier] !== undefined ? prev[tier] : 0
      const updated = Math.max(0, current + delta)
      return {
        ...prev,
        [tier]: updated,
      }
    })
  }

  // Direct typed numeric input: normalizes, rejects negative, NaN, fractions
  const setCountDirect = (tier, rawValue) => {
    if (rawValue === '') {
      setCounts((prev) => ({ ...prev, [tier]: 0 }))
      return
    }
    const parsed = parseInt(rawValue, 10)
    const normalized = isNaN(parsed) ? 0 : Math.max(0, Math.floor(parsed))
    setCounts((prev) => ({
      ...prev,
      [tier]: normalized,
    }))
  }

  // Live session word total = Easy + Medium + Hard
  const totalWords = useMemo(() => {
    const e = Math.max(0, parseInt(counts.easy, 10) || 0)
    const m = Math.max(0, parseInt(counts.medium, 10) || 0)
    const h = Math.max(0, parseInt(counts.hard, 10) || 0)
    return e + m + h
  }, [counts])

  // Check if any count exceeds the available eligible pool
  const poolWarnings = useMemo(() => {
    const warnings = []
    if (counts.easy > availablePool.easy) {
      warnings.push(`Easy: requested ${counts.easy}, available ${availablePool.easy}`)
    }
    if (counts.medium > availablePool.medium) {
      warnings.push(`Medium: requested ${counts.medium}, available ${availablePool.medium}`)
    }
    if (counts.hard > availablePool.hard) {
      warnings.push(`Hard: requested ${counts.hard}, available ${availablePool.hard}`)
    }
    return warnings
  }, [counts, availablePool])

  const hasUnsavedChanges = useMemo(() => {
    return (
      counts.easy !== savedConfig.easy ||
      counts.medium !== savedConfig.medium ||
      counts.hard !== savedConfig.hard
    )
  }, [counts, savedConfig])

  // Action: Reset configuration to default
  const handleReset = () => {
    setCounts({ ...DEFAULT_VOCAB_SESSION_CONFIG })
  }

  // Action: Cancel (discards unsaved edits and closes modal)
  const handleCancel = () => {
    setCounts(savedConfig)
    onClose()
  }

  // Action: Save Configuration (SAVING MUST NEVER START LEARNING)
  const handleSave = async () => {
    try {
      setIsSaving(true)
      const cleanConfig = {
        easy: Math.max(0, parseInt(counts.easy, 10) || 0),
        medium: Math.max(0, parseInt(counts.medium, 10) || 0),
        hard: Math.max(0, parseInt(counts.hard, 10) || 0),
      }

      await saveVocabSessionConfig(user?.id, cleanConfig)
      setSavedConfig(cleanConfig)
      addToast('Saved study session configuration', { type: 'success', duration: 2500 })

      if (onSaveConfig) {
        onSaveConfig(cleanConfig)
      }
      onClose()
    } catch (err) {
      console.error('[VocabSessionConfigModal] Save error:', err)
      addToast('Failed to save configuration', { type: 'error', duration: 3000 })
    } finally {
      setIsSaving(false)
    }
  }

  // Action: Start Learning (Starts session using the configuration)
  const handleStartLearning = async () => {
    if (totalWords <= 0) return

    const cleanConfig = {
      easy: Math.max(0, parseInt(counts.easy, 10) || 0),
      medium: Math.max(0, parseInt(counts.medium, 10) || 0),
      hard: Math.max(0, parseInt(counts.hard, 10) || 0),
      total: totalWords,
    }

    // Auto-save changes if modified
    if (hasUnsavedChanges) {
      try {
        await saveVocabSessionConfig(user?.id, cleanConfig)
        setSavedConfig(cleanConfig)
        if (onSaveConfig) onSaveConfig(cleanConfig)
      } catch (err) {
        console.warn('[VocabSessionConfigModal] Auto-save error on start:', err)
      }
    }

    if (onStartSession) {
      onStartSession(cleanConfig)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md bg-[#12141c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-nocturn-card/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent-bright shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight">Configure Study Session</h2>
              <p className="text-xs text-nocturn-muted truncate">Set independent difficulty counts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded-lg text-nocturn-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
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
                counts.easy > 0
                  ? 'bg-emerald-500/[0.06] border-emerald-500/30'
                  : 'bg-white/[0.02] border-white/[0.06] opacity-75'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                      Easy
                    </span>
                    <span className="text-[10px] text-nocturn-muted font-mono">
                      (Available: {availablePool.easy})
                    </span>
                  </div>
                  <span className="text-[11px] text-nocturn-muted block truncate">
                    High-frequency foundational words
                  </span>
                </div>

                {/* Count Stepper */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label="Decrease easy words"
                    disabled={counts.easy <= 0}
                    onClick={() => updateCount('easy', -1)}
                    className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    aria-label="Easy word count"
                    value={counts.easy}
                    onChange={(e) => setCountDirect('easy', e.target.value)}
                    className="w-12 text-center font-mono font-bold text-sm bg-nocturn-surface border border-white/10 rounded-lg py-1 text-white outline-none focus:border-emerald-400 transition-colors"
                  />
                  <button
                    type="button"
                    aria-label="Increase easy words"
                    onClick={() => updateCount('easy', 1)}
                    className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-white cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* MEDIUM TIER */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                counts.medium > 0
                  ? 'bg-amber-500/[0.06] border-amber-500/30'
                  : 'bg-white/[0.02] border-white/[0.06] opacity-75'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                      Medium
                    </span>
                    <span className="text-[10px] text-nocturn-muted font-mono">
                      (Available: {availablePool.medium})
                    </span>
                  </div>
                  <span className="text-[11px] text-nocturn-muted block truncate">
                    Core GRE academic vocabulary
                  </span>
                </div>

                {/* Count Stepper */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label="Decrease medium words"
                    disabled={counts.medium <= 0}
                    onClick={() => updateCount('medium', -1)}
                    className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    aria-label="Medium word count"
                    value={counts.medium}
                    onChange={(e) => setCountDirect('medium', e.target.value)}
                    className="w-12 text-center font-mono font-bold text-sm bg-nocturn-surface border border-white/10 rounded-lg py-1 text-white outline-none focus:border-amber-400 transition-colors"
                  />
                  <button
                    type="button"
                    aria-label="Increase medium words"
                    onClick={() => updateCount('medium', 1)}
                    className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-white cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* HARD TIER */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                counts.hard > 0
                  ? 'bg-rose-500/[0.06] border-rose-500/30'
                  : 'bg-white/[0.02] border-white/[0.06] opacity-75'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">
                      Hard
                    </span>
                    <span className="text-[10px] text-nocturn-muted font-mono">
                      (Available: {availablePool.hard})
                    </span>
                  </div>
                  <span className="text-[11px] text-nocturn-muted block truncate">
                    Advanced & nuanced GRE terms
                  </span>
                </div>

                {/* Count Stepper */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label="Decrease hard words"
                    disabled={counts.hard <= 0}
                    onClick={() => updateCount('hard', -1)}
                    className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    aria-label="Hard word count"
                    value={counts.hard}
                    onChange={(e) => setCountDirect('hard', e.target.value)}
                    className="w-12 text-center font-mono font-bold text-sm bg-nocturn-surface border border-white/10 rounded-lg py-1 text-white outline-none focus:border-rose-400 transition-colors"
                  />
                  <button
                    type="button"
                    aria-label="Increase hard words"
                    onClick={() => updateCount('hard', 1)}
                    className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-white cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Word Pool Warning Banner if requested > available */}
          {poolWarnings.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold block">Requested count exceeds available pool:</span>
                {poolWarnings.map((msg, i) => (
                  <span key={i} className="block text-[11px] text-amber-200/90 font-mono">
                    • {msg}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Instant Total Banner */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
            <span className="text-xs font-medium text-nocturn-muted">Session Word Total:</span>
            <span
              className={`text-sm font-mono font-bold px-3 py-1 rounded-lg border transition-all ${
                totalWords > 0
                  ? 'text-nocturn-accent-bright bg-nocturn-accent/15 border-nocturn-accent/30'
                  : 'text-nocturn-muted bg-white/[0.03] border-white/10'
              }`}
            >
              {totalWords} {totalWords === 1 ? 'Word' : 'Words'}
            </span>
          </div>

          {/* Unsaved Changes Indicator */}
          {hasUnsavedChanges && (
            <p className="text-[11px] text-amber-400/90 text-center font-medium">
              You have unsaved changes. Save to preserve for future sessions.
            </p>
          )}
        </div>

        {/* Footer Actions: Save Configuration, Cancel, Reset, Start Learning */}
        <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-[#11131a] flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl text-xs font-medium text-nocturn-muted hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-2 rounded-xl text-xs font-medium text-nocturn-muted hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {/* Save Configuration (Never starts learning) */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/15 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5 text-nocturn-accent" />
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>

            {/* Start Learning (Disabled when total is 0) */}
            <button
              type="button"
              disabled={totalWords <= 0}
              onClick={handleStartLearning}
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
