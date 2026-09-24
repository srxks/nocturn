import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AppShell from './components/layout/AppShell'
import Onboarding from './pages/Onboarding'
import Auth from './pages/Auth'
import Tasks from './pages/Tasks'
import Timer from './pages/Timer'
import TimerSettings from './pages/TimerSettings'
import PlanMyDay from './pages/PlanMyDay'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import Calendar from './pages/Calendar'
import Vocab from './pages/Vocab'
import VocabLearn from './pages/VocabLearn'
import VocabReview from './pages/VocabReview'
import VocabList from './pages/VocabList'
import Statistics from './pages/Statistics'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { useAuth } from './context/useAuth'

function RootRedirect() {
  const { user, isGuest, loading } = useAuth()
  const onboardingDone =
    typeof window !== 'undefined' &&
    window.localStorage.getItem('nocturn_onboarding_completed') === 'true'

  if (loading) {
    return null
  }

  if (user || isGuest || onboardingDone) {
    return <Navigate to="/tasks?view=myday" replace />
  }

  return <Navigate to="/onboarding" replace />
}

/**
 * Shared subtle accent sweep line at the very top of the viewport on route change
 */
function RouteAccentSweep() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname + location.search}
        initial={{ scaleX: 0, opacity: 1, originX: 0 }}
        animate={{ scaleX: 1, opacity: [1, 1, 0] }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-nocturn-accent via-nocturn-accent-bright to-nocturn-accent z-[999] pointer-events-none"
      />
    </AnimatePresence>
  )
}

function AppRoutes() {
  const location = useLocation()

  return (
    <>
      <RouteAccentSweep />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Root redirect: if already onboarded or logged in, go straight to Tasks My Day */}
          <Route path="/" element={<RootRedirect />} />

          {/* Standalone Onboarding & Auth routes */}
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/signup" element={<Navigate to="/auth" replace />} />

          {/* Core app routes wrapped in AppShell with ProtectedRoute */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/today" element={<Navigate to="/tasks?view=myday" replace />} />
            <Route path="/inbox" element={<Navigate to="/tasks?view=inbox" replace />} />
            <Route path="/upcoming" element={<Navigate to="/tasks?view=upcoming" replace />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/timer" element={<Timer />} />
            <Route path="/timer-settings" element={<TimerSettings />} />
            <Route path="/plan" element={<PlanMyDay />} />
            <Route path="/plan-my-day" element={<Navigate to="/plan" replace />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/stats" element={<Navigate to="/statistics" replace />} />
            <Route path="/vocab" element={<Vocab />} />
            <Route path="/vocab/learn" element={<VocabLearn />} />
            <Route path="/vocab/review" element={<VocabReview />} />
            <Route path="/vocab/list" element={<VocabList />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Catch-all route */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}

export default AppRoutes
