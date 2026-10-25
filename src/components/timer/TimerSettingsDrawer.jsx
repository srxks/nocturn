import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RotateCcw, Check, Loader2, Settings } from 'lucide-react'
import { useTimerSettings } from '../../context/useTimerSettings'
import { useToast } from '../../context/useToast'
import TimerSettingsRow from './TimerSettingsRow'
import { Switch, Button } from '../ui'

const PRESETS = [
  { id: 'classic', label: 'Classic', desc: '25 / 5 / 15', focus: 25, short: 5, long: 15, sessions: 4 },
  { id: 'deep', label: 'Deep Focus', desc: '50 / 10 / 30', focus: 50, short: 10, long: 30, sessions: 3 },
  { id: 'ultradian', label: 'Ultradian', desc: '90 / 20 / 30', focus: 90, short: 20, long: 30, sessions: 2 },
  { id: 'sprint', label: 'Sprint', desc: '15 / 3 / 10', focus: 15, short: 3, long: 10, sessions: 4 },
]

export default function TimerSettingsDrawer({ isOpen, onClose }) {
  const { settings, updateSettings } = useTimerSettings()
  const { addToast } = useToast()

  const [isSaving, setIsSaving] = useState(false)
  const [prevSettings, setPrevSettings] = useState(settings)
  const [localSettings, setLocalSettings] = useState(() => ({
    focusDuration: Number(settings?.focusDuration) || 25,
    shortBreakDuration: Number(settings?.shortBreakDuration) || 5,
    longBreakDuration: Number(settings?.longBreakDuration) || 15,
    sessions: Number(settings?.sessions) || 4,
    autoStartBreaks: Boolean(settings?.autoStartBreaks),
    autoStartPomo: Boolean(settings?.autoStartPomo),
    showSessionSummary: Boolean(settings?.showSessionSummary),
  }))

  // Render-phase sync when context settings update from external changes
  if (settings !== prevSettings) {
    setPrevSettings(settings)
    setLocalSettings({
      focusDuration: Number(settings?.focusDuration) || 25,
      shortBreakDuration: Number(settings?.shortBreakDuration) || 5,
      longBreakDuration: Number(settings?.longBreakDuration) || 15,
      sessions: Number(settings?.sessions) || 4,
      autoStartBreaks: Boolean(settings?.autoStartBreaks),
      autoStartPomo: Boolean(settings?.autoStartPomo),
      showSessionSummary: Boolean(settings?.showSessionSummary),
    })
  }

  // Esc key closes drawer
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleChange = (key, delta, min = 1, max = 999) => {
    setLocalSettings((prev) => {
      const current = Number(prev[key]) || min
      const nextValue = Math.min(max, Math.max(min, current + delta))
      return { ...prev, [key]: nextValue }
    })
  }

  const handleDirectSet = (key, val, min = 1, max = 999) => {
    const num = Math.min(max, Math.max(min, Number(val) || min))
    setLocalSettings((prev) => ({ ...prev, [key]: num }))
  }

  const handleApplyPreset = (preset) => {
    setLocalSettings((prev) => ({
      ...prev,
      focusDuration: preset.focus,
      shortBreakDuration: preset.short,
      longBreakDuration: preset.long,
      sessions: preset.sessions,
    }))
    addToast(`Applied ${preset.label} preset`, 'info', 2000)
  }

  const handleResetDefaults = () => {
    setLocalSettings({
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessions: 4,
      autoStartBreaks: false,
      autoStartPomo: false,
      showSessionSummary: false,
    })
    addToast('Reset to default 25/5/15', 'info', 2000)
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      await updateSettings(localSettings)
      addToast('Timer settings saved', 'success', 2500)
      onClose()
    } catch {
      addToast('Failed to save timer settings', 'error', 3000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="relative z-10 w-full max-w-md h-full bg-[#0d0f18] border-l border-white/[0.08] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Timer Configuration</h3>
                  <p className="text-[11px] text-nocturn-muted">Intervals, rhythms & automation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-nocturn-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                aria-label="Close settings drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
              {/* Presets */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-nocturn-muted uppercase tracking-wider block">
                  Quick Presets
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-nocturn-accent/30 text-left transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-semibold text-white group-hover:text-nocturn-accent transition-colors">
                        {preset.label}
                      </div>
                      <div className="text-[10px] text-nocturn-muted font-mono mt-0.5">
                        {preset.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interval Steppers */}
              <div className="space-y-3">
                <span className="text-[11px] font-semibold text-nocturn-muted uppercase tracking-wider block">
                  Interval Durations
                </span>

                <TimerSettingsRow
                  label="Focus Session"
                  value={localSettings.focusDuration}
                  unit="min"
                  min={1}
                  max={180}
                  onChange={(val) => handleDirectSet('focusDuration', val, 1, 180)}
                  onDecrease={() => handleChange('focusDuration', -5, 1, 180)}
                  onIncrease={() => handleChange('focusDuration', 5, 1, 180)}
                />

                <TimerSettingsRow
                  label="Short Break"
                  value={localSettings.shortBreakDuration}
                  unit="min"
                  min={1}
                  max={60}
                  onChange={(val) => handleDirectSet('shortBreakDuration', val, 1, 60)}
                  onDecrease={() => handleChange('shortBreakDuration', -1, 1, 60)}
                  onIncrease={() => handleChange('shortBreakDuration', 1, 1, 60)}
                />

                <TimerSettingsRow
                  label="Long Break"
                  value={localSettings.longBreakDuration}
                  unit="min"
                  min={1}
                  max={90}
                  onChange={(val) => handleDirectSet('longBreakDuration', val, 1, 90)}
                  onDecrease={() => handleChange('longBreakDuration', -5, 1, 90)}
                  onIncrease={() => handleChange('longBreakDuration', 5, 1, 90)}
                />

                <TimerSettingsRow
                  label="Sessions to Long Break"
                  value={localSettings.sessions}
                  unit="cycles"
                  min={1}
                  max={12}
                  onChange={(val) => handleDirectSet('sessions', val, 1, 12)}
                  onDecrease={() => handleChange('sessions', -1, 1, 12)}
                  onIncrease={() => handleChange('sessions', 1, 1, 12)}
                />
              </div>

              {/* Automation Toggles */}
              <div className="space-y-3">
                <span className="text-[11px] font-semibold text-nocturn-muted uppercase tracking-wider block">
                  Automation
                </span>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-white block">Auto-Start Breaks</span>
                    <span className="text-[10px] text-nocturn-muted">Transition straight into rest</span>
                  </div>
                  <Switch
                    checked={localSettings.autoStartBreaks}
                    onChange={(checked) => setLocalSettings((p) => ({ ...p, autoStartBreaks: checked }))}
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-white block">Auto-Start Focus</span>
                    <span className="text-[10px] text-nocturn-muted">Resume work cycle immediately</span>
                  </div>
                  <Switch
                    checked={localSettings.autoStartPomo}
                    onChange={(checked) => setLocalSettings((p) => ({ ...p, autoStartPomo: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-white/[0.06] bg-[#0d0f18] flex items-center justify-between gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetDefaults}
                icon={RotateCcw}
                className="text-xs"
              >
                Reset
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  icon={isSaving ? Loader2 : Check}
                  className={isSaving ? '[&_svg]:animate-spin' : ''}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
