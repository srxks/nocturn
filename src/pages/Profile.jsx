import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ShieldCheck,
  Timer,
  CheckSquare,
  Flame,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BarChart2,
  LogOut,
  RefreshCw,
  User as UserIcon,
  Clock,
} from 'lucide-react'
import { db } from '../db/db'
import {
  calculateProductivityStats,
  getSessionDurationMinutes,
  getActiveSessionMinutes,
} from '../services/statsService'
import { formatDateKey } from '../services/calendarService'
import { useAuth } from '../context/useAuth'
import { syncLocalDataToSupabase } from '../services/syncService'
import { fetchUserFocusSessions } from '../lib/timer'
import { fetchUserProfileRemote, updateUserProfileRemote } from '../lib/profile'
import { getStorageItem, setStorageItem } from '../utils/storageUtils'
import { Card, Badge, Button, Tabs } from '../components/ui'

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

  const sessions = useMemo(() => dbSessions || [], [dbSessions])
  const tasks = useMemo(() => dbTasks || [], [dbTasks])

  const stats = calculateProductivityStats(sessions, tasks, period, periodOffset, dbActiveSession)

  // Real daily activity distribution for the active week
  const weekDays = useMemo(() => {
    if (period !== 'week') return []
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + periodOffset * 7)
    startOfWeek.setHours(0, 0, 0, 0)

    const days = []
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      const key = formatDateKey(d)

      const daySessions = sessions.filter((s) => {
        const isFocus = s.sessionType === 'focus' || s.sessionType === 'focus_session'
        if (!isFocus) return false
        const dateStr = s.completedAt || s.ended_at || s.createdAt || s.created_at || s.startedAt
        return dateStr && formatDateKey(new Date(dateStr)) === key
      })

      const completedMins = daySessions.reduce((acc, s) => acc + getSessionDurationMinutes(s), 0)
      const isToday = formatDateKey(now) === key
      const activeMins = isToday && periodOffset === 0 ? getActiveSessionMinutes(dbActiveSession) : 0
      const totalMins = Math.round((completedMins + activeMins) * 10) / 10

      days.push({
        date: d,
        key,
        dayLabel: dayLabels[i],
        dateNumber: d.getDate(),
        isToday,
        minutes: totalMins,
        hours: (totalMins / 60).toFixed(1),
      })
    }
    return days
  }, [period, periodOffset, sessions, dbActiveSession])

  const maxWeekMinutes = useMemo(() => {
    if (!weekDays.length) return 60
    const highest = Math.max(...weekDays.map((d) => d.minutes))
    return Math.max(highest, 30) // Minimum 30 min scale so bars render nicely
  }, [weekDays])

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
      setSyncResult(`Synced ${result.synced} items to cloud`)
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

  const periodTabs = [
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ]

  return (
    <div className="w-full space-y-6 sm:space-y-8 pb-12">
      {/* Header Section */}
      <header className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Statistics
          </h1>
          <Badge variant="accent" size="sm">
            Live Insights
          </Badge>
        </div>
        <p className="text-xs sm:text-sm text-nocturn-muted">
          Track your focus sessions, tasks, and consistency over time.
        </p>
      </header>

      {/* Global Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-accent shrink-0">
            <Timer className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-nocturn-muted block font-medium">Total Focus</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-semibold font-mono text-white tracking-tight">
                {stats.totalFocusHours}
              </span>
              <span className="text-xs text-nocturn-muted">hrs</span>
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-sky-400 shrink-0">
            <Clock className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-nocturn-muted block font-medium">Focus Sessions</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-semibold font-mono text-white tracking-tight">
                {stats.totalFocusSessionsCount}
              </span>
              <span className="text-xs text-nocturn-muted">sessions</span>
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-emerald-400 shrink-0">
            <CheckSquare className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-nocturn-muted block font-medium">Tasks Completed</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-semibold font-mono text-white tracking-tight">
                {stats.totalCompletedTasks}
              </span>
              <span className="text-xs text-nocturn-muted">completed</span>
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-amber-400 shrink-0">
            <Flame className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-nocturn-muted block font-medium">Current Streak</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-semibold font-mono text-white tracking-tight">
                {stats.streak}
              </span>
              <span className="text-xs text-nocturn-muted">days</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Period Analytics Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-0.5">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-nocturn-accent" />
            <h2 className="text-sm sm:text-base font-medium text-white tracking-tight">
              Focus Distribution
            </h2>
          </div>

          {/* Period Filter Tabs (Week | Month | Year) */}
          <Tabs
            tabs={periodTabs}
            activeTab={period}
            size="sm"
            onChange={(newPeriod) => {
              setPeriod(newPeriod)
              setPeriodOffset(0)
            }}
          />
        </div>

        {/* Period Navigation & Detailed Breakdown */}
        <Card className="space-y-5">
          {/* Period Selector Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3.5">
            <button
              type="button"
              onClick={() => setPeriodOffset((prev) => prev - 1)}
              className="p-1.5 rounded-lg bg-white/[0.04] text-nocturn-muted hover:text-white hover:bg-white/[0.08] border border-white/[0.08] cursor-pointer transition-colors"
              title="Previous period"
              aria-label="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <span className="text-xs sm:text-sm font-medium text-white flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-nocturn-accent shrink-0" />
                <span>{stats.periodLabel}</span>
              </span>
              {periodOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setPeriodOffset(0)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-nocturn-accent/15 text-nocturn-accent border border-nocturn-accent/30 hover:bg-nocturn-accent/25 transition-colors cursor-pointer"
                >
                  Current
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={periodOffset >= 0}
              onClick={() => setPeriodOffset((prev) => prev + 1)}
              className="p-1.5 rounded-lg bg-white/[0.04] text-nocturn-muted hover:text-white hover:bg-white/[0.08] border border-white/[0.08] disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Next period"
              aria-label="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="text-xs font-medium text-nocturn-muted block">Period Focus Duration</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold font-mono text-nocturn-accent">
                  {stats.periodHours} hrs
                </span>
                <span className="text-xs text-nocturn-muted">
                  ({stats.periodMinutes} min)
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="text-xs font-medium text-nocturn-muted block">Sessions Completed</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold font-mono text-white">
                  {stats.periodSessionsCount}
                </span>
                <span className="text-xs text-nocturn-muted">sessions</span>
              </div>
            </div>
          </div>

          {/* Week Bar Chart (When Period is 'week') */}
          {period === 'week' && weekDays.length > 0 && (
            <div className="pt-2 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-nocturn-muted font-medium">Daily Focus Activity</span>
                <span className="text-[11px] text-nocturn-muted font-mono">
                  Scale: {Math.round(maxWeekMinutes)}m max
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-36 pt-4 px-1">
                {weekDays.map((d) => {
                  const heightPercent = Math.max(
                    6,
                    Math.round((d.minutes / maxWeekMinutes) * 100)
                  )
                  const hasMinutes = d.minutes > 0

                  return (
                    <div
                      key={d.key}
                      className="flex flex-col items-center justify-end h-full gap-2 group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-1 rounded-md bg-nocturn-elevated border border-white/10 text-[10px] font-mono text-white whitespace-nowrap pointer-events-none z-20 shadow-lg">
                        {d.minutes} min ({d.hours}h)
                      </div>

                      {/* Bar Fill */}
                      <div className="w-full max-w-[36px] bg-white/[0.04] rounded-lg p-0.5 flex flex-col justify-end h-full">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-md transition-all duration-300 ${
                            hasMinutes
                              ? d.isToday
                                ? 'bg-nocturn-accent shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.35)]'
                                : 'bg-nocturn-accent/80 hover:bg-nocturn-accent'
                              : 'bg-white/[0.06]'
                          }`}
                        />
                      </div>

                      {/* Day Label */}
                      <div className="text-center">
                        <span
                          className={`text-[11px] block font-medium ${
                            d.isToday ? 'text-nocturn-accent font-semibold' : 'text-nocturn-muted'
                          }`}
                        >
                          {d.dayLabel}
                        </span>
                        <span className="text-[10px] text-nocturn-muted/60 font-mono block">
                          {d.dateNumber}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {stats.periodSessionsCount === 0 && stats.periodTasksCount === 0 && (
            <p className="text-center text-xs text-nocturn-muted py-2">
              No focus activity recorded for this period.
            </p>
          )}
        </Card>
      </section>

      {/* Account & Synchronization Section */}
      <section className="space-y-4">
        <h2 className="text-sm sm:text-base font-medium text-white tracking-tight px-0.5">
          Account & Cloud Workspace
        </h2>

        {/* User Card */}
        <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center font-bold text-base text-nocturn-accent-bright shrink-0">
              {initials}
            </div>

            {/* User Display Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">
                  {displayName || user?.user_metadata?.full_name || 'Nocturn User'}
                </h3>
                <Badge
                  variant={user ? 'success' : 'neutral'}
                  size="sm"
                  dot
                  icon={user ? ShieldCheck : undefined}
                >
                  {user ? 'Authenticated' : 'Local Offline Mode'}
                </Badge>
              </div>
              <p className="text-xs text-nocturn-muted">
                {user ? user.email : 'Local Guest Workspace'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Sign In / Sign Out & Sync */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            {user ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSyncData}
                  disabled={syncing}
                  icon={RefreshCw}
                  className={syncing ? '[&_svg]:animate-spin' : ''}
                >
                  Sync
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => signOut()}
                  icon={LogOut}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/auth')}
                icon={UserIcon}
              >
                Sign In / Sign Up
              </Button>
            )}
          </div>
        </Card>

        {syncResult && (
          <div className="p-3 rounded-xl bg-nocturn-accent/10 border border-nocturn-accent/25 text-xs text-nocturn-accent font-medium">
            {syncResult}
          </div>
        )}

        {/* Editable Name Form */}
        <Card className="space-y-3.5">
          <form onSubmit={handleSaveName} className="space-y-3">
            <label htmlFor="display-name" className="text-xs font-medium text-nocturn-muted block">
              Display Name
            </label>
            <div className="relative flex items-center max-w-md">
              <input
                id="display-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
                className="w-full nocturn-input text-sm py-2 px-3 pr-24 rounded-xl"
              />
              <div className="absolute right-1.5">
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={!nameInput.trim() || nameInput.trim() === displayName}
                  icon={isSaved ? Check : undefined}
                >
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-nocturn-muted">
              Display name is saved locally and synced to your cloud profile.
            </p>
          </form>
        </Card>
      </section>
    </div>
  )
}

