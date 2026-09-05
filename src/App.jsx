import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './AppRoutes'
import { ThemeProvider } from './context/ThemeProvider'
import { TimerSettingsProvider } from './context/TimerSettingsProvider'
import { TimerSessionProvider } from './context/TimerSessionProvider'
import { TaskProvider } from './context/TaskProvider'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <TimerSettingsProvider>
          <TimerSessionProvider>
            <TaskProvider>
              <AppRoutes />
            </TaskProvider>
          </TimerSessionProvider>
        </TimerSettingsProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
