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
      <div className="nocturn-card p-3 sm:p-4 border border-nocturn-border flex flex-wrap items-center justify-between gap-3">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="Previous month"
            className="p-2 rounded-xl bg-nocturn-surface border border-nocturn-border text-nocturn-muted hover:text-white hover:border-nocturn-accent/40 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="Next month"
            className="p-2 rounded-xl bg-nocturn-surface border border-nocturn-border text-nocturn-muted hover:text-white hover:border-nocturn-accent/40 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocturn-accent"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.2]" />
          </button>

          <h2 className="text-base sm:text-lg font-bold text-white ml-1">
            {monthYearLabel}
          </h2>
        </div>

        {/* Today Action */}
        <button
          type="button"
          onClick={onToday}
          className="nocturn-btn-secondary px-3.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-nocturn-accent stroke-[2.2]" />
          Today
        </button>
      </div>
    </div>
  )
}
