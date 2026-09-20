import { Routes, Route, Navigate } from 'react-router-dom'
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
import ProtectedRoute from './components/auth/ProtectedRoute'

function AppRoutes() {
  return (
    <Routes>
      {/* Root redirects to /onboarding */}
      <Route path="/" element={<Navigate to="/onboarding" replace />} />

      {/* Standalone Onboarding & Auth routes */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/auth" element={<Auth />} />

      {/* Core app routes wrapped in AppShell with ProtectedRoute */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/timer" element={<Timer />} />
        <Route path="/timer-settings" element={<TimerSettings />} />
        <Route path="/plan" element={<PlanMyDay />} />
        <Route path="/plan-my-day" element={<Navigate to="/plan" replace />} />
        <Route path="/vocab" element={<Vocab />} />
        <Route path="/vocab/learn" element={<VocabLearn />} />
        <Route path="/vocab/review" element={<VocabReview />} />
        <Route path="/vocab/list" element={<VocabList />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/stats" element={<Profile />} />
      </Route>

      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/onboarding" replace />} />
    </Routes>
  )
}

export default AppRoutes
