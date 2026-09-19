import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTimerSettings } from '../context/useTimerSettings'
import TimerSettingsRow from '../components/timer/TimerSettingsRow'
import { Card, Button, Switch } from '../components/ui'

export default function TimerSettings() {
  const navigate = useNavigate()
  const { settings, updateSettings } = useTimerSettings()

  const [prevSettings, setPrevSettings] = useState(settings)
  const [localSettings, setLocalSettings] = useState({
    focusDuration: settings.focusDuration,
    shortBreakDuration: settings.shortBreakDuration,
    longBreakDuration: settings.longBreakDuration,
    sessions: settings.sessions,
    autoStartBreaks: Boolean(settings.autoStartBreaks),
    autoStartPomo: Boolean(settings.autoStartPomo),
  })

  // Render-phase sync when context settings update (e.g. from remote realtime in another tab)
  if (
    settings.focusDuration !== prevSettings.focusDuration ||
    settings.shortBreakDuration !== prevSettings.shortBreakDuration ||
    settings.longBreakDuration !== prevSettings.longBreakDuration ||
    settings.sessions !== prevSettings.sessions ||
    settings.autoStartBreaks !== prevSettings.autoStartBreaks ||
    settings.autoStartPomo !== prevSettings.autoStartPomo
  ) {
    setPrevSettings(settings)
    setLocalSettings({
      focusDuration: settings.focusDuration,
      shortBreakDuration: settings.shortBreakDuration,
      longBreakDuration: settings.longBreakDuration,
      sessions: settings.sessions,
      autoStartBreaks: Boolean(settings.autoStartBreaks),
      autoStartPomo: Boolean(settings.autoStartPomo),
    })
  }

  const handleChange = (key, delta, min = 1, max = 999) => {
    setLocalSettings((prev) => {
      const current = prev[key]
      const nextValue = Math.min(max, Math.max(min, current + delta))
      return {
        ...prev,
        [key]: nextValue,
      }
    })
  }

  const handleDirectSet = (key, newValue, min = 1, max = 999) => {
    const validValue = Math.min(max, Math.max(min, newValue))
    setLocalSettings((prev) => ({
      ...prev,
      [key]: validValue,
    }))
  }

  const handleSave = () => {
    updateSettings(localSettings)
    navigate('/timer')
  }

  const handleCancel = () => {
    navigate('/timer')
  }

  return (
    <div className="w-full space-y-6 sm:space-y-8 max-w-2xl mx-auto pb-12">
      {/* Header with Back Button */}
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Back to timer"
          className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-nocturn-muted hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="space-y-0.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Timer Settings
          </h1>
          <p className="text-xs sm:text-sm text-nocturn-muted">
            Configure focus intervals, breaks, and session cycles.
          </p>
        </div>
      </header>

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
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
        >
          Save Changes
        </Button>
      </div>
    </div>
  )
}
