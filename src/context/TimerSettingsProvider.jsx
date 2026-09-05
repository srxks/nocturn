import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ensureSeedData } from '../db/db'
import { TimerSettingsContext } from './TimerSettingsContext'

const DEFAULT_SETTINGS = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessions: 4,
}

export function TimerSettingsProvider({ children }) {
  useEffect(() => {
    ensureSeedData()
  }, [])

  const dbSettings = useLiveQuery(async () => {
    const record = await db.timerSettings.get('default')
    return record || DEFAULT_SETTINGS
  }, [])

  const settings = dbSettings || DEFAULT_SETTINGS

  const updateSettings = async (newSettings) => {
    const updated = { ...settings, ...newSettings, id: 'default' }
    await db.timerSettings.put(updated)
  }

  return (
    <TimerSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </TimerSettingsContext.Provider>
  )
}
