import { useState, useRef, useEffect, useMemo } from 'react'
import { Bell } from 'lucide-react'
import NotificationCenterPanel from './NotificationCenterPanel'
import { useTasks } from '../../context/useTasks'
import { formatDateKey } from '../../services/calendarService'

export default function NotificationBell({ className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const { tasks } = useTasks()
  const [clearedVersion, setClearedVersion] = useState(0)

  // Listen for notification clearing events
  useEffect(() => {
    const handleUpdate = () => setClearedVersion((v) => v + 1)
    window.addEventListener('nocturn:notifications-updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('nocturn:notifications-updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  // Click outside listener for desktop
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const hasUnread = useMemo(() => {
    // Rely on clearedVersion to re-evaluate when notifications are dismissed/cleared
    if (clearedVersion < 0) return false

    try {
      const todayKey = formatDateKey(new Date())
      const clearedIds = new Set(JSON.parse(localStorage.getItem('nocturn_cleared_notifs') || '[]'))
      const overdueTasks = (tasks || []).filter((t) => !t.completed && t.dueDate && t.dueDate < todayKey)
      return overdueTasks.some((t) => !clearedIds.has(`task-overdue-${t.id}`))
    } catch {
      return false
    }
  }, [tasks, clearedVersion])

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Notification Center"
        aria-label="Notification Center"
        className="relative p-2 rounded-xl text-nocturn-muted hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-nocturn-border transition-colors cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {/* Dynamic unread dot indicator */}
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-nocturn-accent border-2 border-nocturn-card shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb),0.7)]" />
        )}
      </button>

      <NotificationCenterPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  )
}
