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
  Sliders,
  Square,
  Edit3,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { useTasks } from '../context/useTasks'
import { useTimerSession } from '../context/useTimerSession'
import { useToast } from '../context/useToast'
import { generateDailyPlan } from '../services/geminiPlannerService'
import { savePlanSchedule, getPlanSchedule } from '../services/plannerPersistenceService'
import { formatDateKey } from '../services/calendarService'
import { Modal } from '../components/ui/Modal'
import { Skeleton } from '../components/ui/Skeleton'
import FlowingLines from '../components/common/FlowingLines'

const EXAMPLE_PROMPTS = [
  "I have class from 9 to 2, gym at 6, need to study DSA, finish my project, revise vocabulary and complete today's assignments.",
  "Deep focus morning for project coding, team sync at 2 PM, revision block, and workout in evening.",
  "GRE prep day: 2 quant focus sessions, 1 vocab review sprint, essay practice, lunch break at 1 PM.",
]

export default function PlanMyDay() {
  const navigate = useNavigate()
  const { tasks, addTask, toggleTask, deleteTask } = useTasks()
  const { startPlanSession, isRunning, taskName, terminateTimer, justCompletedBlockId } = useTimerSession()
  const { addToast } = useToast()

  const [prompt, setPrompt] = useState('')
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [plan, setPlan] = useState(null)
  const [appliedTaskTitles, setAppliedTaskTitles] = useState(() => new Set())
  const [feedbackMsg, setFeedbackMsg] = useState(null)
  const [isApplying, setIsApplying] = useState(false)
  const [isEditingTimer, setIsEditingTimer] = useState(false)
  const [customFocusDuration, setCustomFocusDuration] = useState(50)
  const [customBreakDuration, setCustomBreakDuration] = useState(10)
  const [customLongBreakDuration, setCustomLongBreakDuration] = useState(20)
  const [customSessions, setCustomSessions] = useState(4)

  // Plan overwrite confirmation modal
  const [showReplaceModal, setShowReplaceModal] = useState(false)

  // Block editing modal
  const [editingBlock, setEditingBlock] = useState(null)

  // Add block modal
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false)
  const [newBlockTitle, setNewBlockTitle] = useState('')
  const [newBlockType, setNewBlockType] = useState('focus')
  const [newBlockStartTime, setNewBlockStartTime] = useState('10:00')
  const [newBlockEndTime, setNewBlockEndTime] = useState('10:45')
  const [newBlockDuration, setNewBlockDuration] = useState(45)

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
    getPlanSchedule(todayKey)
      .then((saved) => {
        if (!isMounted || !saved) return
        if (saved.blocks && saved.blocks.length > 0) {
          const rt = saved.recommendedTimer || {
            focusDuration: 50,
            shortBreakDuration: 10,
            longBreakDuration: 20,
            sessions: 4,
          }
          setPlan({
            summary: saved.summary || 'Your custom daily schedule.',
            recommendedTimer: rt,
            blocks: saved.blocks,
            suggestedNewTasks: saved.suggestedNewTasks || [],
          })
          if (rt.focusDuration) setCustomFocusDuration(Number(rt.focusDuration) || 50)
          if (rt.shortBreakDuration) setCustomBreakDuration(Number(rt.shortBreakDuration) || 10)
          if (rt.longBreakDuration) setCustomLongBreakDuration(Number(rt.longBreakDuration) || 20)
          if (rt.sessions) setCustomSessions(Number(rt.sessions) || 4)
        }
        if (saved.userInstruction) {
          setPrompt(saved.userInstruction)
        }
        if (Array.isArray(saved.appliedTaskTitles)) {
          setAppliedTaskTitles(new Set(saved.appliedTaskTitles))
        }
      })
      .catch((err) => {
        console.warn('Could not load saved plan schedule:', err)
      })
      .finally(() => {
        if (isMounted) setIsInitialLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [todayKey])

  // Count uncompleted existing tasks
  const existingActiveTasks = useMemo(() => {
    return (tasks || []).filter((t) => !t.completed)
  }, [tasks])

  // Identify next upcoming incomplete focus block
  const nextFocusBlock = useMemo(() => {
    if (!plan?.blocks) return null
    return plan.blocks.find((b) => {
      if (b.type !== 'focus' && b.blockType !== 'focus') return false
      if (b.completed) return false
      if (b.taskId) {
        const matchingTask = tasks.find((t) => t.id === b.taskId)
        if (matchingTask?.completed) return false
      }
      return true
    })
  }, [plan, tasks])

  // Initiate Plan Generation: asks confirmation if replacing an active unfinished plan
  const handleInitiateGeneratePlan = () => {
    if (!prompt.trim()) return
    const hasUnfinishedBlocks =
      plan &&
      Array.isArray(plan.blocks) &&
      plan.blocks.length > 0 &&
      plan.blocks.some((b) => !b.completed)

    if (hasUnfinishedBlocks) {
      setShowReplaceModal(true)
    } else {
      executePlanGeneration([])
    }
  }

  // Confirmed Plan Replacement
  const handleConfirmReplacePlan = async () => {
    setShowReplaceModal(false)

    // Snapshot current plan and active plan-generated tasks for undo
    const previousPlanSnapshot = plan ? JSON.parse(JSON.stringify(plan)) : null
    const previousTasksSnapshot = (tasks || [])
      .filter((t) => t.source === 'plan_generated' && !t.completed)
      .map((t) => ({ ...t }))

    // 1. Keep completed focus blocks
    const completedBlocks = (plan?.blocks || []).filter((b) => b.completed)

    // 2. Remove unfinished plan-generated tasks ONLY (never delete user-created tasks)
    const tasksToRemove = (tasks || []).filter(
      (t) => t.source === 'plan_generated' && !t.completed
    )
    for (const t of tasksToRemove) {
      try {
        await deleteTask(t.id, false)
      } catch (err) {
        console.warn('Could not delete old plan-generated task:', t.id, err)
      }
    }

    // 3. Generate new plan
    await executePlanGeneration(completedBlocks)

    if (previousPlanSnapshot) {
      addToast('Schedule updated with new plan', {
        type: 'info',
        duration: 7000,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              setPlan(previousPlanSnapshot)
              await savePlanSchedule(previousPlanSnapshot)
              for (const pt of previousTasksSnapshot) {
                await addTask(
                  pt.title,
                  pt.category || 'tasks',
                  pt.due_date || todayKey,
                  pt.priority || 'medium',
                  pt.completed || false,
                  pt.my_day !== undefined ? pt.my_day : true,
                  'plan_generated'
                )
              }
              addToast('Previous plan restored', 'success')
            } catch (err) {
              console.error('Failed to restore previous plan:', err)
              addToast('Could not restore previous plan', 'error')
            }
          },
        },
      })
    }
  }

  // Core generation execution
  const executePlanGeneration = async (completedBlocksToKeep = []) => {
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

      // Merge historical completed blocks if any
      const mergedBlocks = [...completedBlocksToKeep, ...generated.blocks]
      const finalPlan = {
        ...generated,
        blocks: mergedBlocks,
      }

      setPlan(finalPlan)
      if (generated.recommendedTimer) {
        if (generated.recommendedTimer.focusDuration) setCustomFocusDuration(Number(generated.recommendedTimer.focusDuration) || 50)
        if (generated.recommendedTimer.shortBreakDuration) setCustomBreakDuration(Number(generated.recommendedTimer.shortBreakDuration) || 10)
        if (generated.recommendedTimer.longBreakDuration) setCustomLongBreakDuration(Number(generated.recommendedTimer.longBreakDuration) || 20)
        if (generated.recommendedTimer.sessions) setCustomSessions(Number(generated.recommendedTimer.sessions) || 4)
      }

      // Automatically create real tasks with source: 'plan_generated'
      const newAppliedTitles = new Set(appliedTaskTitles)
      const updatedBlocks = [...finalPlan.blocks]

      for (const item of finalPlan.suggestedNewTasks || []) {
        if (!newAppliedTitles.has(item.title)) {
          try {
            const created = await addTask(item.title, 'tasks', todayKey, item.priority || 'medium', false, true, 'plan_generated')
            newAppliedTitles.add(item.title)
            if (created?.id) {
              for (const b of updatedBlocks) {
                if (!b.taskId && b.title.toLowerCase() === item.title.toLowerCase()) {
                  b.taskId = created.id
                  b.task_id = created.id
                  b.isExisting = true
                }
              }
            }
          } catch (err) {
            console.warn('[PlanMyDay] auto-add suggested task notice:', err)
          }
        }
      }

      setAppliedTaskTitles(newAppliedTitles)
      finalPlan.blocks = updatedBlocks

      // Persist to Dexie
      await savePlanSchedule({
        summary: finalPlan.summary,
        recommendedTimer: finalPlan.recommendedTimer,
        blocks: finalPlan.blocks,
        suggestedNewTasks: finalPlan.suggestedNewTasks,
        appliedTaskTitles: Array.from(newAppliedTitles),
        userInstruction: prompt,
      })
    } catch (err) {
      setErrorMsg(err.message || 'Failed to generate plan. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Block Editing Handlers
  const handleSaveBlockEdit = async () => {
    if (!editingBlock || !editingBlock.id) return
    const updatedBlocks = (plan?.blocks || []).map((b) =>
      b.id === editingBlock.id ? { ...b, ...editingBlock } : b
    )
    const updatedPlan = { ...plan, blocks: updatedBlocks }
    setPlan(updatedPlan)
    setEditingBlock(null)
    await savePlanSchedule(updatedPlan).catch(console.error)
  }

  const handleDeleteBlock = async (blockId) => {
    const blockToDelete = (plan?.blocks || []).find((b) => b.id === blockId)
    const updatedBlocks = (plan?.blocks || []).filter((b) => b.id !== blockId)
    const updatedPlan = { ...plan, blocks: updatedBlocks }
    setPlan(updatedPlan)
    setEditingBlock(null)
    await savePlanSchedule(updatedPlan).catch(console.error)

    if (blockToDelete) {
      addToast(`Removed "${blockToDelete.title || blockToDelete.taskTitle || 'Block'}"`, {
        type: 'info',
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: async () => {
            const restoredBlocks = [...(updatedPlan.blocks || []), blockToDelete].sort((a, b) => {
              const [ha, ma] = (a.startTime || '00:00').split(':').map(Number)
              const [hb, mb] = (b.startTime || '00:00').split(':').map(Number)
              return ha * 60 + ma - (hb * 60 + mb)
            })
            const restoredPlan = { ...updatedPlan, blocks: restoredBlocks }
            setPlan(restoredPlan)
            await savePlanSchedule(restoredPlan).catch(console.error)
            addToast('Block restored', 'success')
          },
        },
      })
    }
  }

  const handleAddNewBlock = async () => {
    if (!newBlockTitle.trim()) return
    const newBlock = {
      id: 'block-' + Date.now(),
      taskId: null,
      task_id: null,
      taskTitle: newBlockTitle.trim(),
      title: newBlockTitle.trim(),
      startTime: newBlockStartTime || '10:00',
      endTime: newBlockEndTime || '10:45',
      durationMinutes: Number(newBlockDuration) || 45,
      duration: Number(newBlockDuration) || 45,
      type: newBlockType || 'focus',
      blockType: newBlockType || 'focus',
      focusDuration: Number(newBlockDuration) || 45,
      breakDuration: 10,
      sessionNumber: null,
      completed: false,
      sourcePlanId: plan?.id || 'plan-' + Date.now(),
      isExisting: false,
      priority: 'medium',
      notes: '',
    }

    const updatedBlocks = [...(plan?.blocks || []), newBlock].sort((a, b) => {
      const [ha, ma] = (a.startTime || '00:00').split(':').map(Number)
      const [hb, mb] = (b.startTime || '00:00').split(':').map(Number)
      return (ha * 60 + ma) - (hb * 60 + mb)
    })

    const updatedPlan = { ...plan, blocks: updatedBlocks }
    setPlan(updatedPlan)
    setIsAddBlockOpen(false)
    setNewBlockTitle('')
    await savePlanSchedule(updatedPlan).catch(console.error)
  }

  // Apply Timer Settings and Launch Focus or Break Session
  const handleApplyTimerAndFocus = async (block = null) => {
    const timerConfig = {
      focusDuration: Number(customFocusDuration) || plan?.recommendedTimer?.focusDuration || 25,
      shortBreakDuration: Number(customBreakDuration) || plan?.recommendedTimer?.shortBreakDuration || 5,
      longBreakDuration: Number(customLongBreakDuration) || plan?.recommendedTimer?.longBreakDuration || 15,
      sessions: Number(customSessions) || plan?.recommendedTimer?.sessions || 4,
    }

    const allBlocks = plan?.blocks || []
    const focusBlocks = allBlocks.filter((b) => b.type === 'focus')
    const totalFocusCycles = Number(timerConfig.sessions) || (focusBlocks.length > 0 ? focusBlocks.length : 4)

    try {
      if (block && block.type === 'break') {
        // User explicitly launched a Break block
        const breakMins = Number(block.durationMinutes) || Number(timerConfig.shortBreakDuration) || 5
        const breakMode = breakMins >= 15 ? 'longBreak' : 'shortBreak'

        await startPlanSession({
          durationMinutes: breakMins,
          breakDurationMinutes: breakMins,
          sessionIndex: 1,
          totalSessions: totalFocusCycles,
          taskName: block.title || 'Break Session',
          taskId: null,
          planBlockId: block.id || null,
          planId: plan?.id || null,
          blockTimeRange: (block.startTime && block.endTime) ? `${block.startTime} — ${block.endTime}` : null,
          mode: breakMode,
        })
      } else {
        // Focus block or generic "Start Plan"
        let targetBlock = block
        let sessionIndex = 1

        if (targetBlock && targetBlock.type === 'focus') {
          const idx = focusBlocks.findIndex(
            (b) => b.id === targetBlock.id || b.title === targetBlock.title
          )
          sessionIndex = idx >= 0 ? idx + 1 : 1
        } else {
          targetBlock = focusBlocks[0] || allBlocks[0] || null
          sessionIndex = 1
        }

        // Determine adjacent break duration
        let adjacentBreakMins = Number(timerConfig.shortBreakDuration) || 5
        if (targetBlock) {
          const blockIdx = allBlocks.findIndex(
            (b) => b.id === targetBlock.id || b === targetBlock
          )
          if (blockIdx >= 0) {
            const nextBreak = allBlocks.slice(blockIdx + 1).find((b) => b.type === 'break')
            if (nextBreak && Number(nextBreak.durationMinutes) > 0) {
              adjacentBreakMins = Number(nextBreak.durationMinutes)
            }
          }
        }

        const focusDurationMins =
          Number(targetBlock?.durationMinutes) || Number(timerConfig.focusDuration) || 25
        const targetTitle = targetBlock?.title || 'Focus Session'
        const targetTaskId = targetBlock?.taskId || null

        await startPlanSession({
          durationMinutes: focusDurationMins,
          breakDurationMinutes: adjacentBreakMins,
          sessionIndex,
          totalSessions: totalFocusCycles,
          taskName: targetTitle,
          taskId: targetTaskId,
          planBlockId: targetBlock?.id || null,
          planId: plan?.id || null,
          blockTimeRange: (targetBlock?.startTime && targetBlock?.endTime) ? `${targetBlock.startTime} — ${targetBlock.endTime}` : null,
          mode: 'focus',
        })
      }

      navigate('/timer')
    } catch (err) {
      console.error('[PlanMyDay] Failed to apply plan timer session:', err)
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
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-nocturn-accent stroke-[2]" />
          <span>Plan My Day</span>
        </h1>
        <p className="text-xs sm:text-sm text-nocturn-muted">
          Tell Nocturn what you need to get done.
        </p>
      </header>

      {/* Date & Context Bar */}
      <div className="relative overflow-hidden bg-nocturn-card border border-nocturn-border rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <FlowingLines variant="orbital" opacity={0.08} />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-accent shrink-0">
            <Calendar className="w-4.5 h-4.5 stroke-[2]" />
          </div>
          <div>
            <span className="text-[10px] font-medium text-nocturn-muted uppercase tracking-wider block">
              Today's Schedule
            </span>
            <span className="text-sm sm:text-base font-semibold text-white">
              {dateString}
            </span>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-nocturn-muted">
            {existingActiveTasks.length > 0
              ? `${existingActiveTasks.length} task${existingActiveTasks.length > 1 ? 's' : ''} in context`
              : '0 tasks in context'}
          </span>
        </div>
      </div>

      {/* Planning Prompt Card */}
      <div className="relative overflow-hidden bg-nocturn-card border border-nocturn-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <FlowingLines variant="corner" opacity={0.06} />
        <div className="relative z-10 space-y-2">
          <label htmlFor="plan-prompt" className="text-xs sm:text-sm font-medium text-white flex items-center justify-between">
            <span>What does your day look like?</span>
            <span className="text-[11px] font-normal text-nocturn-muted">Natural language prompt</span>
          </label>
          <textarea
            id="plan-prompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Tell me everything you need to accomplish today..."
            className="w-full bg-nocturn-surface border border-nocturn-border rounded-xl text-sm p-3.5 text-white placeholder:text-nocturn-muted/60 leading-relaxed resize-y focus:border-nocturn-accent focus:ring-2 focus:ring-nocturn-accent/20 outline-none transition-all"
          />
        </div>

        {/* Quick Example Chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-medium text-nocturn-muted block">Example prompts:</span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPrompt(ex)}
                className="text-left text-xs px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] text-nocturn-muted hover:text-white border border-white/[0.06] hover:border-white/15 transition-all duration-150 cursor-pointer"
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
              className="text-xs text-nocturn-muted hover:text-white transition-colors cursor-pointer"
            >
              Clear prompt
            </button>
          )}
          <button
            type="button"
            disabled={isGenerating || !prompt.trim()}
            onClick={handleInitiateGeneratePlan}
            className="ml-auto py-2.5 px-5 rounded-xl bg-nocturn-accent text-white font-medium text-sm hover:bg-nocturn-accent-bright transition-all duration-150 flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating plan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Plan</span>
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

      {/* Initial Loading Skeleton */}
      {isInitialLoading && (
        <div className="space-y-4 pt-2" aria-label="Loading your schedule...">
          <div className="nocturn-card p-5 border border-nocturn-border space-y-3">
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-5 w-4/5 rounded-md" />
            <Skeleton className="h-12 w-full rounded-xl opacity-60" />
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-nocturn-border/60 bg-nocturn-card/40 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-6 rounded-md shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-40 rounded-md" />
                    <Skeleton className="h-3 w-20 rounded-md opacity-60" />
                  </div>
                </div>
                <Skeleton className="w-16 h-8 rounded-lg shrink-0 opacity-50" />
              </div>
            ))}
          </div>
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
              <div className="p-4 sm:p-5 rounded-2xl bg-nocturn-surface/70 border border-nocturn-border space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent shrink-0">
                      <Zap className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-nocturn-muted block">
                          Recommended Focus Structure
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditingTimer((prev) => !prev)}
                          className="text-[11px] text-nocturn-accent hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>{isEditingTimer ? 'Done' : 'Customize'}</span>
                        </button>
                      </div>
                      <span className="text-sm sm:text-base font-bold text-white">
                        {customFocusDuration}m Focus · {customBreakDuration}m Break · {customSessions} Sessions
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

                {/* Customizable Timer Inputs before starting */}
                {isEditingTimer && (
                  <div className="pt-3 border-t border-nocturn-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-nocturn-muted block mb-1">
                        Focus (mins)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={customFocusDuration}
                        onChange={(e) => setCustomFocusDuration(Math.max(1, Number(e.target.value) || 1))}
                        className="nocturn-input text-xs py-1.5 px-2.5 w-full font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-nocturn-muted block mb-1">
                        Short Break (mins)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={customBreakDuration}
                        onChange={(e) => setCustomBreakDuration(Math.max(1, Number(e.target.value) || 1))}
                        className="nocturn-input text-xs py-1.5 px-2.5 w-full font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-nocturn-muted block mb-1">
                        Long Break (mins)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={customLongBreakDuration}
                        onChange={(e) => setCustomLongBreakDuration(Math.max(1, Number(e.target.value) || 1))}
                        className="nocturn-input text-xs py-1.5 px-2.5 w-full font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-nocturn-muted block mb-1">
                        Sessions
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={customSessions}
                        onChange={(e) => setCustomSessions(Math.max(1, Number(e.target.value) || 1))}
                        className="nocturn-input text-xs py-1.5 px-2.5 w-full font-mono"
                      />
                    </div>
                  </div>
                )}
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
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-nocturn-muted">
                  {plan.blocks.length} block{plan.blocks.length !== 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNewBlockTitle('')
                    setNewBlockType('focus')
                    setNewBlockStartTime('10:00')
                    setNewBlockEndTime('10:45')
                    setNewBlockDuration(45)
                    setIsAddBlockOpen(true)
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-nocturn-accent" />
                  <span>Add Block</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {plan.blocks.map((block, idx) => {
                const isFocus = block.type === 'focus'
                const isBreak = block.type === 'break'
                const isEvent = block.type === 'event'
                const isExisting = block.isExisting
                const isTaskApplied = appliedTaskTitles.has(block.title)
                const isBlockActive =
                  isRunning &&
                  (taskName === block.title ||
                    (taskName &&
                      block.title &&
                      taskName.trim().toLowerCase() === block.title.trim().toLowerCase()))

                // Task completion state if existing
                const existingTaskObj = isExisting && block.taskId ? tasks.find((t) => t.id === block.taskId) : null
                const isCompleted = existingTaskObj ? Boolean(existingTaskObj.completed) : false
                const isCompletedBlock = Boolean(block.completed || isCompleted || (justCompletedBlockId && block.id === justCompletedBlockId))

                // Overdue status check
                const now = new Date()
                const currentMinutes = now.getHours() * 60 + now.getMinutes()
                let isOverdue = false
                if (block.endTime && !isCompletedBlock) {
                  const [eh, em] = block.endTime.split(':').map(Number)
                  if (!isNaN(eh) && !isNaN(em)) {
                    const endMinutes = eh * 60 + em
                    if (currentMinutes > endMinutes) {
                      isOverdue = true
                    }
                  }
                }

                // Next up check
                const isNextUp = Boolean(nextFocusBlock && block.id === nextFocusBlock.id && !isBlockActive && !isCompletedBlock)

                return (
                  <div
                    key={block.id || idx}
                    onClick={() => {
                      if (!isBlockActive && (isFocus || isBreak)) {
                        handleApplyTimerAndFocus(block)
                      }
                    }}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer ${
                      isCompletedBlock
                        ? 'bg-nocturn-card/50 border-nocturn-border/40 opacity-75'
                        : isBlockActive
                        ? 'bg-rose-950/25 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/30'
                        : isOverdue
                        ? 'bg-red-950/15 border-red-500/40 shadow-sm'
                        : isNextUp
                        ? 'bg-nocturn-card border-indigo-500/40 shadow-sm'
                        : isFocus
                        ? 'bg-nocturn-card border-nocturn-border hover:border-nocturn-accent/40 shadow-sm'
                        : isBreak
                        ? 'bg-white/[0.02] border-white/[0.05] hover:border-white/10'
                        : 'bg-nocturn-card border-nocturn-border hover:border-white/15'
                    }`}
                  >
                    {/* Left Details: Time + Title */}
                    <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                      {/* Checkbox for existing task */}
                      {isExisting && block.taskId ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => toggleTask(block.taskId)}
                            className={`w-5 h-5 mt-0.5 sm:mt-0 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                              isCompletedBlock
                                ? 'bg-nocturn-accent border-nocturn-accent text-white'
                                : 'border-nocturn-border hover:border-nocturn-accent/60'
                            }`}
                          >
                            {isCompletedBlock && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`w-5 h-5 mt-0.5 sm:mt-0 rounded-lg flex items-center justify-center shrink-0 ${
                            isCompletedBlock
                              ? 'text-emerald-400'
                              : isBlockActive
                              ? 'text-rose-400'
                              : isFocus
                              ? 'text-nocturn-accent-bright'
                              : isBreak
                              ? 'text-amber-400'
                              : 'text-nocturn-muted'
                          }`}
                        >
                          {isCompletedBlock ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : isBreak ? (
                            <Coffee className="w-4 h-4" />
                          ) : isFocus ? (
                            <Zap className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>
                      )}

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`text-sm sm:text-base font-semibold truncate ${
                              isCompletedBlock ? 'line-through text-nocturn-dim' : 'text-white'
                            }`}
                          >
                            {block.title}
                          </h3>

                          {/* Block Status Badges */}
                          {isCompletedBlock && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              Completed
                            </span>
                          )}
                          {isBlockActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                              Active Now
                            </span>
                          )}
                          {isOverdue && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-300 border border-red-500/40">
                              Overdue
                            </span>
                          )}
                          {isNextUp && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                              Next Up
                            </span>
                          )}

                          {isFocus && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-nocturn-accent/15 text-nocturn-accent-bright border border-nocturn-accent/30">
                              Focus
                            </span>
                          )}
                          {isBreak && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Break
                            </span>
                          )}
                          {isEvent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.04] text-nocturn-muted border border-white/[0.06]">
                              Event
                            </span>
                          )}
                          {isExisting && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              Existing Task
                            </span>
                          )}
                          {!isExisting && !isBreak && !isEvent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.04] text-nocturn-muted border border-white/[0.06]">
                              {isTaskApplied ? 'Added to Tasks' : 'Suggested'}
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
                    <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                      <div className="text-right mr-1">
                        <span className="text-xs font-semibold font-mono text-white block">
                          {block.startTime} – {block.endTime}
                        </span>
                        <span className="text-[11px] text-nocturn-muted block">
                          {block.durationMinutes} min
                        </span>
                      </div>

                      {/* Edit Block Button */}
                      <button
                        type="button"
                        onClick={() => setEditingBlock({ ...block })}
                        title="Edit Block"
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-nocturn-muted hover:text-white border border-white/[0.06] transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Block Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(block.id)}
                        title="Delete Block"
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/15 text-nocturn-muted hover:text-rose-300 border border-white/[0.06] hover:border-rose-500/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {isBlockActive ? (
                        <button
                          type="button"
                          onClick={() => terminateTimer()}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          <span>Stop</span>
                        </button>
                      ) : (
                        <>
                          {isFocus && !isCompletedBlock && (
                            <button
                              type="button"
                              onClick={() => handleApplyTimerAndFocus(block)}
                              className="px-3 py-1.5 rounded-xl bg-nocturn-accent text-white hover:bg-nocturn-accent-bright text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Start Focus</span>
                            </button>
                          )}

                          {isBreak && !isCompletedBlock && (
                            <button
                              type="button"
                              onClick={() => handleApplyTimerAndFocus(block)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Coffee className="w-3 h-3" />
                              <span>Take Break</span>
                            </button>
                          )}
                        </>
                      )}

                      {!isExisting && !isBreak && !isEvent && !isTaskApplied && (
                        <button
                          type="button"
                          onClick={() => handleAddSingleTask(block.title, block.priority)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-nocturn-muted hover:text-white border border-white/[0.06] text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
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

      {/* Confirmation Modal for Overwriting Active Plan */}
      <Modal
        isOpen={showReplaceModal}
        onClose={() => setShowReplaceModal(false)}
        title="Replace Today's Plan?"
        description="You have unfinished focus blocks in your current schedule."
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs sm:text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Keeping Completed Tasks & Sessions</p>
              <p className="text-xs text-amber-300/80 mt-1">
                Generating a new plan will replace remaining unfinished schedule blocks. Any tasks you've already completed or user-created tasks will not be deleted.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowReplaceModal(false)}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Keep Current Plan
            </button>
            <button
              type="button"
              onClick={handleConfirmReplacePlan}
              className="px-4 py-2 rounded-xl bg-nocturn-accent hover:bg-nocturn-accent-bright text-white text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Replace Plan
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Block Modal */}
      <Modal
        isOpen={Boolean(editingBlock)}
        onClose={() => setEditingBlock(null)}
        title="Edit Time Block"
        description="Update block details in your timetable."
      >
        {editingBlock && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-nocturn-muted block mb-1">Title</label>
              <input
                type="text"
                value={editingBlock.title || ''}
                onChange={(e) => setEditingBlock({ ...editingBlock, title: e.target.value })}
                className="nocturn-input text-xs sm:text-sm w-full py-2 px-3"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-nocturn-muted block mb-1">Start Time</label>
                <input
                  type="time"
                  value={editingBlock.startTime || '10:00'}
                  onChange={(e) => setEditingBlock({ ...editingBlock, startTime: e.target.value })}
                  className="nocturn-input text-xs sm:text-sm w-full py-2 px-3 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-nocturn-muted block mb-1">End Time</label>
                <input
                  type="time"
                  value={editingBlock.endTime || '10:45'}
                  onChange={(e) => setEditingBlock({ ...editingBlock, endTime: e.target.value })}
                  className="nocturn-input text-xs sm:text-sm w-full py-2 px-3 font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-nocturn-muted block mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="360"
                  value={editingBlock.durationMinutes || 45}
                  onChange={(e) => setEditingBlock({ ...editingBlock, durationMinutes: Number(e.target.value) || 1 })}
                  className="nocturn-input text-xs sm:text-sm w-full py-2 px-3 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-nocturn-muted block mb-1">Type</label>
                <select
                  value={editingBlock.type || 'focus'}
                  onChange={(e) => setEditingBlock({ ...editingBlock, type: e.target.value, blockType: e.target.value })}
                  className="nocturn-input text-xs sm:text-sm w-full py-2 px-3 bg-nocturn-surface"
                >
                  <option value="focus">Focus</option>
                  <option value="break">Break</option>
                  <option value="event">Event</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-nocturn-muted block mb-1">Notes (optional)</label>
              <input
                type="text"
                value={editingBlock.notes || ''}
                onChange={(e) => setEditingBlock({ ...editingBlock, notes: e.target.value })}
                className="nocturn-input text-xs sm:text-sm w-full py-2 px-3"
                placeholder="Additional context or goals"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingBlock(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveBlockEdit(editingBlock)}
                className="px-4 py-2 rounded-xl bg-nocturn-accent hover:bg-nocturn-accent-bright text-white text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Block Modal */}
      <Modal
        isOpen={isAddBlockOpen}
        onClose={() => setIsAddBlockOpen(false)}
        title="Add Time Block"
        description="Create a manual block in today's timetable."
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-nocturn-muted block mb-1">Title</label>
            <input
              type="text"
              value={newBlockTitle}
              onChange={(e) => setNewBlockTitle(e.target.value)}
              placeholder="e.g. Code Review or Gym Workout"
              className="nocturn-input text-xs sm:text-sm w-full py-2 px-3"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-nocturn-muted block mb-1">Start Time</label>
              <input
                type="time"
                value={newBlockStartTime}
                onChange={(e) => setNewBlockStartTime(e.target.value)}
                className="nocturn-input text-xs sm:text-sm w-full py-2 px-3 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-nocturn-muted block mb-1">End Time</label>
              <input
                type="time"
                value={newBlockEndTime}
                onChange={(e) => setNewBlockEndTime(e.target.value)}
                className="nocturn-input text-xs sm:text-sm w-full py-2 px-3 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-nocturn-muted block mb-1">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="360"
                value={newBlockDuration}
                onChange={(e) => setNewBlockDuration(Math.max(1, Number(e.target.value) || 1))}
                className="nocturn-input text-xs sm:text-sm w-full py-2 px-3 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-nocturn-muted block mb-1">Type</label>
              <select
                value={newBlockType}
                onChange={(e) => setNewBlockType(e.target.value)}
                className="nocturn-input text-xs sm:text-sm w-full py-2 px-3 bg-nocturn-surface"
              >
                <option value="focus">Focus</option>
                <option value="break">Break</option>
                <option value="event">Event</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddBlockOpen(false)}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!newBlockTitle.trim()}
              onClick={handleAddNewBlock}
              className="px-4 py-2 rounded-xl bg-nocturn-accent hover:bg-nocturn-accent-bright text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95"
            >
              Add Block
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
