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
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { useVocab } from '../hooks/useVocab'
import { getTodayDateKey, saveDailyVocabLog } from '../services/vocabService'
import VocabWordModal from '../components/vocab/VocabWordModal'

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
          className="inline-flex items-center gap-2 text-sm text-nocturn-muted hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Vocab</span>
        </button>

        <div className="p-8 rounded-3xl bg-nocturn-card border border-emerald-500/30 space-y-4 text-center shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">
              Today's Daily Set is Complete!
            </h2>
            <p className="text-sm text-nocturn-muted max-w-sm mx-auto">
              You've completed your daily target of {effectiveDailyTarget} {effectiveDailyTarget === 1 ? 'word' : 'words'}. Head over to Review to practice and retain what you've learned.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/vocab/review')}
              className="px-6 py-2.5 rounded-xl bg-nocturn-accent text-black font-bold hover:bg-nocturn-accent-bright transition-colors cursor-pointer"
            >
              Go to Review Queue
            </button>
            <button
              type="button"
              onClick={() => navigate('/vocab')}
              className="px-6 py-2.5 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors border border-nocturn-border cursor-pointer"
            >
              Back to Vocab
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Completion View
  if (isCompletedView) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Today's {dailyWords.length > 0 ? `${dailyWords.length} Words` : 'Set'} Completed!
          </h1>
          <p className="text-nocturn-muted text-sm max-w-md mx-auto">
            Great job! You've learned today's vocabulary set. They are saved in your library and ready for review.
          </p>
        </div>

        {/* Word Summary List */}
        <div className="bg-nocturn-card border border-nocturn-border rounded-3xl p-6 space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <h3 className="text-xs uppercase font-bold tracking-wider text-nocturn-muted mb-2">
            Today's Words ({dailyWords.length})
          </h3>
          {dailyWords.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-4 rounded-2xl bg-white/[0.02] border border-nocturn-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <span className="text-base font-bold text-white">
                  {item.word}
                </span>
                <span className="ml-2 text-xs font-medium text-nocturn-muted">
                  ({item.part_of_speech || 'noun'})
                </span>
                <p className="text-xs text-nocturn-text/80 line-clamp-1 mt-0.5">
                  {item.definition}
                </p>
              </div>
              <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[11px] font-semibold bg-nocturn-accent/15 text-nocturn-accent border border-nocturn-accent/30 shrink-0">
                Learned
              </span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setBrowsingCards(true)
              setCurrentIndex(0)
            }}
            className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-nocturn-border transition-colors text-center cursor-pointer text-xs sm:text-sm"
          >
            Review Flashcards
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await generateNewWords()
                setBrowsingCards(false)
              } catch {
                // error handled by hook state
              }
            }}
            disabled={isGenerating}
            className="py-3 px-4 rounded-2xl bg-nocturn-accent/15 hover:bg-nocturn-accent/25 text-nocturn-accent border border-nocturn-accent/30 transition-colors text-center cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin text-nocturn-accent" />
            ) : (
              <Sparkles className="w-4 h-4 text-nocturn-accent" />
            )}
            <span>Learn More Words</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/vocab')}
            className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-nocturn-border transition-colors text-center cursor-pointer text-xs sm:text-sm"
          >
            Back to Vocab Home
          </button>
          <button
            type="button"
            onClick={() => navigate('/vocab/review')}
            className="py-3 px-4 rounded-2xl bg-nocturn-accent text-black font-bold hover:bg-nocturn-accent-bright shadow-[0_0_20px_rgba(var(--color-nocturn-accent-rgb),0.4)] transition-colors text-center cursor-pointer text-xs sm:text-sm"
          >
            Start Review Queue
          </button>
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
          className="inline-flex items-center gap-2 text-sm text-nocturn-muted hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nocturn-card border border-nocturn-border text-xs font-bold text-white">
          <Sparkles className="w-3.5 h-3.5 text-nocturn-accent" />
          <span>
            {safeIndex + 1} / {dailyWords.length}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden border border-nocturn-border/50">
        <div
          className="h-full bg-nocturn-accent transition-all duration-300 rounded-full"
          style={{
            width: `${((safeIndex + 1) / Math.max(1, dailyWords.length)) * 100}%`,
          }}
        />
      </div>

      {/* Flashcard Component with AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={safeIndex}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="bg-nocturn-card border border-nocturn-border rounded-3xl p-6 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.8)] space-y-6"
        >
          {/* Top Word Badges */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentWord?.part_of_speech && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold text-nocturn-accent bg-nocturn-accent/15 border border-nocturn-accent/30">
                  {currentWord.part_of_speech}
                </span>
              )}
              {currentWord?.difficulty && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold text-amber-400 bg-amber-500/15 border border-amber-500/30">
                  {currentWord.difficulty}
                </span>
              )}
            </div>
            <span className="text-xs text-nocturn-muted">GRE Level</span>
          </div>

          {/* Word Heading */}
          <div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              {currentWord?.word}
            </h1>
          </div>

          {/* Definition */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs uppercase font-bold tracking-wider text-nocturn-muted">
              Definition
            </h3>
            <p className="text-lg sm:text-xl text-nocturn-text leading-relaxed font-medium">
              {currentWord?.definition}
            </p>
          </div>

          {/* Example Sentence */}
          {currentWord?.example_sentence && (
            <div className="p-5 rounded-2xl bg-nocturn-accent/5 border-l-4 border-nocturn-accent space-y-1">
              <h3 className="text-xs uppercase font-bold tracking-wider text-nocturn-accent">
                Example Sentence
              </h3>
              <p className="text-base text-white/95 italic">
                "{currentWord.example_sentence}"
              </p>
            </div>
          )}

          {/* Synonyms */}
          {Array.isArray(currentWord?.synonyms) && currentWord.synonyms.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs uppercase font-bold tracking-wider text-nocturn-muted">
                Synonyms
              </h3>
              <div className="flex flex-wrap gap-2">
                {currentWord.synonyms.map((syn, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl text-xs text-nocturn-text bg-white/5 border border-nocturn-border/60"
                  >
                    {syn}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Control Buttons */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          onClick={handlePrev}
          disabled={safeIndex === 0}
          className="py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-nocturn-border transition-colors flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Previous</span>
        </button>

        <button
          onClick={handleNext}
          className="py-3.5 px-8 rounded-2xl bg-nocturn-accent text-black font-bold hover:bg-nocturn-accent-bright shadow-[0_0_20px_rgba(var(--color-nocturn-accent-rgb),0.4)] transition-all duration-200 flex items-center gap-2 cursor-pointer"
        >
          <span>
            {safeIndex === dailyWords.length - 1
              ? 'Complete Daily Set'
              : 'Next Word'}
          </span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
