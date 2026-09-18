import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ShieldCheck, Timer, CheckSquare, Flame, Check, ChevronLeft, ChevronRight, Calendar, BarChart2, LogOut, RefreshCw, User as UserIcon } from 'lucide-react'
import { db } from '../db/db'
import { calculateProductivityStats } from '../services/statsService'
import { useAuth } from '../context/useAuth'
import { syncLocalDataToSupabase } from '../services/syncService'
import { fetchUserFocusSessions } from '../lib/timer'
import { fetchUserProfileRemote, updateUserProfileRemote } from '../lib/profile'
import { getStorageItem, setStorageItem } from '../utils/storageUtils'

export default function Profile() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  const [displayName, setDisplayName] = useState(() => {
    return user?.user_metadata?.full_name || getStorageItem('nocturn_user_name', 'Nocturn User')
  })
  const [nameInput, setNameInput] = useState(() => {
    return user?.user_metadata?.full_name || getStorageItem('nocturn_user_name', 'Nocturn User')
  })
  const [isSaved, setIsSaved] = useState(false)

  // Period Filters State (Week | Month | Year)
  const [period, setPeriod] = useState('week')
  const [periodOffset, setPeriodOffset] = useState(0)

  // Safe Live Queries strictly scoped to the authenticated user's ID
  const dbSessions = useLiveQuery(async () => {
    if (!db || !db.pomodoroSessions) return []
    if (user?.id) {
      return await db.pomodoroSessions.where('userId').equals(user.id).toArray()
    }
    return await db.pomodoroSessions.toArray()
  }, [user?.id])

  const dbTasks = useLiveQuery(async () => {
    if (!db || !db.tasks) return []
    if (user?.id) {
      const all = await db.tasks.toArray()
      return all.filter((t) => t.userId === user.id)
    }
    return await db.tasks.toArray()
  }, [user?.id])

  const dbActiveSession = useLiveQuery(async () => {
    if (!db || !db.activeSessions) return null
    return await db.activeSessions.get('active')
  }, [])

  // Load remote focus sessions from Supabase on mount / login
  useEffect(() => {
    if (!user?.id) return
    let isMounted = true

    async function loadRemoteSessions() {
      try {
        const remoteSessions = await fetchUserFocusSessions(user.id)
        if (isMounted && Array.isArray(remoteSessions)) {
          for (const s of remoteSessions) {
            await db.pomodoroSessions.put({
              id: s.id,
              userId: s.user_id,
              taskId: s.task_id || null,
              startedAt: s.started_at || s.start_time || s.created_at,
              completedAt: s.ended_at || s.end_time || s.created_at,
              duration: Math.round((s.duration_seconds || 1500) / 60),
              durationSeconds: s.duration_seconds || 1500,
              sessionType: 'focus',
              completed: s.completed,
            })
          }
        }
      } catch (err) {
        console.warn('[Profile] Failed to fetch remote focus sessions:', err)
      }
    }

    loadRemoteSessions()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  // Load and subscribe to remote profile changes
  useEffect(() => {
    if (!user?.id) return
    let isMounted = true

    fetchUserProfileRemote(user.id).then((p) => {
      if (isMounted && p?.display_name) {
        setDisplayName(p.display_name)
        setNameInput(p.display_name)
        setStorageItem('nocturn_user_name', p.display_name)
      }
    })

    const handleProfileUpdated = (e) => {
      if (e.detail?.display_name) {
        setDisplayName(e.detail.display_name)
        setNameInput(e.detail.display_name)
      }
    }
    window.addEventListener('nocturn:profile-updated', handleProfileUpdated)

    return () => {
      isMounted = false
      window.removeEventListener('nocturn:profile-updated', handleProfileUpdated)
    }
  }, [user?.id])

  const sessions = dbSessions || []
  const tasks = dbTasks || []

  const stats = calculateProductivityStats(sessions, tasks, period, periodOffset, dbActiveSession)

  const handleSaveName = async (e) => {
    e.preventDefault()
    const trimmed = nameInput.trim()
    if (!trimmed) return

    setDisplayName(trimmed)
    setStorageItem('nocturn_user_name', trimmed)
    setIsSaved(true)

    if (user?.id) {
      await updateUserProfileRemote(user.id, { display_name: trimmed })
    }

    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleSyncData = async () => {
    if (!user) return
    setSyncing(true)
    setSyncResult(null)
    const result = await syncLocalDataToSupabase(user.id)
    setSyncing(false)
    if (result.success) {
      setSyncResult(`Synced ${result.synced} items to Supabase`)
    } else {
      setSyncResult(`Sync notice: ${result.error || 'Check network connection'}`)
    }
  }

  // Get initials for avatar
  const initials =
    (user?.email || displayName)
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'NU'

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Header Section */}
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Profile
        </h1>
        <p className="text-xs sm:text-sm text-nocturn-muted">
          Your productivity profile & authentication status.
        </p>
      </header>

      {/* Main Profile & Supabase Auth Card */}
      <div className="nocturn-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-nocturn-border">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-nocturn-accent/15 border-2 border-nocturn-accent/40 flex items-center justify-center font-bold text-lg text-nocturn-accent-bright shadow-[0_0_20px_rgba(var(--color-nocturn-accent-rgb),0.25)] shrink-0">
            {initials}
          </div>

          {/* User Display Info */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {displayName || user?.user_metadata?.full_name || 'Nocturn User'}
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-nocturn-accent-bright bg-nocturn-accent/15 px-2 py-0.5 rounded-full border border-nocturn-accent/30">
                <ShieldCheck className="w-3 h-3 stroke-[2.5]" />
                {user ? 'Authenticated' : 'Local Offline Mode'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-nocturn-muted">
              {user ? user.email : 'Guest Mode Workspace'}
            </p>
          </div>
        </div>

        {/* Action Buttons: Sign In / Sign Out & Sync */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          {user ? (
            <>
              <button
                onClick={handleSyncData}
                disabled={syncing}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-nocturn-border transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
              <button
                onClick={() => signOut()}
                className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="px-4 py-2 rounded-xl bg-nocturn-accent text-black font-bold text-xs hover:bg-nocturn-accent-bright shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.3)] transition-colors flex items-center gap-1.5"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In / Sign Up</span>
            </button>
          )}
        </div>
      </div>

      {syncResult && (
        <div className="p-3 rounded-2xl bg-nocturn-accent/10 border border-nocturn-accent/30 text-xs text-nocturn-accent font-medium">
          {syncResult}
        </div>
      )}

      {/* Editable Name Section */}
      <section className="space-y-3">
        <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide px-1">
          Account Information
        </h2>
        <form
          onSubmit={handleSaveName}
          className="nocturn-card p-5 sm:p-6 border border-nocturn-border space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="display-name" className="text-xs sm:text-sm font-medium text-white block">
              Display Name
            </label>
            <div className="relative flex items-center">
              <input
                id="display-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
                className="w-full nocturn-input text-sm py-2.5 sm:py-3 pr-24"
              />
              <button
                type="submit"
                disabled={!nameInput.trim() || nameInput.trim() === displayName}
                className="absolute right-1.5 nocturn-btn-primary px-3.5 py-1.5 text-xs font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed inline-flex items-center gap-1"
              >
                {isSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    Saved
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-nocturn-muted">
            Display name is persisted locally in database storage.
          </p>
        </form>
      </section>

      {/* Persistent Productivity Stats Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
          <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-nocturn-accent" />
            <span>Productivity Statistics</span>
          </h2>

          {/* Period Filter Tabs (Week | Month | Year) */}
          <div className="flex items-center gap-1 bg-nocturn-surface p-1 rounded-xl border border-nocturn-border">
            {['week', 'month', 'year'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPeriod(p)
                  setPeriodOffset(0)
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  period === p
                    ? 'bg-nocturn-accent text-black shadow-sm'
                    : 'text-nocturn-muted hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Global Summary Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="nocturn-card p-4 sm:p-5 border border-nocturn-border flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-nocturn-surface border border-nocturn-border flex items-center justify-center text-nocturn-accent shrink-0">
              <Timer className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-xs text-nocturn-muted block font-medium">Total Focus</span>
              <span className="text-lg sm:text-xl font-bold font-mono text-white">
                {stats.totalFocusHours} <span className="text-xs font-normal text-nocturn-muted">hrs</span>
              </span>
            </div>
          </div>

          <div className="nocturn-card p-4 sm:p-5 border border-nocturn-border flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-nocturn-surface border border-nocturn-border flex items-center justify-center text-nocturn-accent shrink-0">
              <Timer className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-xs text-nocturn-muted block font-medium">Focus Sessions</span>
              <span className="text-lg sm:text-xl font-bold font-mono text-white">
                {stats.totalFocusSessionsCount}
              </span>
            </div>
          </div>

          <div className="nocturn-card p-4 sm:p-5 border border-nocturn-border flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-nocturn-surface border border-nocturn-border flex items-center justify-center text-nocturn-accent shrink-0">
              <CheckSquare className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-xs text-nocturn-muted block font-medium">Tasks Completed</span>
              <span className="text-lg sm:text-xl font-bold font-mono text-white">
                {stats.totalCompletedTasks}
              </span>
            </div>
          </div>

          <div className="nocturn-card p-4 sm:p-5 border border-nocturn-border flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-nocturn-surface border border-nocturn-border flex items-center justify-center text-nocturn-accent shrink-0">
              <Flame className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-xs text-nocturn-muted block font-medium">Current Streak</span>
              <span className="text-lg sm:text-xl font-bold font-mono text-white">
                {stats.streak} <span className="text-xs font-normal text-nocturn-muted">days</span>
              </span>
            </div>
          </div>
        </div>

        {/* Period Navigation Card */}
        <div className="nocturn-card p-4 sm:p-5 border border-nocturn-border space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-nocturn-border pb-3">
            <button
              type="button"
              onClick={() => setPeriodOffset((prev) => prev - 1)}
              className="p-2 rounded-xl bg-nocturn-surface text-nocturn-muted hover:text-white hover:border-nocturn-accent/40 border border-nocturn-border cursor-pointer flex items-center justify-center transition-colors"
              title="Previous period"
              aria-label="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white flex items-center gap-1.5 font-mono">
                <Calendar className="w-4 h-4 text-nocturn-accent shrink-0" />
                <span>{stats.periodLabel}</span>
              </span>
              {periodOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setPeriodOffset(0)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-nocturn-accent/15 text-nocturn-accent border border-nocturn-accent/30 hover:bg-nocturn-accent/25 transition-colors cursor-pointer"
                >
                  Current
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={periodOffset >= 0}
              onClick={() => setPeriodOffset((prev) => prev + 1)}
              className="p-2 rounded-xl bg-nocturn-surface text-nocturn-muted hover:text-white hover:border-nocturn-accent/40 border border-nocturn-border disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center transition-colors"
              title="Next period"
              aria-label="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-nocturn-surface/50 border border-nocturn-border/80 space-y-1">
              <span className="text-xs font-medium text-nocturn-muted block">Period Focus Duration</span>
              <span className="text-lg font-bold font-mono text-nocturn-accent">
                {stats.periodHours} hrs ({stats.periodMinutes} min)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-nocturn-surface/50 border border-nocturn-border/80 space-y-1">
              <span className="text-xs font-medium text-nocturn-muted block">Period Completed Sessions</span>
              <span className="text-lg font-bold font-mono text-white">
                {stats.periodSessionsCount} sessions
              </span>
            </div>
          </div>

          {stats.periodSessionsCount === 0 && stats.periodTasksCount === 0 && (
            <p className="text-center text-xs text-nocturn-muted py-1">
              No focus activity recorded for this period.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
