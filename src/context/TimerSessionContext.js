import { createContext } from 'react'

export const TimerSessionContext = createContext({
  mode: 'focus',
  isRunning: false,
  isPaused: false,
  remainingSeconds: 1500,
  totalSeconds: 1500,
  currentSession: 1,
  taskName: '',
  setTaskName: () => {},
  startTimer: () => {},
  togglePlayPause: () => {},
  pauseTimer: () => {},
  resumeTimer: () => {},
  resetTimer: () => {},
  skipTimer: () => {},
  terminateTimer: () => {},
  startPlanSession: () => {},
})
