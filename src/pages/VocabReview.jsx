import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Award,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { useVocab } from '../hooks/useVocab'
import { getReviewQueueWords, generateQuizOptions, getTodayDateKey } from '../services/vocabService'

export default function VocabReview() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { allWords, recordQuizResult, dailyLimit } = useVocab()

  const [quizWords, setQuizWords] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState({ correct: 0, incorrect: 0 })
  const [isCompleted, setIsCompleted] = useState(false)

  const userId = user?.id || null
  const todayKey = getTodayDateKey()
  const reviewWordsKey = `nocturn_review_words_${userId || 'guest'}_${todayKey}`
  const reviewProgressKey = `nocturn_review_progress_${userId || 'guest'}_${todayKey}`

  useEffect(() => {
    let active = true
    async function loadReviewWords() {
      try {
        const savedWordsRaw =
          (typeof localStorage !== 'undefined' && localStorage.getItem(reviewWordsKey)) ||
          sessionStorage.getItem(reviewWordsKey)
        const savedProgressRaw =
          (typeof localStorage !== 'undefined' && localStorage.getItem(reviewProgressKey)) ||
          sessionStorage.getItem(reviewProgressKey)

        if (savedWordsRaw && savedProgressRaw) {
          const savedWords = JSON.parse(savedWordsRaw)
          const savedProgress = JSON.parse(savedProgressRaw)
          if (Array.isArray(savedWords) && savedWords.length > 0 && active) {
            setQuizWords(savedWords)
            setCurrentIndex(Math.min(savedProgress.currentIndex || 0, savedWords.length - 1))
            setScore(savedProgress.score || { correct: 0, incorrect: 0 })
            setIsLoading(false)
            return
          }
        }

        const words = await getReviewQueueWords(userId, dailyLimit)
        if (active) {
          setQuizWords(words)
          if (words.length > 0) {
            const progressData = { currentIndex: 0, score: { correct: 0, incorrect: 0 } }
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(reviewWordsKey, JSON.stringify(words))
              localStorage.setItem(reviewProgressKey, JSON.stringify(progressData))
            }
            sessionStorage.setItem(reviewWordsKey, JSON.stringify(words))
            sessionStorage.setItem(reviewProgressKey, JSON.stringify(progressData))
          }
        }
      } catch (err) {
        console.warn('[VocabReview] Session load error:', err)
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }
    loadReviewWords()
    return () => {
      active = false
    }
  }, [userId, dailyLimit, reviewWordsKey, reviewProgressKey])

  // Persist review progress so refresh/reload/browser close preserves progress
  useEffect(() => {
    if (quizWords.length > 0 && !isCompleted) {
      try {
        const data = JSON.stringify({ currentIndex, score })
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(reviewProgressKey, data)
        }
        sessionStorage.setItem(reviewProgressKey, data)
      } catch {
        // ignore
      }
    }
  }, [currentIndex, score, quizWords.length, isCompleted, reviewProgressKey])

  const currentWord = quizWords[currentIndex]

  // Stable Quiz Options: Generated ONCE when question loads, NEVER reshuffled on click or re-renders
  const [currentOptionsState, setCurrentOptionsState] = useState({ wordId: null, options: [] })
  if (currentWord?.id && currentOptionsState.wordId !== currentWord.id) {
    setCurrentOptionsState({
      wordId: currentWord.id,
      options: generateQuizOptions(currentWord, allWords || []),
    })
  }

  const options = currentWord?.id === currentOptionsState.wordId ? currentOptionsState.options : []

  // Handle Option Click
  const handleSelectOption = useCallback(
    async (option) => {
      if (isAnswered || !currentWord) return

      setSelectedOption(option)
      setIsAnswered(true)

      const isCorrect = option.isCorrect

      // Update local score counter
      setScore((prev) => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        incorrect: prev.incorrect + (isCorrect ? 0 : 1),
      }))

      // Update word state in IndexedDB (correct_count & last_quizzed_date)
      await recordQuizResult(currentWord.id, isCorrect)
    },
    [isAnswered, currentWord, recordQuizResult]
  )

  // Advance to Next Question
  const handleNextQuestion = () => {
    if (currentIndex < quizWords.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setSelectedOption(null)
      setIsAnswered(false)
    } else {
      setIsCompleted(true)
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(reviewWordsKey)
          localStorage.removeItem(reviewProgressKey)
        }
        sessionStorage.removeItem(reviewWordsKey)
        sessionStorage.removeItem(reviewProgressKey)
      } catch {
        // ignore
      }
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-nocturn-accent" />
        <p className="text-sm text-nocturn-muted">Loading review queue...</p>
      </div>
    )
  }

  // If no words due
  if (quizWords.length === 0 && !isCompleted) {
    return (
      <div className="max-w-xl mx-auto py-12 space-y-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-[0_0_25px_rgba(251,191,36,0.3)]">
          <RefreshCw className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white">
            No Words Due for Review
          </h2>
          <p className="text-sm text-nocturn-muted max-w-md mx-auto">
            You've completed all review queue items for today! Check back later or learn new words.
          </p>
        </div>
        <button
          onClick={() => navigate('/vocab')}
          className="px-6 py-3 rounded-2xl bg-nocturn-accent text-black font-bold hover:bg-nocturn-accent-bright transition-colors"
        >
          Back to Vocab Home
        </button>
      </div>
    )
  }

  // Review Completion Summary View
  if (isCompleted) {
    const totalReviewed = score.correct + score.incorrect
    const accuracy = totalReviewed > 0 ? Math.round((score.correct / totalReviewed) * 100) : 0

    return (
      <div className="max-w-xl mx-auto space-y-8 py-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-[0_0_30px_rgba(251,191,36,0.3)]">
            <Award className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Review Complete!
          </h1>
          <p className="text-nocturn-muted text-sm">
            Your review performance has been saved.
          </p>
        </div>

        {/* Score Summary Card */}
        <div className="bg-nocturn-card border border-nocturn-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
          <div className="text-center pb-4 border-b border-nocturn-border/60">
            <span className="text-4xl sm:text-5xl font-extrabold text-nocturn-accent">
              {accuracy}%
            </span>
            <p className="text-xs uppercase font-bold tracking-wider text-nocturn-muted mt-1">
              Accuracy Score
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-nocturn-border/60">
              <p className="text-2xl font-bold text-white">{totalReviewed}</p>
              <p className="text-xs text-nocturn-muted mt-0.5">Reviewed</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-2xl font-bold text-emerald-400">{score.correct}</p>
              <p className="text-xs text-emerald-400/80 mt-0.5">Correct</p>
            </div>
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30">
              <p className="text-2xl font-bold text-rose-400">{score.incorrect}</p>
              <p className="text-xs text-rose-400/80 mt-0.5">Incorrect</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/vocab')}
          className="w-full py-4 px-6 rounded-2xl bg-nocturn-accent text-black font-bold hover:bg-nocturn-accent-bright shadow-[0_0_25px_rgba(var(--color-nocturn-accent-rgb),0.4)] transition-all duration-200 text-center"
        >
          Back to Vocab
        </button>
      </div>
    )
  }

  // Active Quiz View
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/vocab')}
          className="inline-flex items-center gap-2 text-sm text-nocturn-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Review</span>
        </button>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nocturn-card border border-nocturn-border text-xs font-bold text-white">
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Question {currentIndex + 1} of {quizWords.length}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden border border-nocturn-border/50">
        <div
          className="h-full bg-amber-400 transition-all duration-300 rounded-full"
          style={{
            width: `${((currentIndex + 1) / quizWords.length) * 100}%`,
          }}
        />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="space-y-6"
        >
          {/* Target Word Display */}
          <div className="bg-nocturn-card border border-nocturn-border rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
            <span className="text-xs uppercase font-bold tracking-wider text-nocturn-muted">
              Select the correct definition
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              {currentWord.word}
            </h1>
            {currentWord.part_of_speech && (
              <span className="inline-block px-3 py-0.5 rounded-full text-xs font-medium text-nocturn-muted bg-white/5 border border-nocturn-border">
                {currentWord.part_of_speech}
              </span>
            )}
          </div>

          {/* Answer Choices (4 Options) */}
          <div className="space-y-3">
            {options.map((option, idx) => {
              const isSelected = selectedOption === option
              const isCorrectAnswer = option.isCorrect

              let optionStyle =
                'bg-nocturn-card border-nocturn-border text-nocturn-text hover:border-white/30 hover:bg-white/[0.03]'

              if (isAnswered) {
                if (isCorrectAnswer) {
                  optionStyle =
                    'bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                } else if (isSelected && !isCorrectAnswer) {
                  optionStyle =
                    'bg-rose-500/20 border-rose-500 text-rose-200'
                } else {
                  optionStyle =
                    'bg-nocturn-card/50 border-nocturn-border/40 text-nocturn-muted opacity-50'
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(option)}
                  disabled={isAnswered}
                  className={`w-full p-4 sm:p-5 rounded-2xl border text-left font-medium transition-all duration-200 flex items-start gap-4 ${optionStyle}`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      isAnswered && isCorrectAnswer
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : isAnswered && isSelected && !isCorrectAnswer
                        ? 'bg-rose-500 text-white border-rose-400'
                        : 'border-nocturn-border text-nocturn-muted bg-white/5'
                    }`}
                  >
                    {isAnswered && isCorrectAnswer ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isAnswered && isSelected && !isCorrectAnswer ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      String.fromCharCode(65 + idx)
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm sm:text-base leading-relaxed">
                      {option.text}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Answer Feedback Banner & Next Button */}
      {isAnswered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            {selectedOption?.isCorrect ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                Correct! Mastery increased.
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-400">
                <XCircle className="w-5 h-5" />
                Incorrect. Review the correct answer above.
              </span>
            )}
          </div>

          <button
            onClick={handleNextQuestion}
            className="w-full sm:w-auto py-3.5 px-8 rounded-2xl bg-nocturn-accent text-black font-bold hover:bg-nocturn-accent-bright shadow-[0_0_20px_rgba(var(--color-nocturn-accent-rgb),0.4)] transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>
              {currentIndex < quizWords.length - 1
                ? 'Next Question'
                : 'Complete Review'}
            </span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      )}
    </div>
  )
}
