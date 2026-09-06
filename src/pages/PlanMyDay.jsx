import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Clock,
  Calendar,
  CheckCircle2,
  Play,
  Coffee,
  RefreshCw,
  AlertCircle,
  Plus,
  Zap,
  Check,
} from 'lucide-react'
import { useTasks } from '../context/useTasks'
import { useTimerSettings } from '../context/useTimerSettings'
import { useTimerSession } from '../context/useTimerSession'
import { generateDailyPlan } from '../services/geminiPlannerService'
import { savePlanSchedule, getPlanSchedule } from '../services/plannerPersistenceService'
import { formatDateKey } from '../services/calendarService'

const EXAMPLE_PROMPTS = [
  "I have class from 9 to 2, gym at 6, need to study DSA, finish my project, revise vocabulary and complete today's assignments.",
  "Deep focus morning for project coding, team sync at 2 PM, revision block, and workout in evening.",
  "GRE prep day: 2 quant focus sessions, 1 vocab review sprint, essay practice, lunch break at 1 PM.",
]

export default function PlanMyDay() {
  const navigate = useNavigate()
  const { tasks, addTask, toggleTask } = useTasks()
  const { updateSettings } = useTimerSettings()
  const { startTimer } = useTimerSession()

  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [plan, setPlan] = useState(null)
  const [appliedTaskTitles, setAppliedTaskTitles] = useState(() => new Set())
  const [feedbackMsg, setFeedbackMsg] = useState(null)
  const [isApplying, setIsApplying] = useState(false)

  const todayKey = useMemo(() => formatDateKey(new Date()), [])
  const dateString = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }, [])

  // Load persisted plan on mount
  useEffect(() => {
    let isMounted = true
    getPlanSchedule(todayKey).then((saved) => {
      if (!isMounted || !saved) return
      if (saved.blocks && saved.blocks.length > 0) {
        setPlan({
          summary: saved.summary || 'Your custom daily schedule.',
          recommendedTimer: saved.recommendedTimer || {
            focusDuration: 50,
            shortBreakDuration: 10,
            longBreakDuration: 20,
            sessions: 4,
          },
          blocks: saved.blocks,
          suggestedNewTasks: saved.suggestedNewTasks || [],
        })
      }
      if (saved.userInstruction) {
        setPrompt(saved.userInstruction)
      }
      if (Array.isArray(saved.appliedTaskTitles)) {
        setAppliedTaskTitles(new Set(saved.appliedTaskTitles))
      }
    })
    return () => {
      isMounted = false
    }
  }, [todayKey])

  // Count uncompleted existing tasks
  const existingActiveTasks = useMemo(() => {
    return (tasks || []).filter((t) => !t.completed)
  }, [tasks])

  // Generate Plan Handler
  const handleGeneratePlan = async () => {
    setErrorMsg(null)
    setIsGenerating(true)
    setFeedbackMsg(null)

    try {
      const generated = await generateDailyPlan({
        userPrompt: prompt,
        existingTasks: tasks || [],
        currentTime: new Date(),
      })

      if (!generated || !generated.blocks || generated.blocks.length === 0) {
        throw new Error('Could not generate schedule. Please try a different prompt.')
      }

      setPlan(generated)

      // Persist to Dexie
      await savePlanSchedule({
        summary: generated.summary,
        recommendedTimer: generated.recommendedTimer,
        blocks: generated.blocks,
        suggestedNewTasks: generated.suggestedNewTasks,
        appliedTaskTitles: Array.from(appliedTaskTitles),
        userInstruction: prompt,
      })
    } catch (err) {
      setErrorMsg(err.message || 'Failed to generate plan. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Apply Timer Settings and Launch Focus
  const handleApplyTimerAndFocus = async (block = null) => {
    const timerConfig = plan?.recommendedTimer || {
      focusDuration: 50,
      shortBreakDuration: 10,
      longBreakDuration: 20,
      sessions: 4,
    }

    try {
      // 1. Update timer configuration through existing sync pipeline
      await updateSettings({
        focusDuration: timerConfig.focusDuration,
        shortBreakDuration: timerConfig.shortBreakDuration,
        longBreakDuration: timerConfig.longBreakDuration,
        sessions: timerConfig.sessions,
      })

      // 2. Start timer with target task name
      const targetName = block?.title || (plan?.blocks || []).find((b) => b.type === 'focus')?.title || 'Focus Session'
      const targetTaskId = block?.taskId || null
      await startTimer(targetName, targetTaskId, 'focus', timerConfig.focusDuration)

      // 3. Navigate to Timer
      navigate('/timer')
    } catch (err) {
      console.error('[PlanMyDay] Failed to apply timer settings:', err)
      navigate('/timer')
    }
  }

  // Add all suggested new tasks to user's real task list
  const handleAcceptAndAddTasks = async () => {
    if (!plan?.suggestedNewTasks || plan.suggestedNewTasks.length === 0) return
    setIsApplying(true)

    const newlyAdded = new Set(appliedTaskTitles)
    let addedCount = 0

    for (const item of plan.suggestedNewTasks) {
      if (!newlyAdded.has(item.title)) {
        try {
          await addTask(item.title, 'tasks', todayKey, item.priority || 'medium')
          newlyAdded.add(item.title)
          addedCount++
        } catch (err) {
          console.warn('[PlanMyDay] Could not add task:', item.title, err)
        }
      }
    }

    setAppliedTaskTitles(newlyAdded)
    setIsApplying(false)

    // Update persistence record with applied list
    if (plan) {
      savePlanSchedule({
        ...plan,
        appliedTaskTitles: Array.from(newlyAdded),
        userInstruction: prompt,
      }).catch(console.error)
    }

    setFeedbackMsg(
      addedCount > 0
        ? `Successfully added ${addedCount} suggested task${addedCount > 1 ? 's' : ''} to your task list.`
        : 'All suggested tasks are already in your task list.'
    )
    setTimeout(() => setFeedbackMsg(null), 4000)
  }

  // Add single suggested task
  const handleAddSingleTask = async (title, priority = 'medium') => {
    if (appliedTaskTitles.has(title)) return
    try {
      await addTask(title, 'tasks', todayKey, priority)
      const updated = new Set(appliedTaskTitles)
      updated.add(title)
      setAppliedTaskTitles(updated)

      if (plan) {
        savePlanSchedule({
          ...plan,
          appliedTaskTitles: Array.from(updated),
          userInstruction: prompt,
        }).catch(console.error)
      }

      setFeedbackMsg(`Added "${title}" to your tasks.`)
      setTimeout(() => setFeedbackMsg(null), 3000)
    } catch (err) {
      console.warn('[PlanMyDay] Could not add single task:', title, err)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8"
    >
      {/* Header Section */}
      <header className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent shrink-0">
            <Sparkles className="w-4 h-4 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Plan My Day
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-nocturn-muted">
          Turn your commitments, classes, and goals into a realistic time-blocked focus schedule.
        </p>
      </header>

      {/* Date & Context Bar */}
      <div className="nocturn-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border border-nocturn-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-nocturn-surface border border-nocturn-border flex items-center justify-center text-nocturn-accent shrink-0">
            <Calendar className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-nocturn-accent uppercase tracking-wider block">
              Today
            </span>
            <span className="text-sm sm:text-base font-bold text-white">
              {dateString}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/5 border border-nocturn-border text-nocturn-muted">
            {existingActiveTasks.length > 0
              ? `${existingActiveTasks.length} existing task${existingActiveTasks.length > 1 ? 's' : ''} in context`
              : '0 existing tasks • Gemini will build a fresh day plan'}
          </span>
        </div>
      </div>

      {/* Planning Prompt Card */}
      <div className="nocturn-card p-5 sm:p-6 space-y-4 border border-nocturn-border">
        <div className="space-y-1.5">
          <label htmlFor="plan-prompt" className="text-xs sm:text-sm font-bold text-white flex items-center justify-between">
            <span>What does your day look like?</span>
            <span className="text-[11px] font-normal text-nocturn-muted">Natural language input</span>
          </label>
          <textarea
            id="plan-prompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. I have class from 9 to 2, gym at 6, need to study DSA, finish my project, revise vocabulary and complete today's assignments."
            className="w-full nocturn-input text-sm p-3.5 leading-relaxed resize-none focus:border-nocturn-accent transition-colors"
          />
        </div>

        {/* Quick Example Chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-nocturn-muted block">Example prompts:</span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPrompt(ex)}
                className="text-left text-xs px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-nocturn-text border border-nocturn-border/80 hover:border-nocturn-accent/40 transition-all cursor-pointer"
              >
                {ex.length > 60 ? ex.slice(0, 60) + '...' : ex}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-between gap-3">
          {prompt.trim() && (
            <button
              type="button"
              onClick={() => setPrompt('')}
              className="text-xs text-nocturn-muted hover:text-white transition-colors"
            >
              Clear prompt
            </button>
          )}
          <button
            type="button"
            disabled={isGenerating || !prompt.trim()}
            onClick={handleGeneratePlan}
            className="ml-auto py-3 px-6 rounded-2xl bg-nocturn-accent text-black font-bold text-sm hover:bg-nocturn-accent-bright shadow-[0_0_20px_rgba(var(--color-nocturn-accent-rgb),0.35)] transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating Schedule...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>{plan ? 'Regenerate Plan' : 'Generate Plan'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <span className="font-semibold block">Planning Notice</span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Loading State Animation */}
      {isGenerating && (
        <div className="nocturn-card p-10 text-center flex flex-col items-center justify-center space-y-4 border border-nocturn-border">
          <div className="w-14 h-14 rounded-2xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent animate-pulse shadow-[0_0_25px_rgba(var(--color-nocturn-accent-rgb),0.4)]">
            <Sparkles className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-white">Analyzing Schedule</h3>
            <p className="text-xs text-nocturn-muted">
              Structuring your day with realistic focus blocks, breaks, and commitments...
            </p>
          </div>
        </div>
      )}

      {/* Generated Plan Section */}
      {!isGenerating && plan && (
        <div className="space-y-6">
          {/* Summary & Recommended Timer Banner */}
          <div className="nocturn-card p-5 sm:p-6 border border-nocturn-border/90 bg-gradient-to-r from-nocturn-card via-nocturn-surface/40 to-nocturn-card space-y-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-nocturn-accent uppercase tracking-wider block">
                Schedule Overview
              </span>
              <p className="text-sm sm:text-base font-medium text-white leading-relaxed">
                {plan.summary}
              </p>
            </div>

            {/* Timer Recommendation Widget */}
            {plan.recommendedTimer && (
              <div className="p-4 rounded-2xl bg-nocturn-surface/70 border border-nocturn-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent shrink-0">
                    <Zap className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-nocturn-muted block">
                      Recommended Focus Structure
                    </span>
                    <span className="text-sm sm:text-base font-bold text-white">
                      {plan.recommendedTimer.focusDuration}m Focus · {plan.recommendedTimer.shortBreakDuration}m Break · {plan.recommendedTimer.sessions} Sessions
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyTimerAndFocus()}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-nocturn-accent text-black font-bold text-xs hover:bg-nocturn-accent-bright shadow-[0_0_15px_rgba(var(--color-nocturn-accent-rgb),0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Apply & Start Timer</span>
                </button>
              </div>
            )}

            {/* Suggested New Tasks Acceptance Bar */}
            {plan.suggestedNewTasks && plan.suggestedNewTasks.length > 0 && (
              <div className="pt-2 border-t border-nocturn-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs text-nocturn-muted">
                  <span className="text-white font-semibold">{plan.suggestedNewTasks.length}</span> suggested tasks extracted from your prompt.
                </div>
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={handleAcceptAndAddTasks}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-nocturn-border transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-nocturn-accent" />
                  <span>Add Suggested Tasks to List</span>
                </button>
              </div>
            )}
          </div>

          {/* Vertical Timetable / Time Blocks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <Clock className="w-4 h-4 text-nocturn-accent" />
                <span>Timeline Timetable</span>
              </h2>
              <span className="text-xs text-nocturn-muted">
                {plan.blocks.length} time blocks
              </span>
            </div>

            <div className="space-y-3">
              {plan.blocks.map((block, idx) => {
                const isFocus = block.type === 'focus'
                const isBreak = block.type === 'break'
                const isEvent = block.type === 'event'
                const isExisting = block.isExisting
                const isTaskApplied = appliedTaskTitles.has(block.title)

                // Task completion state if existing
                const existingTaskObj = isExisting && block.taskId ? tasks.find((t) => t.id === block.taskId) : null
                const isCompleted = existingTaskObj ? Boolean(existingTaskObj.completed) : false

                return (
                  <div
                    key={block.id || idx}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isFocus
                        ? 'bg-nocturn-card border-nocturn-accent/40 shadow-[0_0_15px_rgba(var(--color-nocturn-accent-rgb),0.1)]'
                        : isBreak
                        ? 'bg-indigo-950/20 border-indigo-500/30'
                        : isEvent
                        ? 'bg-nocturn-surface/40 border-nocturn-border'
                        : 'bg-nocturn-card border-nocturn-border'
                    }`}
                  >
                    {/* Left Details: Time + Title */}
                    <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                      {/* Checkbox for existing task */}
                      {isExisting && block.taskId ? (
                        <button
                          type="button"
                          onClick={() => toggleTask(block.taskId)}
                          className={`w-5 h-5 mt-0.5 sm:mt-0 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                            isCompleted
                              ? 'bg-nocturn-accent border-nocturn-accent text-black'
                              : 'border-nocturn-border hover:border-nocturn-accent/60'
                          }`}
                        >
                          {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      ) : (
                        <div
                          className={`w-5 h-5 mt-0.5 sm:mt-0 rounded-lg flex items-center justify-center shrink-0 ${
                            isFocus
                              ? 'text-nocturn-accent'
                              : isBreak
                              ? 'text-indigo-400'
                              : 'text-nocturn-muted'
                          }`}
                        >
                          {isBreak ? <Coffee className="w-4 h-4" /> : isFocus ? <Zap className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                      )}

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`text-sm sm:text-base font-bold truncate ${
                              isCompleted ? 'line-through text-nocturn-muted' : 'text-white'
                            }`}
                          >
                            {block.title}
                          </h3>

                          {/* Block Type Badge */}
                          {isFocus && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-nocturn-accent/15 text-nocturn-accent border border-nocturn-accent/30">
                              Focus Session
                            </span>
                          )}
                          {isBreak && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              Break
                            </span>
                          )}
                          {isEvent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-nocturn-muted border border-nocturn-border">
                              Event
                            </span>
                          )}
                          {isExisting && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Existing Task
                            </span>
                          )}
                          {!isExisting && !isBreak && !isEvent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              {isTaskApplied ? 'Added to Tasks' : 'Suggested Task'}
                            </span>
                          )}
                        </div>

                        {block.notes && (
                          <p className="text-xs text-nocturn-muted line-clamp-1">
                            {block.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Details: Time Range + Action Buttons */}
                    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-white block">
                          {block.startTime} – {block.endTime}
                        </span>
                        <span className="text-[11px] text-nocturn-muted block">
                          {block.durationMinutes} min
                        </span>
                      </div>

                      {isFocus && (
                        <button
                          type="button"
                          onClick={() => handleApplyTimerAndFocus(block)}
                          className="px-3 py-1.5 rounded-xl bg-nocturn-accent/20 hover:bg-nocturn-accent/30 text-nocturn-accent border border-nocturn-accent/40 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Focus</span>
                        </button>
                      )}

                      {!isExisting && !isBreak && !isEvent && !isTaskApplied && (
                        <button
                          type="button"
                          onClick={() => handleAddSingleTask(block.title, block.priority)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-nocturn-muted hover:text-white border border-nocturn-border text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-nocturn-accent" />
                          <span>Add Task</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
