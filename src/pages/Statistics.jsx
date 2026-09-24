import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useTasks } from '../context/useTasks'
import {
  calculateProductivityStats,
  calculateDailyHeatmap,
  calculateFocusByList,
  calculateFocusByTask,
  getSessionDurationMinutes,
  getActiveSessionMinutes,
} from '../services/statsService'
import { formatDateKey } from '../services/calendarService'
import {
  BarChart3,
  Timer,
  CheckCircle2,
  Flame,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Folder,
  ArrowUpRight,
  FileText,
  Sparkles,
} from 'lucide-react'

export default function Statistics() {
  const { tasks, lists } = useTasks()
  const [period, setPeriod] = useState('week') // 'today' | 'week' | 'month' | 'year'
  const [periodOffset, setPeriodOffset] = useState(0)

  // Live queries for persisted sessions and active session
  const sessions = useLiveQuery(async () => {
    return await db.pomodoroSessions.toArray()
  }, []) || []

  const activeSession = useLiveQuery(async () => {
    return await db.activeSessions.get('active')
  }, []) || null

  const stats = useMemo(() => {
    return calculateProductivityStats(
      sessions,
      tasks,
      period === 'today' ? 'week' : period,
      periodOffset,
      activeSession
    )
  }, [sessions, tasks, period, periodOffset, activeSession])

  // Heatmap for last 60 days
  const heatmap = useMemo(() => {
    return calculateDailyHeatmap(sessions, tasks, 56) // 8 weeks of 7 days
  }, [sessions, tasks])

  // Focus breakdowns
  const listBreakdown = useMemo(() => {
    return calculateFocusByList(sessions, tasks, lists)
  }, [sessions, tasks, lists])

  const taskBreakdown = useMemo(() => {
    return calculateFocusByTask(sessions, tasks)
  }, [sessions, tasks])

  // Completion rate calculation
  const completionRate = useMemo(() => {
    if (!tasks || tasks.length === 0) return 0
    const completed = tasks.filter((t) => t.completed).length
    return Math.round((completed / tasks.length) * 100)
  }, [tasks])

  // Average session duration
  const avgSessionMins = useMemo(() => {
    const focusSessions = sessions.filter(
      (s) => s.sessionType === 'focus' || s.sessionType === 'focus_session'
    )
    if (focusSessions.length === 0) return 25
    const total = focusSessions.reduce((acc, s) => acc + getSessionDurationMinutes(s), 0)
    return Math.round(total / focusSessions.length)
  }, [sessions])

  // Longest session duration
  const longestSessionMins = useMemo(() => {
    const focusSessions = sessions.filter(
      (s) => s.sessionType === 'focus' || s.sessionType === 'focus_session'
    )
    if (focusSessions.length === 0) return 0
    const max = Math.max(...focusSessions.map((s) => getSessionDurationMinutes(s)))
    return Math.round(max)
  }, [sessions])

  // Daily bars for active week
  const weekDays = useMemo(() => {
    if (period !== 'week' && period !== 'today') return []
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
      const activeMins = isToday && periodOffset === 0 ? getActiveSessionMinutes(activeSession) : 0
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
  }, [period, periodOffset, sessions, activeSession])

  const maxWeekMinutes = useMemo(() => {
    if (!weekDays.length) return 60
    const highest = Math.max(...weekDays.map((d) => d.minutes))
    return Math.max(highest, 45)
  }, [weekDays])

  // Recent focus sessions history log
  const recentHistory = useMemo(() => {
    return [...sessions]
      .filter((s) => s.sessionType === 'focus' || s.sessionType === 'focus_session')
      .sort((a, b) => {
        const dateA = new Date(a.completedAt || a.startedAt || 0).getTime()
        const dateB = new Date(b.completedAt || b.startedAt || 0).getTime()
        return dateB - dateA
      })
      .slice(0, 8)
  }, [sessions])

  const hasAnyData = sessions.length > 0 || tasks.some((t) => t.completed)

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 select-none">
      {/* Header with Title & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-nocturn-border pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.25)]">
              <BarChart3 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Productivity Statistics</h1>
          </div>
          <p className="text-xs sm:text-sm text-nocturn-muted mt-1">
            Real data from your focus execution, task completions, and daily consistency.
          </p>
        </div>

        {/* Period Selector & Pagination */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-nocturn-card border border-nocturn-border">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' },
              { id: 'year', label: 'Year' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPeriod(p.id)
                  setPeriodOffset(0)
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  period === p.id
                    ? 'bg-nocturn-accent text-black shadow-[0_0_10px_rgba(var(--color-nocturn-accent-rgb),0.4)]'
                    : 'text-nocturn-muted hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Navigation Offset */}
          {period !== 'today' && (
            <div className="flex items-center gap-1 bg-nocturn-card border border-nocturn-border rounded-xl p-1">
              <button
                type="button"
                onClick={() => setPeriodOffset((prev) => prev - 1)}
                className="p-1 text-nocturn-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                title="Previous period"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPeriodOffset(0)}
                disabled={periodOffset === 0}
                className="px-2 py-0.5 text-[11px] font-mono font-medium text-nocturn-muted hover:text-white disabled:opacity-40 cursor-pointer"
              >
                Now
              </button>
              <button
                type="button"
                onClick={() => setPeriodOffset((prev) => Math.min(0, prev + 1))}
                disabled={periodOffset >= 0}
                className="p-1 text-nocturn-muted hover:text-white rounded-lg hover:bg-white/5 disabled:opacity-40 transition-colors cursor-pointer"
                title="Next period"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Focus */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="nocturn-card p-4 sm:p-5 border border-white/[0.08] hover:border-white/20 rounded-2xl relative overflow-hidden group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-nocturn-muted">Total Focus</span>
            <div className="p-2 rounded-xl bg-nocturn-accent/10 text-nocturn-accent border border-nocturn-accent/20">
              <Timer className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
              {stats.periodHours}
            </span>
            <span className="text-xs font-semibold text-nocturn-muted">hours</span>
          </div>
          <div className="mt-2 text-[11px] text-nocturn-dim flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-nocturn-accent" />
            <span>{stats.periodSessionsCount} sessions in {stats.periodLabel || 'this period'}</span>
          </div>
        </motion.div>

        {/* Metric 2: Tasks Completed */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="nocturn-card p-4 sm:p-5 border border-white/[0.08] hover:border-white/20 rounded-2xl relative overflow-hidden group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-nocturn-muted">Tasks Completed</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
              {stats.totalCompletedTasks}
            </span>
            <span className="text-xs font-semibold text-nocturn-muted">done</span>
          </div>
          <div className="mt-2 text-[11px] text-nocturn-dim flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold">{completionRate}%</span>
            <span>lifetime completion rate</span>
          </div>
        </motion.div>

        {/* Metric 3: Focus Streak */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="nocturn-card p-4 sm:p-5 border border-white/[0.08] hover:border-white/20 rounded-2xl relative overflow-hidden group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-nocturn-muted">Active Streak</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Flame className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
              {stats.streak}
            </span>
            <span className="text-xs font-semibold text-nocturn-muted">{stats.streak === 1 ? 'day' : 'days'}</span>
          </div>
          <div className="mt-2 text-[11px] text-nocturn-dim">
            {stats.streak > 0 ? 'Consecutive days with focus or task' : 'Log a session today to start your streak'}
          </div>
        </motion.div>

        {/* Metric 4: Session Averages */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="nocturn-card p-4 sm:p-5 border border-white/[0.08] hover:border-white/20 rounded-2xl relative overflow-hidden group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-nocturn-muted">Average Session</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Clock className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
              {avgSessionMins}
            </span>
            <span className="text-xs font-semibold text-nocturn-muted">min</span>
          </div>
          <div className="mt-2 text-[11px] text-nocturn-dim">
            <span>Longest: {longestSessionMins > 0 ? `${longestSessionMins}m` : '—'}</span>
            <span className="mx-1.5">·</span>
            <span>{sessions.length} total sessions</span>
          </div>
        </motion.div>
      </div>

      {/* Main Charts Row: Daily Bars + 60-Day Activity Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Focus Chart (2 Columns) */}
        <div className="lg:col-span-2 nocturn-card p-5 border border-nocturn-border rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Daily Focus Distribution</h2>
              <p className="text-xs text-nocturn-muted">Actual running focus time per day</p>
            </div>
            <span className="text-xs font-semibold text-nocturn-accent font-mono">
              {stats.periodLabel}
            </span>
          </div>

          {/* Week Bars */}
          {weekDays.length > 0 ? (
            <div className="pt-4 pb-2">
              <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 px-2">
                {weekDays.map((d) => {
                  const heightPercent = Math.min(100, Math.round((d.minutes / maxWeekMinutes) * 100))
                  return (
                    <div key={d.key} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      {/* Bar Value Tooltip */}
                      <span className="text-[10px] font-mono text-nocturn-muted opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {d.minutes > 0 ? `${d.minutes}m` : ''}
                      </span>
                      {/* Bar Fill */}
                      <div className="w-full max-w-[36px] bg-white/[0.04] rounded-xl h-full flex items-end p-1 border border-white/[0.06]">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(d.minutes > 0 ? 8 : 0, heightPercent)}%` }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                          className={`w-full rounded-lg transition-colors ${
                            d.isToday
                              ? 'bg-nocturn-accent shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.5)]'
                              : d.minutes > 0
                              ? 'bg-white/30 group-hover:bg-nocturn-accent/70'
                              : 'bg-transparent'
                          }`}
                        />
                      </div>
                      {/* Day Label */}
                      <div className="text-center">
                        <span className={`text-[11px] block font-semibold ${d.isToday ? 'text-nocturn-accent' : 'text-nocturn-muted'}`}>
                          {d.dayLabel}
                        </span>
                        <span className="text-[10px] text-nocturn-dim font-mono block">
                          {d.dateNumber}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-nocturn-muted">
              Select Week view to inspect daily distribution bars.
            </div>
          )}
        </div>

        {/* 60-Day Habit & Intensity Heatmap (1 Column) */}
        <div className="nocturn-card p-5 border border-nocturn-border rounded-2xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white tracking-tight">Consistency Heatmap</h2>
              <span className="text-[11px] text-nocturn-dim font-mono">Last 8 Weeks</span>
            </div>
            <p className="text-xs text-nocturn-muted mt-0.5">Focus density and daily execution habit</p>
          </div>

          {/* Heatmap Grid (8 columns x 7 days) */}
          <div className="py-2">
            <div className="grid grid-flow-col grid-rows-7 gap-1.5 justify-center">
              {heatmap.map((cell) => {
                let bgClass = 'bg-white/[0.04] border-white/[0.06]'
                if (cell.level === 1) bgClass = 'bg-nocturn-accent/25 border-nocturn-accent/40'
                if (cell.level === 2) bgClass = 'bg-nocturn-accent/50 border-nocturn-accent/60'
                if (cell.level === 3) bgClass = 'bg-nocturn-accent/75 border-nocturn-accent/80'
                if (cell.level === 4) bgClass = 'bg-nocturn-accent border-nocturn-accent shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb),0.6)]'

                return (
                  <motion.div
                    key={cell.dateKey}
                    whileHover={{ scale: 1.4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    title={`${cell.dateKey}: ${cell.minutes}m focused, ${cell.taskCount} tasks`}
                    className={`w-3.5 h-3.5 rounded-sm border cursor-pointer z-10 ${bgClass}`}
                  />
                )
              })}
            </div>

            {/* Heatmap Scale Legend */}
            <div className="flex items-center justify-between pt-3 text-[10px] text-nocturn-muted">
              <span>Less</span>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-white/[0.04] border border-white/[0.06]" />
                <div className="w-2.5 h-2.5 rounded-sm bg-nocturn-accent/25" />
                <div className="w-2.5 h-2.5 rounded-sm bg-nocturn-accent/50" />
                <div className="w-2.5 h-2.5 rounded-sm bg-nocturn-accent/75" />
                <div className="w-2.5 h-2.5 rounded-sm bg-nocturn-accent" />
              </div>
              <span>More</span>
            </div>
          </div>

          <div className="pt-2 border-t border-nocturn-border flex items-center justify-between text-xs text-nocturn-dim">
            <span>Active streak: <strong className="text-white font-mono">{stats.streak} days</strong></span>
            <span>Total focus: <strong className="text-white font-mono">{stats.totalFocusHours}h</strong></span>
          </div>
        </div>
      </div>

      {/* Focus Breakdown Row: By List & By Task */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Breakdown by List */}
        <div className="nocturn-card p-5 border border-nocturn-border rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Folder className="w-4 h-4 text-nocturn-accent" /> Focus by List
            </h2>
            <span className="text-xs text-nocturn-muted">{listBreakdown.length} lists</span>
          </div>

          {listBreakdown.length > 0 ? (
            <div className="space-y-3 pt-1">
              {listBreakdown.map((item) => (
                <div key={item.listId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-medium truncate">{item.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-nocturn-muted">{item.hours}h</span>
                      <span className="text-[10px] font-mono text-nocturn-dim">({item.percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-nocturn-accent"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-nocturn-muted">
              No list-associated focus sessions logged yet.
            </div>
          )}
        </div>

        {/* Breakdown by Task */}
        <div className="nocturn-card p-5 border border-nocturn-border rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Focus by Top Tasks
            </h2>
            <span className="text-xs text-nocturn-muted">Top 10</span>
          </div>

          {taskBreakdown.length > 0 ? (
            <div className="space-y-2.5 pt-1">
              {taskBreakdown.slice(0, 6).map((item) => (
                <div key={item.title} className="flex items-center justify-between gap-3 text-xs p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-white font-medium truncate flex-1">{item.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-nocturn-dim">{item.count} sessions</span>
                    <span className="font-mono font-semibold text-nocturn-accent">{item.minutes}m</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-nocturn-muted">
              Select tasks when launching the Focus Timer to see task-level analytics.
            </div>
          )}
        </div>
      </div>

      {/* Focus Execution History Log */}
      <div className="nocturn-card p-5 border border-nocturn-border rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-nocturn-accent" /> Recent Focus Sessions & Notes
            </h2>
            <p className="text-xs text-nocturn-muted">Log of completed focus execution blocks</p>
          </div>
          <Link
            to="/timer"
            className="text-xs font-semibold text-nocturn-accent hover:underline flex items-center gap-1"
          >
            Launch Timer <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentHistory.length > 0 ? (
          <div className="divide-y divide-white/[0.06]">
            {recentHistory.map((s) => {
              const dateStr = s.completedAt || s.startedAt
              const d = dateStr ? new Date(dateStr) : new Date()
              const formattedDate = d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })
              const durationMins = getSessionDurationMinutes(s)

              return (
                <div key={s.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate">
                        {s.taskName || s.taskTitle || 'Focus Session'}
                      </span>
                      <span className="text-[10px] font-mono text-nocturn-accent bg-nocturn-accent/10 px-2 py-0.5 rounded-full border border-nocturn-accent/20">
                        {Math.round(durationMins)} min
                      </span>
                    </div>
                    {s.notes && (
                      <p className="text-[11px] text-nocturn-muted italic mt-0.5 truncate">
                        "{s.notes}"
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-nocturn-dim shrink-0">
                    {formattedDate}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-12 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-nocturn-muted mx-auto stroke-[1.5]" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">No Focus Sessions Logged Yet</h3>
              <p className="text-xs text-nocturn-muted max-w-sm mx-auto">
                Complete a session in Focus Timer or Plan My Day. All elapsed focus minutes and accomplishment notes will appear here.
              </p>
            </div>
            <Link
              to="/timer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-nocturn-accent text-black font-semibold text-xs shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.35)]"
            >
              Start Focus Session
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
