import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import NotificationCenterPanel from './NotificationCenterPanel'

export default function NotificationBell({ className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

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
        {/* Unread dot indicator */}
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-nocturn-accent border-2 border-nocturn-card shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb),0.7)]" />
      </button>

      <NotificationCenterPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  )
}
