import { motion } from 'framer-motion'
import CalendarEvent from './CalendarEvent'

export default function CalendarDay({
  dateObj,
  isCurrentMonth,
  isToday,
  isSelected,
  events = [],
  onClick,
}) {
  const dayNumber = dateObj.getDate()
  const dateLabel = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const visibleEvents = events.slice(0, 2)
  const extraCount = events.length - visibleEvents.length

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      aria-label={`${dateLabel}${isToday ? ', Today' : ''}${isSelected ? ', Selected' : ''}, ${events.length} events`}
      className={`min-h-[74px] sm:min-h-[94px] p-2 sm:p-2.5 rounded-2xl border flex flex-col justify-between text-left transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent ${
        !isCurrentMonth
          ? 'bg-white/[0.01] border-white/[0.03] opacity-35 hover:opacity-60'
          : isSelected
            ? 'bg-nocturn-accent/[0.08] border-nocturn-accent shadow-[0_0_20px_rgba(var(--color-nocturn-accent-rgb),0.2)] ring-1 ring-nocturn-accent/40'
            : isToday
              ? 'bg-white/[0.04] border-nocturn-accent/60 shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.15)]'
              : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.06] hover:border-white/[0.14]'
      }`}
    >
      {/* Top Cell Bar: Date Number + Today Pill */}
      <div className="flex items-center justify-between w-full">
        <span
          className={`text-xs sm:text-sm font-semibold font-mono px-1.5 py-0.5 rounded-lg ${
            isToday
              ? 'bg-nocturn-accent text-black font-bold shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb),0.6)]'
              : isSelected
                ? 'text-nocturn-accent-bright font-bold'
                : 'text-white'
          }`}
        >
          {dayNumber}
        </span>

        {isToday && (
          <span className="text-[9px] uppercase font-bold text-nocturn-accent tracking-wider hidden sm:inline">
            Today
          </span>
        )}
      </div>

      {/* Events Chips List */}
      <div className="space-y-1 w-full my-1">
        {visibleEvents.map((evt) => (
          <CalendarEvent key={evt.id} event={evt} />
        ))}
        {extraCount > 0 && (
          <span className="text-[9px] font-medium text-nocturn-muted px-1 block truncate">
            +{extraCount} more
          </span>
        )}
      </div>
    </motion.button>
  )
}
