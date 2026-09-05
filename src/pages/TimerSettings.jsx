import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTimerSettings } from '../context/useTimerSettings'
import TimerSettingsRow from '../components/timer/TimerSettingsRow'

export default function TimerSettings() {
  const navigate = useNavigate()
  const { settings, updateSettings } = useTimerSettings()

  const [localSettings, setLocalSettings] = useState({
    focusDuration: settings.focusDuration,
    shortBreakDuration: settings.shortBreakDuration,
    longBreakDuration: settings.longBreakDuration,
    sessions: settings.sessions,
  })

  const handleChange = (key, delta, min, max) => {
    setLocalSettings((prev) => {
      const current = prev[key]
      const nextValue = Math.min(max, Math.max(min, current + delta))
      return {
        ...prev,
        [key]: nextValue,
      }
    })
  }

  const handleDirectSet = (key, newValue, min, max) => {
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
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Header with Back Button */}
      <header className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Back to timer"
          className="p-2.5 rounded-2xl bg-nocturn-surface border border-nocturn-border hover:border-nocturn-accent/40 text-nocturn-muted hover:text-white transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>
        <div className="space-y-0.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Timer Settings
          </h1>
          <p className="text-xs sm:text-sm text-nocturn-muted">
            Customize your focus sessions.
          </p>
        </div>
      </header>

      {/* Settings Rows List */}
      <div className="space-y-3.5">
        <TimerSettingsRow
          label="Focus Duration"
          value={localSettings.focusDuration}
          unit="min"
          min={1}
          max={120}
          onChange={(val) => handleDirectSet('focusDuration', val, 1, 120)}
          onDecrease={() => handleChange('focusDuration', -1, 1, 120)}
          onIncrease={() => handleChange('focusDuration', 1, 1, 120)}
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
          max={120}
          onChange={(val) => handleDirectSet('longBreakDuration', val, 1, 120)}
          onDecrease={() => handleChange('longBreakDuration', -1, 1, 120)}
          onIncrease={() => handleChange('longBreakDuration', 1, 1, 120)}
        />

        <TimerSettingsRow
          label="Sessions Count"
          value={localSettings.sessions}
          unit=""
          min={1}
          max={12}
          onChange={(val) => handleDirectSet('sessions', val, 1, 12)}
          onDecrease={() => handleChange('sessions', -1, 1, 12)}
          onIncrease={() => handleChange('sessions', 1, 1, 12)}
        />
      </div>

      {/* Bottom Save / Cancel Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-nocturn-border/60">
        <button
          type="button"
          onClick={handleCancel}
          className="nocturn-btn-secondary px-6 py-2.5 text-sm font-medium cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="nocturn-btn-primary px-8 py-2.5 text-sm font-semibold shadow-[0_0_20px_rgba(0,230,118,0.35)] cursor-pointer"
        >
          Save Changes
        </button>
      </div>
    </div>
  )
}
