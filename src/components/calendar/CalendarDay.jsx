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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
      aria-label={`${dateLabel}${isToday ? ', Today' : ''}${isSelected ? ', Selected' : ''}, ${events.length} events`}
      className={`min-h-[70px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent ${
        !isCurrentMonth
          ? 'bg-nocturn-bg/40 border-nocturn-border/30 opacity-40 hover:opacity-75'
          : isSelected
            ? 'bg-nocturn-surface border-nocturn-accent shadow-[0_0_15px_rgba(0,230,118,0.25)] ring-1 ring-nocturn-accent'
            : isToday
              ? 'bg-nocturn-card border-nocturn-accent/60 shadow-[0_0_10px_rgba(0,230,118,0.15)]'
              : 'bg-nocturn-card/80 border-nocturn-border hover:border-nocturn-accent/30 hover:bg-nocturn-card'
      }`}
    >
      {/* Top Cell Bar: Date Number + Today Pill */}
      <div className="flex items-center justify-between w-full">
        <span
          className={`text-xs sm:text-sm font-semibold font-mono px-1.5 py-0.5 rounded-lg ${
            isToday
              ? 'bg-nocturn-accent text-black font-bold shadow-[0_0_8px_rgba(0,230,118,0.6)]'
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
