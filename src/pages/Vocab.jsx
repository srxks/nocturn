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
import { Card, Badge, Button, Progress } from '../components/ui'

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
      className="space-y-6 sm:space-y-8 pb-12"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Vocabulary
            </h1>
            <Badge variant="accent" size="sm">
              GRE Flashcards
            </Badge>
          </div>
          <p className="text-nocturn-muted text-xs sm:text-sm mt-1">
            Build your GRE vocabulary with AI-curated daily words.
          </p>
        </div>

        {/* Action Controls: Generate with AI, Add Word & Delete All Words */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateNewWords}
            disabled={isGenerating}
            icon={isGenerating ? RefreshCw : Sparkles}
            className={isGenerating ? '[&_svg]:animate-spin' : ''}
            title="Generate brand new words with AI"
          >
            <span>Generate with AI</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={Plus}
          >
            <span>Add Word</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsConfirmDeleteAllOpen(true)}
            disabled={allWords.length === 0}
            icon={Trash2}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
          >
            <span>Delete All</span>
          </Button>
        </div>
      </div>

      {/* Generation Error Alert */}
      {generationError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Vocabulary Generation Error</p>
            <p className="text-xs text-rose-300/80">{generationError}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Card 1 & Card 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {/* CARD 1: Learn Daily Words */}
        <Card className="flex flex-col justify-between hover:border-white/15 transition-colors duration-200">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-accent">
                <Sparkles className="w-5 h-5" />
              </div>

              {/* Status Badge */}
              {isDailyCompleted ? (
                <Badge variant="success" size="sm" dot icon={CheckCircle2}>
                  Completed
                </Badge>
              ) : learnedTodayCount > 0 ? (
                <Badge variant="accent" size="sm" dot icon={Zap}>
                  In Progress
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm" dot>
                  Daily Goal
                </Badge>
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Learn {effectiveDailyTarget} Words
              </h2>
              <p className="text-nocturn-muted text-xs sm:text-sm mt-1">
                {allWords.length === 0
                  ? 'Your library is empty. Generate words or add your own to start.'
                  : `Daily vocabulary set for today (${dailyWords.length} words available).`}
              </p>
            </div>

            {/* Progress Section */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-nocturn-muted">Today's Progress</span>
                <span className="text-white font-mono font-semibold">
                  {learnedTodayCount} / {effectiveDailyTarget} Words
                </span>
              </div>
              <Progress
                value={
                  effectiveDailyTarget > 0
                    ? Math.min(100, (learnedTodayCount / effectiveDailyTarget) * 100)
                    : 0
                }
              />
            </div>
          </div>

          <div className="pt-6">
            {isDailyCompleted ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/vocab/learn')}
                  className="w-full justify-center"
                  icon={ArrowRight}
                >
                  Review Today's Words
                </Button>
                <Button
                  variant="primary"
                  onClick={handleGenerateNewWords}
                  disabled={isGenerating}
                  className="w-full justify-center"
                  icon={isGenerating ? RefreshCw : Sparkles}
                >
                  {isGenerating ? 'Generating...' : 'Generate More'}
                </Button>
              </div>
            ) : allWords.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Button
                  variant="primary"
                  onClick={handleStartLearn}
                  disabled={isGenerating}
                  className="w-full justify-center"
                  icon={isGenerating ? RefreshCw : Sparkles}
                >
                  {isGenerating ? 'Generating with AI...' : 'Generate with AI'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-full justify-center"
                  icon={Plus}
                >
                  Add Word
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Button
                  variant="primary"
                  onClick={handleStartLearn}
                  disabled={isGenerating}
                  className="flex-1 justify-center"
                  icon={ArrowRight}
                >
                  {isGenerating
                    ? 'Generating with Gemini...'
                    : learnedTodayCount > 0
                    ? `Continue (Word ${Math.min(currentLearningIndex + 1, Math.max(dailyWords.length, 1))} of ${dailyWords.length})`
                    : `Start Learning (${dailyWords.length} words)`}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleGenerateNewWords}
                  disabled={isGenerating}
                  icon={isGenerating ? RefreshCw : Sparkles}
                  title="Generate brand new words with AI"
                >
                  <span className="hidden sm:inline">Generate</span>
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* CARD 2: Review Queue */}
        <Card className="flex flex-col justify-between hover:border-white/15 transition-colors duration-200">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <RefreshCw className="w-5 h-5" />
              </div>

              {reviewCount > 0 ? (
                <Badge variant="warning" size="sm" dot>
                  {reviewCount} Due
                </Badge>
              ) : (
                <Badge variant="success" size="sm" dot icon={CheckCircle2}>
                  All Caught Up
                </Badge>
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Review Queue
              </h2>
              <p className="text-nocturn-muted text-xs sm:text-sm mt-1">
                Reinforce vocabulary memory with spaced multiple-choice quizzes.
              </p>
            </div>

            {/* Status Section */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              {reviewCount > 0 ? (
                <div>
                  <span className="text-2xl font-bold font-mono text-white">
                    {reviewCount}
                  </span>
                  <span className="text-xs text-nocturn-muted ml-2">
                    {reviewCount === 1 ? 'word ready for review' : 'words ready for review'}
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-white block">
                    {allWords.length > 0 ? "You're all caught up for today!" : 'No reviews due today'}
                  </span>
                  <span className="text-[11px] text-nocturn-muted block">
                    {allWords.length > 0
                      ? 'Spaced repetition reviews will refresh tomorrow.'
                      : 'Words appear here when spaced repetition refreshes are needed.'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6">
            {reviewCount > 0 ? (
              <Button
                variant="primary"
                onClick={() => navigate('/vocab/review')}
                className="w-full justify-center"
                icon={ArrowRight}
              >
                Start Review ({reviewCount})
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => navigate('/vocab/list')}
                className="w-full justify-center"
                icon={ArrowRight}
              >
                Explore Word Library
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* CARD 3: Word Library & Quick Stats */}
      <Card className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-accent">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white">Word Library</h3>
              <p className="text-xs text-nocturn-muted">
                Total learned words & mastery breakdown
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/vocab/list')}
            icon={ListFilter}
          >
            View All Words ({allWords.length})
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-xs text-nocturn-muted font-medium">Total Learned</p>
            <p className="text-2xl font-semibold font-mono text-white mt-1">
              {allWords.length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-xs text-nocturn-muted font-medium">In Progress</p>
            <p className="text-2xl font-semibold font-mono text-nocturn-accent mt-1">
              {learningCount}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-xs text-nocturn-muted font-medium">Mastered</p>
            <p className="text-2xl font-semibold font-mono text-emerald-400 mt-1">
              {settledCount} <span className="text-xs font-normal text-nocturn-muted">{settledCount === 1 ? 'word' : 'words'}</span>
            </p>
            <p className="text-[10px] text-nocturn-muted/70 mt-0.5">Mastery: 5 successful reviews</p>
          </div>
        </div>
      </Card>

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
          <div className="w-full max-w-md bg-nocturn-card border border-rose-500/30 rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Delete All Vocabulary Words?</h3>
            </div>
            <p className="text-xs sm:text-sm text-nocturn-muted">
              Delete all vocabulary words? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsConfirmDeleteAllOpen(false)}
                disabled={isDeletingAll}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteAllConfirm}
                disabled={isDeletingAll}
              >
                {isDeletingAll ? 'Deleting...' : 'Delete All'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
