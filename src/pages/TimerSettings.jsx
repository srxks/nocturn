import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Check, Sparkles, Loader2 } from 'lucide-react'
import { useTimerSettings } from '../context/useTimerSettings'
import { useToast } from '../context/useToast'
import TimerSettingsRow from '../components/timer/TimerSettingsRow'
import { Card, Button, Switch } from '../components/ui'

const PRESETS = [
  { id: 'classic', label: 'Classic Pomodoro', desc: '25 / 5 / 15 min', focus: 25, short: 5, long: 15, sessions: 4 },
  { id: 'deep', label: 'Deep Focus', desc: '50 / 10 / 30 min', focus: 50, short: 10, long: 30, sessions: 3 },
  { id: 'ultradian', label: 'Ultradian Rhythm', desc: '90 / 20 / 30 min', focus: 90, short: 20, long: 30, sessions: 2 },
  { id: 'sprint', label: 'Quick Sprint', desc: '15 / 3 / 10 min', focus: 15, short: 3, long: 10, sessions: 4 },
]

export default function TimerSettings() {
  const navigate = useNavigate()
  const { settings, updateSettings } = useTimerSettings()
  const { addToast } = useToast()

  const [isSaving, setIsSaving] = useState(false)
  const [userHasEdited, setUserHasEdited] = useState(false)
  const [prevSettings, setPrevSettings] = useState(settings)
  const [localSettings, setLocalSettings] = useState(() => ({
    focusDuration: Number(settings?.focusDuration) || 25,
    shortBreakDuration: Number(settings?.shortBreakDuration) || 5,
    longBreakDuration: Number(settings?.longBreakDuration) || 15,
    sessions: Number(settings?.sessions) || 4,
    autoStartBreaks: Boolean(settings?.autoStartBreaks),
    autoStartPomo: Boolean(settings?.autoStartPomo),
  }))

  // Render-phase sync when context settings update from external changes (only if user hasn't edited)
  if (
    !userHasEdited && (
      settings.focusDuration !== prevSettings.focusDuration ||
      settings.shortBreakDuration !== prevSettings.shortBreakDuration ||
      settings.longBreakDuration !== prevSettings.longBreakDuration ||
      settings.sessions !== prevSettings.sessions ||
      settings.autoStartBreaks !== prevSettings.autoStartBreaks ||
      settings.autoStartPomo !== prevSettings.autoStartPomo
    )
  ) {
    setPrevSettings(settings)
    setLocalSettings({
      focusDuration: Number(settings.focusDuration) || 25,
      shortBreakDuration: Number(settings.shortBreakDuration) || 5,
      longBreakDuration: Number(settings.longBreakDuration) || 15,
      sessions: Number(settings.sessions) || 4,
      autoStartBreaks: Boolean(settings.autoStartBreaks),
      autoStartPomo: Boolean(settings.autoStartPomo),
    })
  }

  const isDirty = useMemo(() => {
    return (
      localSettings.focusDuration !== (Number(settings?.focusDuration) || 25) ||
      localSettings.shortBreakDuration !== (Number(settings?.shortBreakDuration) || 5) ||
      localSettings.longBreakDuration !== (Number(settings?.longBreakDuration) || 15) ||
      localSettings.sessions !== (Number(settings?.sessions) || 4) ||
      localSettings.autoStartBreaks !== Boolean(settings?.autoStartBreaks) ||
      localSettings.autoStartPomo !== Boolean(settings?.autoStartPomo)
    )
  }, [localSettings, settings])

  const handleChange = (key, delta, min = 1, max = 999) => {
    setUserHasEdited(true)
    setLocalSettings((prev) => {
      const current = Number(prev[key]) || min
      const nextValue = Math.min(max, Math.max(min, current + delta))
      return {
        ...prev,
        [key]: nextValue,
      }
    })
  }

  const handleDirectSet = (key, newValue, min = 1, max = 999) => {
    setUserHasEdited(true)
    const validValue = Math.min(max, Math.max(min, Number(newValue) || min))
    setLocalSettings((prev) => ({
      ...prev,
      [key]: validValue,
    }))
  }

  const handleApplyPreset = (preset) => {
    setUserHasEdited(true)
    setLocalSettings((prev) => ({
      ...prev,
      focusDuration: preset.focus,
      shortBreakDuration: preset.short,
      longBreakDuration: preset.long,
      sessions: preset.sessions,
    }))
    addToast(`Applied ${preset.label} preset`, 'info', 2500)
  }

  const handleResetToDefaults = () => {
    setUserHasEdited(true)
    setLocalSettings({
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessions: 4,
      autoStartBreaks: false,
      autoStartPomo: false,
    })
    addToast('Reset timer settings to defaults (25/5/15)', 'info', 2500)
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      await updateSettings(localSettings)
      addToast('Timer settings saved successfully', 'success', 2500)
      navigate('/timer')
    } catch (err) {
      console.error('[TimerSettings] Failed to save:', err)
      addToast('Failed to save settings. Please try again.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    navigate('/timer')
  }

  return (
    <div className="w-full space-y-6 sm:space-y-8 max-w-2xl mx-auto pb-12">
      {/* Header with Back Button */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Back to timer"
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-nocturn-muted hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Timer Settings
              </h1>
              {isDirty && (
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-nocturn-accent/15 border border-nocturn-accent/30 text-nocturn-accent-bright">
                  Unsaved
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-nocturn-muted">
              Configure focus intervals, breaks, and session cycles.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleResetToDefaults}
          icon={RotateCcw}
          className="shrink-0 text-xs"
        >
          Reset
        </Button>
      </header>

      {/* Preset Quick-Select Cards */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-nocturn-muted uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-nocturn-accent" />
          <span>Quick Presets</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {PRESETS.map((preset) => {
            const isMatch =
              localSettings.focusDuration === preset.focus &&
              localSettings.shortBreakDuration === preset.short &&
              localSettings.longBreakDuration === preset.long &&
              localSettings.sessions === preset.sessions

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isMatch
                    ? 'bg-nocturn-accent/15 border-nocturn-accent/50 text-white shadow-sm shadow-nocturn-accent/20'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] text-nocturn-muted hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold block truncate">
                    {preset.label}
                  </span>
                  {isMatch && <Check className="w-3 h-3 text-nocturn-accent-bright shrink-0 ml-1" />}
                </div>
                <span className="text-[11px] text-nocturn-muted font-mono block">
                  {preset.desc}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Settings Rows List */}
      <div className="space-y-3">
        <TimerSettingsRow
          label="Focus Duration"
          value={localSettings.focusDuration}
          unit="min"
          min={1}
          max={999}
          onChange={(val) => handleDirectSet('focusDuration', val, 1, 999)}
          onDecrease={() => handleChange('focusDuration', -1, 1, 999)}
          onIncrease={() => handleChange('focusDuration', 1, 1, 999)}
        />

        <TimerSettingsRow
          label="Short Break"
          value={localSettings.shortBreakDuration}
          unit="min"
          min={1}
          max={999}
          onChange={(val) => handleDirectSet('shortBreakDuration', val, 1, 999)}
          onDecrease={() => handleChange('shortBreakDuration', -1, 1, 999)}
          onIncrease={() => handleChange('shortBreakDuration', 1, 1, 999)}
        />

        <TimerSettingsRow
          label="Long Break"
          value={localSettings.longBreakDuration}
          unit="min"
          min={1}
          max={999}
          onChange={(val) => handleDirectSet('longBreakDuration', val, 1, 999)}
          onDecrease={() => handleChange('longBreakDuration', -1, 1, 999)}
          onIncrease={() => handleChange('longBreakDuration', 1, 1, 999)}
        />

        <TimerSettingsRow
          label="Sessions Count"
          value={localSettings.sessions}
          unit=""
          min={1}
          max={99}
          onChange={(val) => handleDirectSet('sessions', val, 1, 99)}
          onDecrease={() => handleChange('sessions', -1, 1, 99)}
          onIncrease={() => handleChange('sessions', 1, 1, 99)}
        />

        {/* Auto-start Breaks Toggle */}
        <Card className="p-4 sm:p-5">
          <Switch
            label="Auto-start Breaks"
            description="Automatically start break countdown when a focus session completes."
            checked={localSettings.autoStartBreaks}
            onChange={(checked) =>
              setLocalSettings((prev) => ({
                ...prev,
                autoStartBreaks: checked,
              }))
            }
          />
        </Card>

        {/* Auto-start Focus Toggle */}
        <Card className="p-4 sm:p-5">
          <Switch
            label="Auto-start Focus Sessions"
            description="Automatically transition back to focus after a break concludes."
            checked={localSettings.autoStartPomo}
            onChange={(checked) =>
              setLocalSettings((prev) => ({
                ...prev,
                autoStartPomo: checked,
              }))
            }
          />
        </Card>
      </div>

      {/* Bottom Save / Cancel Actions */}
      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/[0.06]">
        <Button
          variant="secondary"
          size="md"
          onClick={handleCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          disabled={isSaving}
          icon={isSaving ? Loader2 : null}
          className={isSaving ? 'animate-pulse' : ''}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
