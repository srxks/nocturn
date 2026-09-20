import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Plus,
  BookOpen,
  Volume2,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { useVocab } from '../hooks/useVocab'
import { getTodayDateKey, saveDailyVocabLog } from '../services/vocabService'
import { speakWord } from '../services/soundService'
import VocabWordModal from '../components/vocab/VocabWordModal'
import { Card, Badge, Button, Progress } from '../components/ui'

export default function VocabLearn() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    allWords,
    dailyWords,
    learnedTodayCount,
    effectiveDailyTarget,
    isDailyCompleted,
    todayVocabLog,
    sessionLearnKey,
    sessionCompleteKey,
    sessionCompletedIdsKey,
    isGenerating,
    generationError,
    generateNewWords,
    markWordLearned,
    addWord,
  } = useVocab()

  const todayKey = getTodayDateKey()

  const [currentIndex, setCurrentIndex] = useState(() => {
    try {
      const saved = localStorage.getItem(`nocturn_vocab_learn_idx_${user?.id || 'guest'}_${getTodayDateKey()}`)
      return saved !== null && !isNaN(parseInt(saved, 10)) ? Math.max(0, parseInt(saved, 10)) : 0
    } catch {
      return 0
    }
  })

  const [browsingCards, setBrowsingCards] = useState(false)
  const [completedManually, setCompletedManually] = useState(() => {
    try {
      return localStorage.getItem(`nocturn_vocab_learn_completed_${user?.id || 'guest'}_${getTodayDateKey()}`) === 'true'
    } catch {
      return false
    }
  })

  const isCompletedView =
    !browsingCards && (completedManually || isDailyCompleted || todayVocabLog?.completed === true)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const markedWordsRef = useRef(new Set())

  const safeIndex = Math.max(0, Math.min(currentIndex, Math.max(0, dailyWords.length - 1)))
  const currentWord = dailyWords[safeIndex]

  // Persist current learning index so leaving halfway resumes exactly where left off
  useEffect(() => {
    try {
      if (dailyWords.length > 0 && sessionLearnKey) {
        localStorage.setItem(sessionLearnKey, String(safeIndex))
      }
    } catch {
      // Ignore storage errors
    }
  }, [safeIndex, dailyWords.length, sessionLearnKey])

  // Mark current word as viewed / learned in session
  useEffect(() => {
    if (currentWord?.id && !markedWordsRef.current.has(currentWord.id)) {
      markedWordsRef.current.add(currentWord.id)
      if (currentWord.date_added !== todayKey) {
        markWordLearned(currentWord).catch(() => {})
      }
      try {
        if (sessionCompletedIdsKey) {
          const raw = localStorage.getItem(sessionCompletedIdsKey)
          const ids = raw ? JSON.parse(raw) : []
          if (!ids.includes(currentWord.id)) {
            ids.push(currentWord.id)
            localStorage.setItem(sessionCompletedIdsKey, JSON.stringify(ids))
          }
        }
      } catch {
        // ignore
      }
    }
  }, [currentWord, todayKey, markWordLearned, sessionCompletedIdsKey])

  const handleNext = async () => {
    const nextIdx = safeIndex + 1

    let currentCompletedIds = []
    try {
      if (sessionCompletedIdsKey) {
        const raw = localStorage.getItem(sessionCompletedIdsKey)
        currentCompletedIds = raw ? JSON.parse(raw) : []
        if (currentWord?.id && !currentCompletedIds.includes(currentWord.id)) {
          currentCompletedIds.push(currentWord.id)
          localStorage.setItem(sessionCompletedIdsKey, JSON.stringify(currentCompletedIds))
        }
      }
    } catch {
      // ignore
    }

    if (nextIdx < dailyWords.length) {
      setCurrentIndex(nextIdx)
      try {
        if (sessionLearnKey) localStorage.setItem(sessionLearnKey, String(nextIdx))
      } catch {
        // ignore
      }
      await saveDailyVocabLog({
        date: todayKey,
        userId: user?.id || null,
        wordIds: dailyWords.map((w) => w.id),
        currentIndex: nextIdx,
        completedWordIds: currentCompletedIds,
        completed: false,
        updated_at: new Date().toISOString(),
      })
    } else {
      setCompletedManually(true)
      setBrowsingCards(false)
      try {
        if (sessionCompleteKey) localStorage.setItem(sessionCompleteKey, 'true')
        if (sessionLearnKey) localStorage.setItem(sessionLearnKey, String(dailyWords.length - 1))
      } catch {
        // ignore
      }
      await saveDailyVocabLog({
        date: todayKey,
        userId: user?.id || null,
        wordIds: dailyWords.map((w) => w.id),
        currentIndex: dailyWords.length - 1,
        completedWordIds: dailyWords.map((w) => w.id),
        completed: true,
        updated_at: new Date().toISOString(),
      })
    }
  }

  const handlePrev = async () => {
    if (safeIndex > 0) {
      const prevIdx = safeIndex - 1
      setCurrentIndex(prevIdx)
      try {
        if (sessionLearnKey) localStorage.setItem(sessionLearnKey, String(prevIdx))
      } catch {
        // ignore
      }
      await saveDailyVocabLog({
        date: todayKey,
        userId: user?.id || null,
        wordIds: dailyWords.map((w) => w.id),
        currentIndex: prevIdx,
        completedWordIds: todayVocabLog?.completedWordIds || [],
        completed: false,
        updated_at: new Date().toISOString(),
      })
    }
  }

  // Loading State
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent shadow-[0_0_25px_rgba(var(--color-nocturn-accent-rgb),0.3)]">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-xl font-bold text-white">
            Generating Daily Vocabulary
          </h2>
          <p className="text-sm text-nocturn-muted">
            Requesting GRE-level words from Gemini AI...
          </p>
        </div>
      </div>
    )
  }

  // Empty Library State (User has no words at all)
  if (allWords.length === 0 && dailyWords.length === 0) {
    return (
      <div className="max-w-xl mx-auto space-y-6 py-8">
        <button
          type="button"
          onClick={() => navigate('/vocab')}
          className="inline-flex items-center gap-2 text-sm text-nocturn-muted hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Vocab</span>
        </button>

        <div className="p-8 rounded-3xl bg-nocturn-card border border-nocturn-border space-y-5 text-center shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <div className="w-14 h-14 rounded-2xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">
              No Vocabulary Words Yet
            </h2>
            <p className="text-sm text-nocturn-muted max-w-sm mx-auto">
              Your vocabulary library is currently empty. Generate a curated set with AI or add your own words to begin learning.
            </p>
          </div>

          {generationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{generationError}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={() => generateNewWords()}
              disabled={isGenerating}
              className="px-6 py-2.5 rounded-xl bg-nocturn-accent text-black font-bold hover:bg-nocturn-accent-bright shadow-[0_0_15px_rgba(var(--color-nocturn-accent-rgb),0.3)] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Generate with AI</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors border border-nocturn-border flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-nocturn-accent" />
              <span>Add Word</span>
            </button>
          </div>
        </div>

        <VocabWordModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={async (wordData) => {
            await addWord(wordData)
          }}
          mode="add"
        />
      </div>
    )
  }

  // Completed Today State (Library has words, but daily learning set is complete)
  if (dailyWords.length === 0 && (isDailyCompleted || learnedTodayCount >= effectiveDailyTarget)) {
    return (
      <div className="max-w-xl mx-auto space-y-6 py-8">
        <button
          type="button"
          onClick={() => navigate('/vocab')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-nocturn-muted hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Vocabulary</span>
        </button>

        <Card className="p-8 space-y-5 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold text-white tracking-tight">
              Today's Daily Set is Complete
            </h2>
            <p className="text-xs sm:text-sm text-nocturn-muted max-w-sm mx-auto">
              You've completed your daily target of {effectiveDailyTarget} {effectiveDailyTarget === 1 ? 'word' : 'words'}. Head over to Review to practice and retain what you've learned.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/vocab/review')}
            >
              Go to Review Queue
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/vocab')}
            >
              Back to Vocabulary
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Completion View
  if (isCompletedView) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Today's {dailyWords.length > 0 ? `${dailyWords.length} Words` : 'Set'} Completed
          </h1>
          <p className="text-nocturn-muted text-xs sm:text-sm max-w-md mx-auto">
            Great job! You've learned today's vocabulary set. They are saved in your library and ready for review.
          </p>
        </div>

        {/* Word Summary List */}
        <Card className="p-5 sm:p-6 space-y-3">
          <h3 className="text-xs uppercase font-semibold tracking-wider text-nocturn-muted mb-2">
            Today's Words ({dailyWords.length})
          </h3>
          {dailyWords.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <span className="text-sm font-semibold text-white">
                  {item.word}
                </span>
                <span className="ml-2 text-xs font-normal text-nocturn-muted">
                  ({item.part_of_speech || 'noun'})
                </span>
                <p className="text-xs text-nocturn-muted line-clamp-1 mt-0.5">
                  {item.definition}
                </p>
              </div>
              <Badge variant="accent" size="sm" dot>
                Learned
              </Badge>
            </div>
          ))}
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setBrowsingCards(true)
              setCurrentIndex(0)
            }}
            className="justify-center"
          >
            Review Flashcards
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              try {
                await generateNewWords()
                setBrowsingCards(false)
              } catch {
                // error handled by hook state
              }
            }}
            disabled={isGenerating}
            icon={isGenerating ? RefreshCw : Sparkles}
            className={`justify-center ${isGenerating ? '[&_svg]:animate-spin' : ''}`}
          >
            <span>Learn More Words</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/vocab')}
            className="justify-center"
          >
            Back to Vocabulary
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/vocab/review')}
            className="justify-center"
          >
            Start Review Queue
          </Button>
        </div>
      </div>
    )
  }

  // Active Learning Flashcard View
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/vocab')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-nocturn-muted hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        {/* Step Indicator */}
        <Badge variant="neutral" size="sm" icon={Sparkles}>
          {safeIndex + 1} of {dailyWords.length}
        </Badge>
      </div>

      {/* Progress Bar */}
      <Progress
        value={((safeIndex + 1) / Math.max(1, dailyWords.length)) * 100}
      />

      {/* Flashcard Component with AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={safeIndex}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <Card variant="elevated" className="p-6 sm:p-9 space-y-6">
            {/* Top Word Badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentWord?.part_of_speech && (
                  <Badge variant="accent" size="sm">
                    {currentWord.part_of_speech}
                  </Badge>
                )}
                {currentWord?.difficulty && (
                  <Badge variant="warning" size="sm">
                    {currentWord.difficulty}
                  </Badge>
                )}
              </div>
              <span className="text-[11px] font-mono text-nocturn-muted">GRE Level</span>
            </div>

            {/* Word Heading & Audio Pronunciation */}
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                {currentWord?.word}
              </h1>
              {currentWord?.word && (
                <button
                  type="button"
                  onClick={() => speakWord(currentWord.word)}
                  title="Pronounce word"
                  aria-label={`Pronounce ${currentWord.word}`}
                  className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-nocturn-muted hover:text-nocturn-accent border border-white/[0.06] transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <Volume2 className="w-5 h-5 stroke-[2]" />
                </button>
              )}
            </div>

            {/* Definition */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs uppercase font-semibold tracking-wider text-nocturn-muted block">
                Definition
              </span>
              <p className="text-base sm:text-lg text-white/90 leading-relaxed font-normal">
                {currentWord?.definition}
              </p>
            </div>

            {/* Example Sentence */}
            {currentWord?.example_sentence && (
              <div className="p-4 rounded-xl bg-white/[0.02] border-l-2 border-nocturn-accent space-y-1">
                <span className="text-[11px] uppercase font-semibold tracking-wider text-nocturn-accent block">
                  Example Sentence
                </span>
                <p className="text-sm text-white/90 italic">
                  "{currentWord.example_sentence}"
                </p>
              </div>
            )}

            {/* Synonyms */}
            {Array.isArray(currentWord?.synonyms) && currentWord.synonyms.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs uppercase font-semibold tracking-wider text-nocturn-muted block">
                  Synonyms
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentWord.synonyms.map((syn, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs text-nocturn-muted bg-white/[0.03] border border-white/[0.06]"
                    >
                      {syn}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Control Buttons */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <Button
          variant="secondary"
          size="md"
          onClick={handlePrev}
          disabled={safeIndex === 0}
          icon={ChevronLeft}
        >
          Previous
        </Button>

        <Button
          variant="primary"
          size="md"
          onClick={handleNext}
        >
          <span>
            {safeIndex === dailyWords.length - 1
              ? 'Complete Daily Set'
              : 'Next Word'}
          </span>
          <ChevronRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )
}
