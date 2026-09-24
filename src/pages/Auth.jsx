import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Mail, Lock, User, ArrowRight, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/useAuth'

export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle, continueAsGuest } = useAuth()

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
    <div className="min-h-screen bg-[#07070a] text-nocturn-text flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-nocturn-accent selection:text-black relative overflow-hidden">
      {/* Ambient background glow blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-nocturn-accent/[0.07] rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="w-full max-w-md bg-white/[0.02] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-7 sm:p-9 shadow-[0_30px_70px_rgba(0,0,0,0.85)] space-y-6 relative z-10"
      >
        {/* Branding Header */}
        <div className="text-center space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent mx-auto shadow-[0_0_25px_rgba(var(--color-nocturn-accent-rgb),0.3)]">
            <Zap className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
            Nocturn
          </h1>
          <p className="text-xs sm:text-sm text-nocturn-muted">
            {isSignUp ? 'Create your Nocturn workspace' : 'Sign in to sync your workspace'}
          </p>
        </div>

        {/* Tab Toggle: Sign In / Sign Up */}
        <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1 relative">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false)
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors relative z-10 cursor-pointer ${
              !isSignUp ? 'text-black font-bold' : 'text-nocturn-muted hover:text-white'
            }`}
          >
            {!isSignUp && (
              <motion.div
                layoutId="authTabPill"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                className="absolute inset-0 bg-nocturn-accent rounded-xl shadow-[0_0_15px_rgba(var(--color-nocturn-accent-rgb),0.3)]"
              />
            )}
            <span className="relative z-10">Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true)
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors relative z-10 cursor-pointer ${
              isSignUp ? 'text-black font-bold' : 'text-nocturn-muted hover:text-white'
            }`}
          >
            {isSignUp && (
              <motion.div
                layoutId="authTabPill"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                className="absolute inset-0 bg-nocturn-accent rounded-xl shadow-[0_0_15px_rgba(var(--color-nocturn-accent-rgb),0.3)]"
              />
            )}
            <span className="relative z-10">Sign Up</span>
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
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nocturn-muted">Display Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-nocturn-muted" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.02] border border-white/[0.08] focus:border-nocturn-accent/80 focus:bg-white/[0.04] rounded-2xl text-sm text-white placeholder:text-nocturn-muted focus:outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-nocturn-muted">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-nocturn-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full pl-10 pr-4 py-3 bg-white/[0.02] border border-white/[0.08] focus:border-nocturn-accent/80 focus:bg-white/[0.04] rounded-2xl text-sm text-white placeholder:text-nocturn-muted focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-nocturn-muted">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-nocturn-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-white/[0.02] border border-white/[0.08] focus:border-nocturn-accent/80 focus:bg-white/[0.04] rounded-2xl text-sm text-white placeholder:text-nocturn-muted focus:outline-none transition-all"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-nocturn-accent text-black font-bold text-sm hover:bg-nocturn-accent-bright shadow-[0_0_20px_rgba(var(--color-nocturn-accent-rgb),0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-white/[0.08]" />
          <span className="absolute bg-[#0f1118] px-3 text-[11px] font-semibold text-nocturn-muted tracking-wider uppercase">
            or
          </span>
        </div>

        {/* Google OAuth Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-white text-xs font-semibold transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer shadow-sm"
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
        </motion.button>

        {/* Guest Mode Link */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => {
              continueAsGuest()
              navigate(fromPath, { replace: true })
            }}
            className="text-xs text-nocturn-muted hover:text-white transition-colors cursor-pointer"
          >
            Continue as Guest (Local Offline Mode) →
          </button>
        </div>
      </motion.div>
    </div>
  )
}
