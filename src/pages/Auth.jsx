import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Mail, Lock, User, ArrowRight, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/useAuth'

export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const fromPath = location.state?.from?.pathname || '/tasks'

  useEffect(() => {
    if (user) {
      navigate(fromPath, { replace: true })
    }
  }, [user, navigate, fromPath])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!email || !password) {
      setErrorMsg('Please provide both email and password.')
      return
    }

    if (isSignUp && !fullName.trim()) {
      setErrorMsg('Please provide your name.')
      return
    }

    setLoading(true)

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, fullName)
        setSuccessMsg('Account created successfully! Check your email to confirm registration or sign in.')
      } else {
        await signInWithEmail(email, password)
        navigate(fromPath, { replace: true })
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setErrorMsg(null)
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setErrorMsg(err.message || 'Google OAuth sign in failed.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-nocturn-bg text-nocturn-text flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-nocturn-accent selection:text-black">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-nocturn-card border border-nocturn-border rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.9)] space-y-6"
      >
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent mx-auto shadow-[0_0_20px_rgba(var(--color-nocturn-accent-rgb),0.3)]">
            <Zap className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Nocturn
          </h1>
          <p className="text-xs sm:text-sm text-nocturn-muted">
            {isSignUp ? 'Create your Nocturn account' : 'Sign in to sync your workspace'}
          </p>
        </div>

        {/* Tab Toggle: Sign In / Sign Up */}
        <div className="flex bg-white/5 border border-nocturn-border rounded-2xl p-1">
          <button
            onClick={() => {
              setIsSignUp(false)
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              !isSignUp
                ? 'bg-nocturn-accent text-black shadow-[0_0_10px_rgba(var(--color-nocturn-accent-rgb),0.3)]'
                : 'text-nocturn-muted hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsSignUp(true)
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              isSignUp
                ? 'bg-nocturn-accent text-black shadow-[0_0_10px_rgba(var(--color-nocturn-accent-rgb),0.3)]'
                : 'text-nocturn-muted hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-nocturn-muted">Display Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-nocturn-muted" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.02] border border-nocturn-border/80 rounded-2xl text-sm text-white placeholder:text-nocturn-muted focus:outline-none focus:border-nocturn-accent transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-nocturn-muted">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-nocturn-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full pl-10 pr-4 py-3 bg-white/[0.02] border border-nocturn-border/80 rounded-2xl text-sm text-white placeholder:text-nocturn-muted focus:outline-none focus:border-nocturn-accent transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-nocturn-muted">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-nocturn-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-white/[0.02] border border-nocturn-border/80 rounded-2xl text-sm text-white placeholder:text-nocturn-muted focus:outline-none focus:border-nocturn-accent transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-nocturn-accent text-black font-bold text-sm hover:bg-nocturn-accent-bright shadow-[0_0_20px_rgba(var(--color-nocturn-accent-rgb),0.4)] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-nocturn-border/60" />
          <span className="absolute bg-nocturn-card px-3 text-[11px] font-medium text-nocturn-muted">
            OR
          </span>
        </div>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-nocturn-border text-white text-xs font-semibold transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Guest Mode Link */}
        <div className="text-center pt-2">
          <button
            onClick={() => navigate('/tasks')}
            className="text-xs text-nocturn-muted hover:text-white transition-colors"
          >
            Continue as Guest (Local Offline Mode) →
          </button>
        </div>
      </motion.div>
    </div>
  )
}
