import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar as CalendarIcon, CheckSquare, Sparkles, CheckCircle2, MessageSquare } from 'lucide-react'
import { useTasks } from '../context/useTasks'
import PlanButton from '../components/planner/PlanButton'
import PlanningStyleSelector from '../components/planner/PlanningStyleSelector'
import MissedTasksBanner from '../components/planner/MissedTasksBanner'
import TodayTasksList from '../components/planner/TodayTasksList'
import ScheduleTimeline from '../components/planner/ScheduleTimeline'
import {
  getPlanMyDayTaskInput,
  getOverdueCarriedForwardTasks,
  generateSmartSchedule,
  recalculateScheduleTimings,
} from '../utils/planner'
import { savePlanSchedule, getPlanSchedule } from '../services/plannerPersistenceService'

export default function PlanMyDay() {
  const { tasks, toggleTask } = useTasks()

  const [planningStyle, setPlanningStyle] = useState('balanced')
  const [userInstruction, setUserInstruction] = useState('')
  const [rawSchedule, setRawSchedule] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)

  // Live query to load persisted local schedule for today
  const persistedScheduleRecord = useLiveQuery(async () => {
    return await getPlanSchedule()
  }, [])

  // Format today's date
  const dateString = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  // Get eligible task input for Plan My Day (Today + Overdue incomplete tasks)
  const planTaskInput = useMemo(() => {
    return getPlanMyDayTaskInput(tasks)
  }, [tasks])

  // Get overdue carried-forward tasks specifically for Missed Tasks banner
  const overdueTasks = useMemo(() => {
    return getOverdueCarriedForwardTasks(tasks)
  }, [tasks])

  // Effective raw schedule combining local state or persisted record
  const effectiveRawSchedule = useMemo(() => {
    if (rawSchedule.length > 0) return rawSchedule
    if (persistedScheduleRecord?.blocks) return persistedScheduleRecord.blocks
    return []
  }, [rawSchedule, persistedScheduleRecord])

  const hasPlanned = effectiveRawSchedule.length > 0

  // Derive active schedule reactively: automatically excludes completed tasks
  const activeSchedule = useMemo(() => {
    if (!effectiveRawSchedule || effectiveRawSchedule.length === 0) return []
    const activeTaskIds = new Set(planTaskInput.map((t) => t.id))
    const filtered = effectiveRawSchedule.filter(
      (block) => block.type === 'break' || activeTaskIds.has(block.taskId)
    )
    return recalculateScheduleTimings(filtered)
  }, [effectiveRawSchedule, planTaskInput])

  // Generate or Regenerate Smart Schedule
  const handlePlanDay = () => {
    if (planTaskInput.length === 0) return

    setIsGenerating(true)

    setTimeout(() => {
      const generated = generateSmartSchedule(planTaskInput, planningStyle, userInstruction)
      setRawSchedule(generated)
      setIsGenerating(false)
      savePlanSchedule(generated, planningStyle, userInstruction).catch((err) =>
        console.error('Failed to persist plan schedule:', err)
      )
    }, 600)
  }

  // Handle Smart Reschedule secondary action
  const handleSmartReschedule = () => {
    if (planTaskInput.length === 0) return

    setIsGenerating(true)

    setTimeout(() => {
      const regenerated = generateSmartSchedule(planTaskInput, planningStyle, userInstruction)
      setRawSchedule(regenerated)
      setIsGenerating(false)
      savePlanSchedule(regenerated, planningStyle, userInstruction).catch((err) =>
        console.error('Failed to persist plan schedule:', err)
      )
    }, 500)
  }

  // Handle task completion from schedule or tasks list
  const handleToggleTask = (taskId) => {
    toggleTask(taskId)
  }

  // Handle manual block edits (start time / duration)
  const handleUpdateBlock = (blockId, updates) => {
    const updated = effectiveRawSchedule.map((b) => (b.id === blockId ? { ...b, ...updates } : b))
    const recalculated = recalculateScheduleTimings(updated)
    setRawSchedule(recalculated)
    savePlanSchedule(recalculated, planningStyle, userInstruction).catch((err) =>
      console.error('Failed to persist updated schedule:', err)
    )
  }

  // Handle manual block removal
  const handleRemoveBlock = (blockId) => {
    const filtered = effectiveRawSchedule.filter((b) => b.id !== blockId)
    const recalculated = recalculateScheduleTimings(filtered)
    setRawSchedule(recalculated)
    savePlanSchedule(recalculated, planningStyle, userInstruction).catch((err) =>
      console.error('Failed to persist schedule after removal:', err)
    )
  }

  // Handle reordering schedule blocks up or down
  const handleMoveBlock = (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= effectiveRawSchedule.length) return

    const copy = [...effectiveRawSchedule]
    const [moved] = copy.splice(index, 1)
    copy.splice(newIndex, 0, moved)

    const recalculated = recalculateScheduleTimings(copy)
    setRawSchedule(recalculated)
    savePlanSchedule(recalculated, planningStyle, userInstruction).catch((err) =>
      console.error('Failed to persist reordered schedule:', err)
    )
  }

  const hasTasks = planTaskInput.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="w-full space-y-6 sm:space-y-8"
    >
      {/* Header Section */}
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Plan My Day
        </h1>
        <p className="text-xs sm:text-sm text-nocturn-muted">
          Turn your tasks into a focused schedule.
        </p>
      </header>

      {/* Date Card & Action CTA */}
      <div className="nocturn-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-nocturn-border">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent shrink-0">
            <CalendarIcon className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-xs font-semibold text-nocturn-accent uppercase tracking-wider block">
              Today
            </span>
            <span className="text-base sm:text-lg font-bold text-white block">
              {dateString}
            </span>
          </div>
        </div>

        {hasTasks && (
          <PlanButton
            onClick={handlePlanDay}
            onSmartReschedule={handleSmartReschedule}
            isGenerating={isGenerating}
            disabled={!hasTasks}
            hasPlanned={hasPlanned}
          />
        )}
      </div>

      {/* Main Content Layout */}
      {!hasTasks ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          className="nocturn-card p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 border border-nocturn-border"
        >
          <div className="w-16 h-16 rounded-3xl bg-nocturn-accent/10 border border-nocturn-accent/25 flex items-center justify-center text-nocturn-accent">
            <CheckCircle2 className="w-8 h-8 stroke-[2]" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h3 className="text-lg sm:text-xl font-bold text-white">
              You're all caught up.
            </h3>
            <p className="text-xs sm:text-sm text-nocturn-muted leading-relaxed">
              No tasks need your attention today.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/tasks"
              className="nocturn-btn-primary py-2.5 px-6 text-sm font-semibold inline-flex items-center gap-2"
            >
              <CheckSquare className="w-4 h-4 stroke-[2.2]" />
              Add a task
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* Missed Tasks Carried Forward Banner */}
          <MissedTasksBanner overdueTasks={overdueTasks} />

          {/* Planning Style Intensity Selector */}
          <PlanningStyleSelector
            selectedStyle={planningStyle}
            onSelectStyle={setPlanningStyle}
          />

          {/* Optional User Instructions Field */}
          <div className="nocturn-card p-5 sm:p-6 space-y-3 border border-nocturn-border">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <MessageSquare className="w-4 h-4 text-nocturn-accent" />
              <span>Anything I should consider?</span>
            </div>
            <input
              type="text"
              value={userInstruction}
              onChange={(e) => setUserInstruction(e.target.value)}
              placeholder="e.g. I have a meeting at 3 PM and want to finish my project first."
              className="w-full nocturn-input text-xs sm:text-sm"
            />
          </div>

          {/* Today's Tasks List Preview */}
          <TodayTasksList
            tasks={planTaskInput}
            onToggleTask={handleToggleTask}
          />

          {/* Generated Schedule Timeline or Planning Callout */}
          <AnimatePresence mode="wait">
            {hasPlanned && activeSchedule.length > 0 ? (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <ScheduleTimeline
                  schedule={activeSchedule}
                  onToggleTask={handleToggleTask}
                  onUpdateBlock={handleUpdateBlock}
                  onRemoveBlock={handleRemoveBlock}
                  onMoveBlock={handleMoveBlock}
                />
              </motion.div>
            ) : !isGenerating ? (
              <motion.div
                key="callout"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="nocturn-card p-8 sm:p-10 text-center flex flex-col items-center justify-center space-y-3.5 border border-nocturn-border"
              >
                <div className="w-12 h-12 rounded-2xl bg-nocturn-accent/10 border border-nocturn-accent/25 flex items-center justify-center text-nocturn-accent">
                  <Sparkles className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-semibold text-white">
                    Ready to generate your schedule
                  </h3>
                  <p className="text-xs sm:text-sm text-nocturn-muted max-w-sm mx-auto">
                    Click <strong className="text-white font-medium">"Plan My Day"</strong> above to turn your current tasks into an organized time-blocked timeline.
                  </p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
