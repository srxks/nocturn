import { useContext } from 'react'
import { TimerSessionContext } from './TimerSessionContext'

export function useTimerSession() {
  const context = useContext(TimerSessionContext)
  if (!context) {
    throw new Error('useTimerSession must be used within a TimerSessionProvider')
  }
  return context
}
