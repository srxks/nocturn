import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ShieldCheck,
  Timer,
  CheckSquare,
  Flame,
  Check,
  LogOut,
  RefreshCw,
  User as UserIcon,
  ArrowRight,
  BarChart3,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { db } from '../db/db'
import { calculateProductivityStats } from '../services/statsService'
import { useAuth } from '../context/useAuth'
import { syncLocalDataToSupabase } from '../services/syncService'
import { fetchUserProfileRemote, updateUserProfileRemote } from '../lib/profile'
import { getStorageItem, setStorageItem } from '../utils/storageUtils'
import { Card, Badge, Button, Skeleton } from '../components/ui'

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

  // Live queries strictly scoped to the authenticated user's ID
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

  const isLoading = dbSessions === undefined || dbTasks === undefined

  // Load and subscribe to remote profile changes
  useEffect(() => {
    if (!user?.id) return
    let isMounted = true

    fetchUserProfileRemote(user.id)
      .then((p) => {
        if (isMounted && p?.display_name) {
          setDisplayName(p.display_name)
          setNameInput(p.display_name)
          setStorageItem('nocturn_user_name', p.display_name)
        }
      })
      .catch((err) => {
        console.warn('[Profile] Remote profile load skipped (offline/network):', err?.message || err)
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

  const sessions = useMemo(() => dbSessions || [], [dbSessions])
  const tasks = useMemo(() => dbTasks || [], [dbTasks])

  // Single source of truth calculation matching /statistics exactly
  const stats = useMemo(() => {
    return calculateProductivityStats(sessions, tasks, 'week', 0, dbActiveSession)
  }, [sessions, tasks, dbActiveSession])

  const handleSaveName = async () => {
    const trimmed = nameInput.trim()
    if (!trimmed) return

    setDisplayName(trimmed)
    setStorageItem('nocturn_user_name', trimmed)

    if (user?.id) {
      await updateUserProfileRemote(user.id, { display_name: trimmed }).catch((err) => {
        console.warn('[Profile] Remote name update deferred:', err)
      })
    }

    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleSyncNow = async () => {
    if (!user?.id) return
    setSyncing(true)
    setSyncResult(null)

    try {
      const res = await syncLocalDataToSupabase(user.id)
      if (res?.success) {
        setSyncResult({ type: 'success', text: `Sync complete (${res.synced || 0} items updated)` })
      } else {
        setSyncResult({ type: 'error', text: res?.error?.message || 'Sync failed. Offline mode active.' })
      }
    } catch (err) {
      setSyncResult({ type: 'error', text: err.message || 'Sync failed' })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncResult(null), 4000)
    }
  }

  const userEmail = user?.email || (user?.id ? 'Local Guest Session' : 'Offline Guest')
  const userInitials = (displayName || 'U').slice(0, 2).toUpperCase()

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 select-none">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <UserIcon className="w-7 h-7 text-nocturn-accent" />
          <span>Profile & Account</span>
        </h1>
        <p className="text-xs sm:text-sm text-nocturn-muted mt-1">
          Manage your personal workspace identity, cloud synchronization, and overview.
        </p>
      </div>

      {/* User Identity Card */}
      <Card className="p-6 border border-white/[0.08] rounded-2xl relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-nocturn-accent/40 via-nocturn-accent to-nocturn-accent-bright flex items-center justify-center text-black font-extrabold text-2xl shadow-[0_0_20px_rgba(var(--color-nocturn-accent-rgb),0.35)] shrink-0">
              {userInitials}
            </div>
            <div className="space-y-1 min-w-0">
              <h2 className="text-xl font-bold text-white tracking-tight truncate">
                {displayName}
              </h2>
              <p className="text-xs text-nocturn-muted font-mono truncate">{userEmail}</p>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant={user?.id ? 'accent' : 'secondary'} className="text-[10px]">
                  {user?.id ? 'Cloud Synced' : 'Guest Account'}
                </Badge>
                {user?.app_metadata?.provider && (
                  <span className="text-[10px] text-nocturn-dim capitalize">
                    via {user.app_metadata.provider}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Edit Name */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Display name"
              aria-label="Display name"
              className="bg-nocturn-surface text-white text-xs px-3 py-2 rounded-xl border border-nocturn-border outline-none focus:border-nocturn-accent w-full sm:w-48"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveName}
              disabled={!nameInput.trim() || nameInput.trim() === displayName}
              icon={isSaved ? Check : undefined}
            >
              {isSaved ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Summary Cards (Consistent with Canonical Statistics) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-nocturn-muted">
            Focus & Productivity Summary
          </h2>
          <Link
            to="/statistics"
            className="text-xs font-medium text-nocturn-accent hover:text-nocturn-accent-bright inline-flex items-center gap-1 hover:underline"
          >
            View Full Statistics <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Card 1: Total Focus */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/15 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-nocturn-muted">Total Focus</span>
              <div className="p-2 rounded-xl bg-nocturn-accent/10 text-nocturn-accent border border-nocturn-accent/20">
                <Timer className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                {isLoading ? <Skeleton className="h-8 w-16 inline-block" /> : stats.totalFocusHours}
              </span>
              <span className="text-xs font-semibold text-nocturn-muted">hours</span>
            </div>
            <p className="mt-1 text-[11px] text-nocturn-dim">
              {sessions.length} total logged sessions
            </p>
          </div>

          {/* Card 2: Tasks Completed */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/15 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-nocturn-muted">Tasks Completed</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                {isLoading ? <Skeleton className="h-8 w-16 inline-block" /> : stats.totalCompletedTasks}
              </span>
              <span className="text-xs font-semibold text-nocturn-muted">tasks</span>
            </div>
            <p className="mt-1 text-[11px] text-nocturn-dim">
              {tasks.length} total tasks tracked
            </p>
          </div>

          {/* Card 3: Current Streak */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/15 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-nocturn-muted">Current Streak</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                {isLoading ? <Skeleton className="h-8 w-16 inline-block" /> : stats.streak}
              </span>
              <span className="text-xs font-semibold text-nocturn-muted">
                {stats.streak === 1 ? 'day' : 'days'}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-nocturn-dim">
              {stats.streak > 0 ? 'Consecutive active streak' : 'Focus today to begin streak'}
            </p>
          </div>
        </div>
      </div>

      {/* Prominent Canonical Statistics Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-nocturn-accent/15 via-white/[0.03] to-white/[0.01] border border-nocturn-accent/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-nocturn-accent" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Detailed Statistics & Analytics
            </h3>
          </div>
          <p className="text-xs text-nocturn-muted max-w-lg">
            Inspect your daily distribution charts, 8-week consistency heatmap, category breakdowns, and completed session history logs.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/statistics')}
          className="shrink-0 cursor-pointer shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.3)]"
          icon={ArrowRight}
        >
          View Full Statistics
        </Button>
      </div>

      {/* Cloud Synchronization Card */}
      <Card className="p-5 border border-white/[0.08] rounded-2xl space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-nocturn-accent" /> Cloud Sync & Offline Storage
            </h3>
            <p className="text-xs text-nocturn-muted">
              Data is saved offline in local IndexedDB and automatically synced to Supabase when online.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSyncNow}
            disabled={syncing || !user?.id}
            icon={RefreshCw}
            className={syncing ? 'animate-spin' : ''}
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>

        {syncResult && (
          <div
            className={`p-3 rounded-xl text-xs ${
              syncResult.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/25 text-rose-300'
            }`}
          >
            {syncResult.text}
          </div>
        )}
      </Card>

      {/* Account Actions / Logout */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-xs text-nocturn-muted">
          Nocturn Session Identity
        </span>
        <Button
          variant="danger"
          size="sm"
          onClick={async () => {
            await signOut()
            navigate('/auth')
          }}
          icon={LogOut}
        >
          Sign Out
        </Button>
      </div>
    </div>
  )
}
