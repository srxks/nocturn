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
import { Card, Badge, Button, Progress } from '../components/ui'

export default function VocabReview() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { allWords, recordQuizResult, completeTodayReview, isReviewCompletedToday, dailyLimit } = useVocab()

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
  const reviewCompletedKey = `nocturn_review_completed_${userId || 'guest'}_${todayKey}`

  useEffect(() => {
    let active = true
    async function loadReviewWords() {
      try {
        // If today's review session was already completed, show empty state immediately
        const alreadyCompleted =
          typeof localStorage !== 'undefined' &&
          localStorage.getItem(reviewCompletedKey) === 'true'

        const savedWordsRaw =
          (typeof localStorage !== 'undefined' && localStorage.getItem(reviewWordsKey)) ||
          sessionStorage.getItem(reviewWordsKey)
        const savedProgressRaw =
          (typeof localStorage !== 'undefined' && localStorage.getItem(reviewProgressKey)) ||
          sessionStorage.getItem(reviewProgressKey)

        if (!alreadyCompleted && savedWordsRaw && savedProgressRaw) {
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

        if (alreadyCompleted) {
          if (active) {
            setQuizWords([])
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
  }, [userId, dailyLimit, reviewWordsKey, reviewProgressKey, reviewCompletedKey])

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
      await recordQuizResult(currentWord.id, isCorrect, userId)
    },
    [isAnswered, currentWord, recordQuizResult, userId]
  )

  // Advance to Next Question
  const handleNextQuestion = () => {
    if (currentIndex < quizWords.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setSelectedOption(null)
      setIsAnswered(false)
    } else {
      setIsCompleted(true)
      completeTodayReview().catch(console.warn)
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(reviewCompletedKey, 'true')
          localStorage.removeItem(reviewWordsKey)
          localStorage.removeItem(reviewProgressKey)
        }
        sessionStorage.setItem(reviewCompletedKey, 'true')
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

  // If no words due or already completed today
  if ((quizWords.length === 0 || isReviewCompletedToday) && !isCompleted) {
    return (
      <div className="max-w-xl mx-auto py-12 space-y-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_25px_rgba(16,185,129,0.3)]">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white">
            All Caught Up for Today!
          </h2>
          <p className="text-sm text-nocturn-muted max-w-md mx-auto">
            You've completed your daily vocabulary review. Your spaced repetition queue is clear for today.
          </p>
        </div>
        <button
          onClick={() => navigate('/vocab')}
          className="px-6 py-3 rounded-2xl bg-nocturn-accent text-white font-bold hover:bg-nocturn-accent-bright transition-colors cursor-pointer"
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
      <div className="max-w-xl mx-auto space-y-6 py-8">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto">
            <Award className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Review Complete
          </h1>
          <p className="text-nocturn-muted text-xs sm:text-sm">
            Your review performance has been saved.
          </p>
        </div>

        {/* Score Summary Card */}
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="text-center pb-4 border-b border-white/[0.06]">
            <span className="text-4xl sm:text-5xl font-bold font-mono text-nocturn-accent">
              {accuracy}%
            </span>
            <p className="text-xs uppercase font-medium tracking-wider text-nocturn-muted mt-1">
              Accuracy Score
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3.5 text-center">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <p className="text-xl font-semibold font-mono text-white">{totalReviewed}</p>
              <p className="text-[11px] text-nocturn-muted mt-0.5">Reviewed</p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xl font-semibold font-mono text-emerald-400">{score.correct}</p>
              <p className="text-[11px] text-emerald-400/80 mt-0.5">Correct</p>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <p className="text-xl font-semibold font-mono text-rose-400">{score.incorrect}</p>
              <p className="text-[11px] text-rose-400/80 mt-0.5">Incorrect</p>
            </div>
          </div>
        </Card>

        <Button
          variant="primary"
          size="lg"
          onClick={() => navigate('/vocab')}
          className="w-full justify-center"
        >
          Back to Vocabulary
        </Button>
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
          className="inline-flex items-center gap-1.5 text-xs font-medium text-nocturn-muted hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Review</span>
        </button>

        <Badge variant="neutral" size="sm" icon={HelpCircle}>
          Question {currentIndex + 1} of {quizWords.length}
        </Badge>
      </div>

      {/* Progress Bar */}
      <Progress
        value={((currentIndex + 1) / quizWords.length) * 100}
      />

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="space-y-5"
        >
          {/* Target Word Display */}
          <Card variant="elevated" className="p-6 sm:p-8 text-center space-y-2.5">
            <span className="text-xs uppercase font-semibold tracking-wider text-nocturn-muted">
              Select the correct definition
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {currentWord.word}
            </h1>
            {currentWord.part_of_speech && (
              <div>
                <Badge variant="neutral" size="sm">
                  {currentWord.part_of_speech}
                </Badge>
              </div>
            )}
          </Card>

          {/* Answer Choices (4 Options) */}
          <div className="space-y-2.5">
            {options.map((option, idx) => {
              const isSelected = selectedOption === option
              const isCorrectAnswer = option.isCorrect

              let optionStyle =
                'bg-nocturn-card border-white/[0.08] text-white/90 hover:border-white/20 hover:bg-white/[0.03]'

              if (isAnswered) {
                if (isCorrectAnswer) {
                  optionStyle =
                    'bg-emerald-500/15 border-emerald-500/40 text-white'
                } else if (isSelected && !isCorrectAnswer) {
                  optionStyle =
                    'bg-rose-500/15 border-rose-500/40 text-rose-200'
                } else {
                  optionStyle =
                    'bg-nocturn-card/40 border-white/[0.04] text-nocturn-muted opacity-40'
                }
              }

              return (
                <motion.button
                  key={idx}
                  whileHover={!isAnswered ? { scale: 1.01, y: -1 } : {}}
                  whileTap={!isAnswered ? { scale: 0.99 } : {}}
                  onClick={() => handleSelectOption(option)}
                  disabled={isAnswered}
                  className={`w-full p-4 sm:p-4.5 rounded-xl border text-left font-medium transition-all duration-150 flex items-start gap-3.5 cursor-pointer disabled:cursor-default ${optionStyle}`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 ${
                      isAnswered && isCorrectAnswer
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : isAnswered && isSelected && !isCorrectAnswer
                        ? 'bg-rose-500 text-white border-rose-400'
                        : 'border-white/[0.1] text-nocturn-muted bg-white/[0.04]'
                    }`}
                  >
                    {isAnswered && isCorrectAnswer ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isAnswered && isSelected && !isCorrectAnswer ? (
                      <XCircle className="w-3.5 h-3.5" />
                    ) : (
                      String.fromCharCode(65 + idx)
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-xs sm:text-sm leading-relaxed">
                      {option.text}
                    </p>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Answer Feedback Banner & Next Button */}
      {isAnswered && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            {selectedOption?.isCorrect ? (
              <Badge variant="success" size="md" dot icon={CheckCircle2}>
                Correct! Mastery increased.
              </Badge>
            ) : (
              <Badge variant="danger" size="md" dot icon={XCircle}>
                Incorrect. Review the correct answer above.
              </Badge>
            )}
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleNextQuestion}
            className="w-full sm:w-auto"
          >
            <span>
              {currentIndex < quizWords.length - 1
                ? 'Next Question'
                : 'Complete Review'}
            </span>
            <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        </motion.div>
      )}
    </div>
  )
}
