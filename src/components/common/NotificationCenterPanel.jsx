import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  CheckCheck,
  X,
} from 'lucide-react'
import { useTasks } from '../../context/useTasks'
import { getPlanSchedule } from '../../services/plannerPersistenceService'
import { formatDateKey } from '../../services/calendarService'

export default function NotificationCenterPanel({ isOpen, onClose }) {
  const { tasks } = useTasks()
  const [items, setItems] = useState([])
  const [clearedIds, setClearedIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('nocturn_cleared_notifs') || '[]'))
    } catch {
      return new Set()
    }
  })

  // Load and assemble recent alerts from real tasks and plan schedule
  useEffect(() => {
    if (!isOpen) return

    async function loadNotifications() {
      const notifs = []
      const todayKey = formatDateKey(new Date())

      // 1. Overdue incomplete tasks
      const overdueTasks = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayKey)
      overdueTasks.slice(0, 3).forEach((t) => {
        notifs.push({
          id: `task-overdue-${t.id}`,
          type: 'overdue_task',
          title: `Task Overdue: ${t.title}`,
          subtitle: `Was due on ${t.dueDate}`,
          time: 'Needs attention',
          icon: AlertCircle,
          colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/25',
        })
      })

      // 2. Today's plan schedule overdue blocks
      try {
        const plan = await getPlanSchedule(todayKey)
        if (plan?.blocks) {
          const now = new Date()
          const curMin = now.getHours() * 60 + now.getMinutes()

          plan.blocks.forEach((b) => {
            if (b.completed) {
              notifs.push({
                id: `block-done-${b.id}`,
                type: 'block_completed',
                title: `Focus Completed: ${b.title}`,
                subtitle: `${b.durationMinutes} min session completed`,
                time: b.startTime,
                icon: CheckCircle2,
                colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
              })
            } else if (b.endTime) {
              const [eh, em] = b.endTime.split(':').map(Number)
              if (!isNaN(eh) && !isNaN(em) && curMin > (eh * 60 + em)) {
                notifs.push({
                  id: `block-overdue-${b.id}`,
                  type: 'block_overdue',
                  title: `Schedule Overdue: ${b.title}`,
                  subtitle: `Scheduled for ${b.startTime} – ${b.endTime}`,
                  time: 'Missed block',
                  icon: AlertCircle,
                  colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
                })
              }
            }
          })
        }
      } catch {
        // ignore
      }

      setItems(notifs)
    }

    loadNotifications()
  }, [isOpen, tasks])

  const activeItems = items.filter((item) => !clearedIds.has(item.id))

  const handleClearAll = () => {
    const allIds = new Set([...clearedIds, ...items.map((i) => i.id)])
    setClearedIds(allIds)
    localStorage.setItem('nocturn_cleared_notifs', JSON.stringify(Array.from(allIds)))
    window.dispatchEvent(new Event('nocturn:notifications-updated'))
  }

  const handleDismissItem = (id) => {
    const next = new Set(clearedIds)
    next.add(id)
    setClearedIds(next)
    localStorage.setItem('nocturn_cleared_notifs', JSON.stringify(Array.from(next)))
    window.dispatchEvent(new Event('nocturn:notifications-updated'))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            aria-hidden="true"
          />

          {/* Popover Panel */}
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-4 right-4 sm:left-auto sm:right-0 top-full mt-2 sm:w-80 md:w-96 bg-nocturn-card/95 border border-nocturn-border rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.75)] backdrop-blur-xl z-50 overflow-hidden flex flex-col max-h-[440px]"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-nocturn-border/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-nocturn-accent" />
                <span className="text-xs sm:text-sm font-semibold text-white">
                  Notifications
                </span>
                {activeItems.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-nocturn-accent/20 text-nocturn-accent border border-nocturn-accent/30 font-semibold">
                    {activeItems.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {activeItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    title="Mark all as read"
                    className="p-1 rounded-lg text-nocturn-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-xs flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Clear all</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg text-nocturn-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List Content */}
            <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
              {activeItems.length === 0 ? (
                <div className="py-8 text-center space-y-1.5 px-4">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-nocturn-muted mx-auto">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-white block">All caught up</span>
                  <p className="text-[11px] text-nocturn-muted">
                    No new session alerts or overdue schedule blocks.
                  </p>
                </div>
              ) : (
                activeItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-colors flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${item.colorClass}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <span className="text-xs font-medium text-white block truncate">
                            {item.title}
                          </span>
                          <span className="text-[11px] text-nocturn-muted block truncate">
                            {item.subtitle}
                          </span>
                          <span className="text-[10px] font-mono text-nocturn-muted/70 block">
                            {item.time}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDismissItem(item.id)}
                        title="Dismiss"
                        className="opacity-0 group-hover:opacity-100 p-1 text-nocturn-muted hover:text-white rounded transition-opacity cursor-pointer shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
