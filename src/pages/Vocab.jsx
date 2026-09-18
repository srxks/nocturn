import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ListFilter,
  ArrowRight,
  AlertTriangle,
  Zap,
  Plus,
  Trash2,
} from 'lucide-react'
import { useVocab } from '../hooks/useVocab'
import VocabWordModal from '../components/vocab/VocabWordModal'

export default function Vocab() {
  const navigate = useNavigate()
  const {
    allWords,
    dailyWords,
    learnedTodayCount,
    effectiveDailyTarget,
    isDailyCompleted,
    currentLearningIndex,
    reviewCount,
    isGenerating,
    generationError,
    generateNewWords,
    addWord,
    deleteAllWords,
  } = useVocab()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)

  const handleDeleteAllConfirm = async () => {
    try {
      setIsDeletingAll(true)
      await deleteAllWords()
      setIsConfirmDeleteAllOpen(false)
    } finally {
      setIsDeletingAll(false)
    }
  }

  const handleStartLearn = async () => {
    if (allWords.length === 0) {
      try {
        await generateNewWords()
        navigate('/vocab/learn')
      } catch {
        // Error handled by hook state
      }
    } else {
      navigate('/vocab/learn')
    }
  }

  const handleGenerateNewWords = async () => {
    try {
      await generateNewWords()
    } catch {
      // Error handled by hook state
    }
  }

  // Count words by status
  const learningCount = allWords.filter((w) => w.correct_count < 5).length
  const settledCount = allWords.filter(
    (w) => w.correct_count === 5 && w.last_quizzed_date
  ).length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="space-y-8 pb-12"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Vocab
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-nocturn-accent/15 text-nocturn-accent border border-nocturn-accent/30 shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.2)]">
              GRE Flashcards
            </span>
          </div>
          <p className="text-nocturn-muted text-sm sm:text-base mt-1">
            Build your GRE vocabulary with AI-curated daily words.
          </p>
        </div>

        {/* Action Controls: Generate with AI, Add Word & Delete All Words */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleGenerateNewWords}
            disabled={isGenerating}
            className="px-3.5 py-2 rounded-xl bg-nocturn-accent/15 hover:bg-nocturn-accent/25 text-nocturn-accent border border-nocturn-accent/30 transition-colors flex items-center gap-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
            title="Generate brand new words with AI"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin text-nocturn-accent" />
            ) : (
              <Sparkles className="w-4 h-4 text-nocturn-accent" />
            )}
            <span>Generate with AI</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-nocturn-border transition-colors flex items-center gap-2 text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4 text-nocturn-accent" />
            <span>Add Word</span>
          </button>

          <button
            type="button"
            onClick={() => setIsConfirmDeleteAllOpen(true)}
            disabled={allWords.length === 0}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors flex items-center gap-2 text-xs font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Delete All Words</span>
          </button>
        </div>
      </div>

      {/* Generation Error Alert */}
      {generationError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Vocabulary Generation Error</p>
            <p className="text-xs text-rose-300/80">{generationError}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Card 1 & Card 2 (Visually Balanced & Aligned) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* CARD 1: Learn 5 New Words */}
        <div className="bg-nocturn-card border border-nocturn-border rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-nocturn-accent/40 transition-colors duration-200 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.2)]">
                <Sparkles className="w-5 h-5" />
              </div>

              {/* Status Badge */}
              {isDailyCompleted ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed
                </span>
              ) : learnedTodayCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-nocturn-accent/15 text-nocturn-accent border border-nocturn-accent/30">
                  <Zap className="w-3.5 h-3.5" />
                  In Progress
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-nocturn-muted border border-nocturn-border">
                  Daily Goal
                </span>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Learn {effectiveDailyTarget} Words
              </h2>
              <p className="text-nocturn-muted text-sm mt-1">
                {allWords.length === 0
                  ? 'Your library is empty. Generate words or add your own to start.'
                  : `Daily vocabulary set for today (${dailyWords.length} words available).`}
              </p>
            </div>

            {/* Progress Section */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-nocturn-border/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-nocturn-muted">Today's Progress</span>
                <span className="text-white font-bold">
                  {learnedTodayCount} / {effectiveDailyTarget} Words
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden border border-nocturn-border/40">
                <div
                  className="h-full bg-nocturn-accent transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(var(--color-nocturn-accent-rgb),0.4)]"
                  style={{
                    width: `${
                      effectiveDailyTarget > 0
                        ? Math.min(100, (learnedTodayCount / effectiveDailyTarget) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pt-6">
            {isDailyCompleted ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/vocab/learn')}
                  className="py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-nocturn-border transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                >
                  <span>Review Today's Words</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleGenerateNewWords}
                  disabled={isGenerating}
                  className="py-3.5 px-4 rounded-2xl bg-nocturn-accent text-black font-bold hover:bg-nocturn-accent-bright shadow-[0_0_15px_rgba(var(--color-nocturn-accent-rgb),0.3)] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Generate More Words</span>
                </button>
              </div>
            ) : allWords.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleStartLearn}
                  disabled={isGenerating}
                  className="py-3 px-4 rounded-2xl bg-nocturn-accent text-black font-bold hover:bg-nocturn-accent-bright shadow-[0_0_15px_rgba(var(--color-nocturn-accent-rgb),0.3)] transition-all duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate with AI</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-nocturn-border transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-nocturn-accent" />
                  <span>Add Word</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleStartLearn}
                  disabled={isGenerating}
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-nocturn-accent text-black font-bold hover:bg-nocturn-accent-bright shadow-[0_0_15px_rgba(var(--color-nocturn-accent-rgb),0.3)] transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating Words with Gemini...</span>
                    </>
                  ) : learnedTodayCount > 0 ? (
                    <>
                      <span>Continue Learning (Word {Math.min(currentLearningIndex + 1, Math.max(dailyWords.length, 1))} of {dailyWords.length})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Start Learning ({dailyWords.length} words)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateNewWords}
                  disabled={isGenerating}
                  className="py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-nocturn-border transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
                  title="Generate brand new words with AI"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-nocturn-accent" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-nocturn-accent" />
                  )}
                  <span className="hidden sm:inline">Generate with AI</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: Review Queue (Polished & Intentional Empty State) */}
        <div className="bg-nocturn-card border border-nocturn-border rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-amber-500/40 transition-colors duration-200 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.2)]">
                <RefreshCw className="w-5 h-5" />
              </div>

              {reviewCount > 0 ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {reviewCount} Due
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  All Caught Up
                </span>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Review Queue
              </h2>
              <p className="text-nocturn-muted text-sm mt-1">
                Reinforce vocabulary memory with spaced multiple-choice quizzes.
              </p>
            </div>

            {/* Status Section */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-nocturn-border/60">
              {reviewCount > 0 ? (
                <div>
                  <span className="text-2xl sm:text-3xl font-extrabold text-white">
                    {reviewCount}
                  </span>
                  <span className="text-sm text-nocturn-muted ml-2">
                    {reviewCount === 1 ? 'word ready for review' : 'words ready for review'}
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-white block">
                    No reviews due today!
                  </span>
                  <span className="text-xs text-nocturn-muted block">
                    Words appear here when spaced repetition refreshes are needed.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6">
            {reviewCount > 0 ? (
              <button
                onClick={() => navigate('/vocab/review')}
                className="w-full py-3.5 px-6 rounded-2xl bg-amber-400 text-black font-bold hover:bg-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              >
                <span>Start Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/vocab/list')}
                className="w-full py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-nocturn-border transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <span>Explore Word Library</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CARD 3: Word Library & Quick Stats */}
      <div className="bg-nocturn-card border border-nocturn-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-nocturn-accent/10 border border-nocturn-accent/20 flex items-center justify-center text-nocturn-accent">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Word Library</h3>
              <p className="text-xs text-nocturn-muted">
                Total learned words & mastery breakdown
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/vocab/list')}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-nocturn-border transition-colors flex items-center gap-2"
          >
            <ListFilter className="w-4 h-4 text-nocturn-accent" />
            <span>View All Words ({allWords.length})</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-nocturn-border/60">
            <p className="text-xs text-nocturn-muted font-medium">Total Learned</p>
            <p className="text-2xl font-extrabold text-white mt-1">
              {allWords.length}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-nocturn-border/60">
            <p className="text-xs text-nocturn-muted font-medium">In Progress</p>
            <p className="text-2xl font-extrabold text-nocturn-accent mt-1">
              {learningCount}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-nocturn-border/60">
            <p className="text-xs text-nocturn-muted font-medium">Mastered</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">
              {settledCount} {settledCount === 1 ? 'word' : 'words'}
            </p>
            <p className="text-[10px] text-nocturn-muted mt-0.5">Mastery: 5 successful reviews</p>
          </div>
        </div>
      </div>

      {/* Add Word Modal */}
      <VocabWordModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={addWord}
        mode="add"
      />

      {/* Delete All Words Confirmation Modal */}
      {isConfirmDeleteAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-nocturn-card border border-rose-500/30 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete All Vocabulary Words?</h3>
            </div>
            <p className="text-sm text-nocturn-muted">
              Delete all vocabulary words? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAllOpen(false)}
                disabled={isDeletingAll}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-nocturn-border cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllConfirm}
                disabled={isDeletingAll}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer transition-colors disabled:opacity-50"
              >
                {isDeletingAll ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
