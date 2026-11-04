import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function formatDateToIso(d) {
  if (!d) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseIsoToLocalDate(isoStr) {
  if (!isoStr) return null
  const parts = isoStr.split('T')[0].split('-')
  if (parts.length < 3) return null
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
}

export default function DatePickerPopover({
  value, // 'YYYY-MM-DD'
  onChange,
  onClear,
  label: _label, // eslint-disable-line no-unused-vars
  placeholder = 'No date set',
  variant = 'due', // 'due' (emerald) | 'deadline' (rose)
  align = 'left',
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef(null)

  const selectedDate = value ? parseIsoToLocalDate(value) : null
  const today = new Date()
  const todayIso = formatDateToIso(today)

  // Calendar navigation state (year & month)
  const [navDateState, setNavDateState] = useState(null)
  const [prevValue, setPrevValue] = useState(value)

  // Synchronize navigation date if value changes externally without effect-loop
  if (value !== prevValue) {
    setPrevValue(value)
    if (value) {
      const parsed = parseIsoToLocalDate(value)
      if (parsed) setNavDateState(parsed)
    }
  }

  const navDate = navDateState || selectedDate || today

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handlePrevMonth = () => {
    setNavDateState(new Date(navDate.getFullYear(), navDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setNavDateState(new Date(navDate.getFullYear(), navDate.getMonth() + 1, 1))
  }

  const handleSelectDay = (dayNum) => {
    const d = new Date(navDate.getFullYear(), navDate.getMonth(), dayNum)
    onChange(formatDateToIso(d))
    setIsOpen(false)
  }

  const handleQuickChip = (daysToAdd) => {
    const d = new Date()
    d.setDate(d.getDate() + daysToAdd)
    const iso = formatDateToIso(d)
    setNavDateState(d)
    onChange(iso)
    setIsOpen(false)
  }

  const handleClear = () => {
    if (onClear) onClear()
    else onChange('')
    setIsOpen(false)
  }

  // Days grid computation
  const year = navDate.getFullYear()
  const month = navDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayIndex = new Date(year, month, 1).getDay()

  const daysArray = []
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(i)
  }

  // Visual formatting
  const isRose = variant === 'deadline'
  const activeAccentColor = isRose ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  const pillSelectedBg = isRose ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-black font-semibold'

  // Formatted display text
  const displayLabel = selectedDate
    ? selectedDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: selectedDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      })
    : placeholder

  const isTodaySelected = value === todayIso

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
          value
            ? activeAccentColor
            : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:border-white/20'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <CalendarIcon className={`w-3.5 h-3.5 ${value ? (isRose ? 'text-rose-400' : 'text-emerald-400') : 'text-neutral-400'}`} />
        <span>{displayLabel}</span>
        {value && !disabled && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
            className="ml-1 p-0.5 rounded-full hover:bg-white/20 text-neutral-400 hover:text-white transition-colors"
            title="Clear date"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* Popover Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 mt-2 w-72 rounded-2xl bg-neutral-950/95 backdrop-blur-xl border border-white/10 p-3.5 shadow-2xl ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {/* Quick Select Chips */}
            <div className="flex items-center gap-1.5 pb-3 border-b border-white/10">
              <button
                type="button"
                onClick={() => handleQuickChip(0)}
                className={`flex-1 px-2 py-1 text-[11px] rounded-lg font-medium transition-colors ${
                  isTodaySelected ? pillSelectedBg : 'bg-white/5 text-neutral-300 hover:bg-white/10'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickChip(1)}
                className="flex-1 px-2 py-1 text-[11px] rounded-lg font-medium bg-white/5 text-neutral-300 hover:bg-white/10 transition-colors"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => handleQuickChip(7)}
                className="flex-1 px-2 py-1 text-[11px] rounded-lg font-medium bg-white/5 text-neutral-300 hover:bg-white/10 transition-colors"
              >
                Next Week
              </button>
            </div>

            {/* Navigation Header */}
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-semibold text-white tracking-wide">
                {MONTH_NAMES[month]} {year}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d} className="text-[10px] font-medium text-neutral-500 py-0.5">
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {daysArray.map((dayNum, idx) => {
                if (!dayNum) {
                  return <div key={`empty-${idx}`} className="h-7 w-7" />
                }
                const cellIso = formatDateToIso(new Date(year, month, dayNum))
                const isSelected = value === cellIso
                const isToday = cellIso === todayIso

                let cellClass = 'text-neutral-300 hover:bg-white/10'
                if (isSelected) {
                  cellClass = pillSelectedBg
                } else if (isToday) {
                  cellClass = isRose
                    ? 'border border-rose-500/50 text-rose-300 font-medium'
                    : 'border border-emerald-500/50 text-emerald-300 font-medium'
                }

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => handleSelectDay(dayNum)}
                    className={`h-7 w-7 rounded-lg text-xs flex items-center justify-center transition-colors font-medium ${cellClass}`}
                  >
                    {dayNum}
                  </button>
                )
              })}
            </div>

            {/* Footer / Clear Action */}
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10 text-xs">
              <span className="text-[11px] text-neutral-500">
                {isRose ? 'Hard cutoff deadline' : 'Intended target date'}
              </span>
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] font-medium text-rose-400 hover:text-rose-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
