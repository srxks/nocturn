import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './AppRoutes'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeProvider'
import { TimerSettingsProvider } from './context/TimerSettingsProvider'
import { TimerSessionProvider } from './context/TimerSessionProvider'
import { TaskProvider } from './context/TaskProvider'
import { ToastProvider } from './context/ToastContext'
import GlobalOfflineBanner from './components/common/GlobalOfflineBanner'
import { cleanupLegacyLocalStorage } from './utils/storageUtils'

function App() {
  useEffect(() => {
    cleanupLegacyLocalStorage()
  }, [])

  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ThemeProvider>
            <TimerSettingsProvider>
              <TimerSessionProvider>
                <TaskProvider>
                  <GlobalOfflineBanner />
                  <AppRoutes />
                </TaskProvider>
              </TimerSessionProvider>
            </TimerSettingsProvider>
          </ThemeProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
