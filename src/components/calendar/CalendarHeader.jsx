import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

export default function CalendarHeader({
  currentMonthDate,
  onPrevMonth,
  onNextMonth,
  onToday,
}) {
  const monthYearLabel = currentMonthDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-4">
      {/* Header Title */}
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Calendar
        </h1>
        <p className="text-xs sm:text-sm text-nocturn-muted">
          Your schedule, tasks, and focus sessions.
        </p>
      </header>

      {/* Toolbar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/[0.06] flex flex-wrap items-center justify-between gap-3 shadow-sm">
        {/* Month Navigation */}
        <div className="flex items-center gap-2.5">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onPrevMonth}
            aria-label="Previous month"
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.16] text-nocturn-muted hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onNextMonth}
            aria-label="Next month"
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.16] text-nocturn-muted hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.2]" />
          </motion.button>

          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-white ml-1 font-display">
            {monthYearLabel}
          </h2>
        </div>

        {/* Today Action */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onToday}
          className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-nocturn-accent/40 text-xs font-semibold text-white inline-flex items-center gap-2 cursor-pointer shadow-sm transition-all"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-nocturn-accent stroke-[2.2]" />
          Today
        </motion.button>
      </div>
    </div>
  )
}
