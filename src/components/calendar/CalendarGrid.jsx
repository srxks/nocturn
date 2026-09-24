import { motion, AnimatePresence } from 'framer-motion'
import CalendarDay from './CalendarDay'
import { formatDateKey, getEventsForDate } from '../../services/calendarService'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CalendarGrid({
  currentMonthDate,
  selectedDate,
  tasks,
  onSelectDate,
}) {
  const year = currentMonthDate.getFullYear()
  const month = currentMonthDate.getMonth()
  const monthKey = `${year}-${month}`

  const todayKey = formatDateKey(new Date())
  const selectedKey = formatDateKey(selectedDate)

  // Calculate Monday-based weekday offset (0 = Monday, 6 = Sunday)
  const firstDayOfMonth = new Date(year, month, 1)
  const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const gridCells = []

  // 1. Previous Month Padding Days
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const prevDate = new Date(year, month - 1, daysInPrevMonth - i)
    gridCells.push({
      dateObj: prevDate,
      isCurrentMonth: false,
    })
  }

  // 2. Current Month Days
  for (let d = 1; d <= daysInMonth; d++) {
    const currDate = new Date(year, month, d)
    gridCells.push({
      dateObj: currDate,
      isCurrentMonth: true,
    })
  }

  // 3. Next Month Trailing Padding Days to complete 35 or 42 grid items
  const totalGridCount = gridCells.length > 35 ? 42 : 35
  const trailingCount = totalGridCount - gridCells.length
  for (let t = 1; t <= trailingCount; t++) {
    const nextDate = new Date(year, month + 1, t)
    gridCells.push({
      dateObj: nextDate,
      isCurrentMonth: false,
    })
  }

  return (
    <div className="w-full space-y-2">
      {/* 7-Column Weekday Header */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-semibold text-nocturn-muted uppercase tracking-wider py-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* 7-Column Days Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={monthKey}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-7 gap-1 sm:gap-2"
        >
          {gridCells.map((cell) => {
            const dateKey = formatDateKey(cell.dateObj)
            const isToday = dateKey === todayKey
            const isSelected = dateKey === selectedKey
            const dayEvents = getEventsForDate(dateKey, tasks)

            return (
              <CalendarDay
                key={dateKey}
                dateObj={cell.dateObj}
                isCurrentMonth={cell.isCurrentMonth}
                isToday={isToday}
                isSelected={isSelected}
                events={dayEvents}
                onClick={() => onSelectDate(cell.dateObj)}
              />
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
