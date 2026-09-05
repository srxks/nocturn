import { useContext } from 'react'
import { TimerSettingsContext } from './TimerSettingsContext'

export function useTimerSettings() {
  const context = useContext(TimerSettingsContext)
  if (!context) {
    throw new Error('useTimerSettings must be used within a TimerSettingsProvider')
  }
  return context
}
