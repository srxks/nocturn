import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { RefreshCw } from 'lucide-react'

export default function ProtectedRoute({ children }) {
  const { user, loading, isConfigured } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-nocturn-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-nocturn-accent animate-spin" />
          <span className="text-xs text-nocturn-muted font-medium">Verifying Session...</span>
        </div>
      </div>
    )
  }

  // If Supabase is configured and user is not logged in, redirect to /auth
  if (isConfigured && !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return children
}
