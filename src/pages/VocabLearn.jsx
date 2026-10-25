import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
  SlidersHorizontal,
  RotateCw,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { useVocab } from '../hooks/useVocab'
import {
  getTodayDateKey,
  saveDailyVocabLog,
  getWordsByDifficultyDistribution,
  generateAndSaveTodayLearningSession,
} from '../services/vocabService'
import { speakWord } from '../services/soundService'
import VocabWordModal from '../components/vocab/VocabWordModal'
import VocabSessionConfigModal from '../components/vocab/VocabSessionConfigModal'
import { Card, Badge, Button, Progress } from '../components/ui'

export default function VocabLearn() {
  const navigate = useNavigate()
  const location = useLocation()
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
    recordQuizResult,
  } = useVocab()

  const todayKey = getTodayDateKey()

  const [customWords, setCustomWords] = useState(() => location.state?.customWords || null)
  const [sessionConfig, setSessionConfig] = useState(() => location.state?.config || null)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [flippedWordIndex, setFlippedWordIndex] = useState(null)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Asynchronously ensure session words are loaded if not in location.state
  useEffect(() => {
    if (!customWords || customWords.length === 0) {
      if (todayVocabLog?.words && Array.isArray(todayVocabLog.words) && todayVocabLog.words.length > 0) {
        setCustomWords(todayVocabLog.words)
        if (todayVocabLog.config) setSessionConfig(todayVocabLog.config)
      } else {
        generateAndSaveTodayLearningSession(user?.id, sessionConfig).then((words) => {
          if (words && words.length > 0) {
            setCustomWords(words)
          }
        }).catch(console.error)
      }
    }
  }, [customWords, todayVocabLog, user?.id, sessionConfig])

  const effectiveWords = useMemo(() => {
    if (customWords && customWords.length > 0) return customWords
    if (todayVocabLog?.words && Array.isArray(todayVocabLog.words) && todayVocabLog.words.length > 0) {
      return todayVocabLog.words
    }
    return dailyWords
  }, [customWords, todayVocabLog, dailyWords])

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

  const safeIndex = Math.max(0, Math.min(currentIndex, Math.max(0, effectiveWords.length - 1)))
  const currentWord = effectiveWords[safeIndex]

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

  const isFlipped = flippedWordIndex === safeIndex
  const toggleFlip = useCallback(() => {
    setFlippedWordIndex((prev) => (prev === safeIndex ? null : safeIndex))
  }, [safeIndex])

  const handleNext = useCallback(async () => {
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

    if (nextIdx < effectiveWords.length) {
      setCurrentIndex(nextIdx)
      try {
        if (sessionLearnKey) localStorage.setItem(sessionLearnKey, String(nextIdx))
      } catch {
        // ignore
      }
      await saveDailyVocabLog({
        date: todayKey,
        userId: user?.id || null,
        wordIds: effectiveWords.map((w) => w.id),
        words: effectiveWords,
        config: sessionConfig,
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
        if (sessionLearnKey) localStorage.setItem(sessionLearnKey, String(effectiveWords.length - 1))
      } catch {
        // ignore
      }
      await saveDailyVocabLog({
        date: todayKey,
        userId: user?.id || null,
        wordIds: effectiveWords.map((w) => w.id),
        words: effectiveWords,
        config: sessionConfig,
        currentIndex: effectiveWords.length - 1,
        completedWordIds: effectiveWords.map((w) => w.id),
        completed: true,
        updated_at: new Date().toISOString(),
      })
    }
  }, [safeIndex, currentWord, sessionCompletedIdsKey, effectiveWords, sessionLearnKey, todayKey, user, sessionConfig, sessionCompleteKey])

  const handleStartNewSession = async (cfg) => {
    try {
      const words = await generateAndSaveTodayLearningSession(user?.id, cfg)
      setCustomWords(words)
      setSessionConfig(cfg)
      setCurrentIndex(0)
      setCompletedManually(false)
      setBrowsingCards(false)
    } catch (err) {
      console.error('Failed to start new custom session:', err)
    }
  }

  const handlePrev = useCallback(async () => {
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
        wordIds: effectiveWords.map((w) => w.id),
        words: effectiveWords,
        config: sessionConfig,
        currentIndex: prevIdx,
        completedWordIds: todayVocabLog?.completedWordIds || [],
        completed: false,
        updated_at: new Date().toISOString(),
      })
    }
  }, [safeIndex, sessionLearnKey, todayKey, user, effectiveWords, sessionConfig, todayVocabLog?.completedWordIds])

  const handlePronounce = useCallback((word, e) => {
    e?.stopPropagation?.()
    if (!word || typeof window === 'undefined' || !('speechSynthesis' in window)) return
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(word)
      utterance.rate = 0.88
      utterance.pitch = 1.0
      utterance.lang = 'en-US'
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    } catch {
      setIsSpeaking(false)
    }
  }, [])

  const handleRate = useCallback(async (rating) => {
    if (!currentWord?.id) return
    try {
      if (recordQuizResult) {
        await recordQuizResult(currentWord.id, rating >= 2, user?.id)
      }
    } catch (err) {
      console.warn('Could not record rating:', err)
    }
    await handleNext()
  }, [currentWord, user, recordQuizResult, handleNext])

  // Keyboard ergonomics: Space (flip card), ← / → navigate, 1/2/3 rate
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isConfigModalOpen || isAddModalOpen) return
      const activeTag = document.activeElement?.tagName?.toLowerCase()
      if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable) return

      if (e.code === 'Space') {
        e.preventDefault()
        toggleFlip()
      } else if (e.key === 'ArrowRight' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      } else if (e.key === '1') {
        e.preventDefault()
        handleRate(1)
      } else if (e.key === '2') {
        e.preventDefault()
        handleRate(2)
      } else if (e.key === '3') {
        e.preventDefault()
        handleRate(3)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isConfigModalOpen, isAddModalOpen, handleNext, handlePrev, handleRate, toggleFlip])

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

  // Empty Library State (User has no words to study)
  if (effectiveWords.length === 0) {
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
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => navigate('/vocab')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-nocturn-muted hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {sessionConfig && (
            <span className="text-[11px] font-mono text-nocturn-muted hidden sm:inline">
              Custom ({sessionConfig.easy > 0 ? `${sessionConfig.easy}E ` : ''}{sessionConfig.medium > 0 ? `${sessionConfig.medium}M ` : ''}{sessionConfig.hard > 0 ? `${sessionConfig.hard}H` : ''})
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="px-2.5 py-1 rounded-xl text-xs font-medium text-nocturn-muted hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Configure difficulty & word count"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Configure</span>
          </button>
          {/* Step Indicator */}
          <Badge variant="neutral" size="sm" icon={Sparkles}>
            {safeIndex + 1} of {effectiveWords.length}
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <Progress
        value={((safeIndex + 1) / Math.max(1, effectiveWords.length)) * 100}
      />

      {/* 3D Flashcard Component */}
      <div
        className="w-full cursor-pointer select-none"
        style={{ perspective: 1200 }}
        onClick={toggleFlip}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative w-full min-h-[380px]"
        >
          {/* FRONT OF CARD */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
            className={`w-full ${isFlipped ? 'pointer-events-none absolute inset-0' : 'relative'}`}
          >
            <Card variant="elevated" className="h-full min-h-[380px] p-6 sm:p-8 flex flex-col justify-between border-white/[0.08] hover:border-nocturn-accent/30 transition-all shadow-xl bg-gradient-to-b from-[#11131f] to-[#0c0d16]">
              {/* Top Badges */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {currentWord?.part_of_speech && (
                    <Badge variant="accent" size="sm">
                      {currentWord.part_of_speech}
                    </Badge>
                  )}
                  {currentWord?.difficulty && (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        currentWord.difficulty.toLowerCase() === 'easy'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : currentWord.difficulty.toLowerCase() === 'hard'
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {currentWord.difficulty}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-nocturn-muted">GRE Vocabulary</span>
              </div>

              {/* Center Word & Audio */}
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                  {currentWord?.word}
                </h1>

                {currentWord?.word && (
                  <button
                    type="button"
                    onClick={(e) => handlePronounce(currentWord.word, e)}
                    title="Pronounce word"
                    aria-label={`Pronounce ${currentWord.word}`}
                    className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-nocturn-muted hover:text-nocturn-accent border border-white/[0.06] transition-all cursor-pointer flex items-center gap-2 text-xs font-medium shadow-sm"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Pronounce</span>
                    {isSpeaking && (
                      <div className="flex items-center gap-0.5 h-3 ml-1">
                        <span className="w-0.5 h-full bg-nocturn-accent animate-pulse rounded-full" />
                        <span className="w-0.5 h-2 bg-nocturn-accent animate-pulse delay-75 rounded-full" />
                        <span className="w-0.5 h-3 bg-nocturn-accent animate-pulse delay-150 rounded-full" />
                      </div>
                    )}
                  </button>
                )}
              </div>

              {/* Bottom Flip Prompt */}
              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-center gap-2 text-xs text-nocturn-muted">
                <RotateCw className="w-3.5 h-3.5 text-nocturn-accent" />
                <span>Tap card or press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/10 text-[10px] font-mono text-white">Space</kbd> to reveal definition</span>
              </div>
            </Card>
          </div>

          {/* BACK OF CARD */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
            className={`w-full ${!isFlipped ? 'pointer-events-none absolute inset-0' : 'relative'}`}
          >
            <Card variant="elevated" className="h-full min-h-[380px] p-6 sm:p-8 flex flex-col justify-between border-white/[0.08] hover:border-nocturn-accent/30 transition-all shadow-xl bg-gradient-to-b from-[#11131f] to-[#0c0d16] space-y-4">
              {/* Top Header */}
              <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl font-bold text-white tracking-tight">
                    {currentWord?.word}
                  </span>
                  {currentWord?.part_of_speech && (
                    <Badge variant="accent" size="sm">
                      {currentWord.part_of_speech}
                    </Badge>
                  )}
                </div>
                {currentWord?.word && (
                  <button
                    type="button"
                    onClick={(e) => handlePronounce(currentWord.word, e)}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-nocturn-muted hover:text-nocturn-accent transition-colors cursor-pointer"
                    title="Pronounce word"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Body: Definition, Example, Synonyms */}
              <div className="space-y-4 flex-1">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-nocturn-muted block">
                    Definition
                  </span>
                  <p className="text-base sm:text-lg text-white/95 leading-relaxed font-normal">
                    {currentWord?.definition}
                  </p>
                </div>

                {currentWord?.example_sentence && (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border-l-2 border-nocturn-accent space-y-0.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-nocturn-accent block">
                      Example
                    </span>
                    <p className="text-xs sm:text-sm text-white/90 italic">
                      "{currentWord.example_sentence}"
                    </p>
                  </div>
                )}

                {Array.isArray(currentWord?.synonyms) && currentWord.synonyms.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-nocturn-muted block">
                      Synonyms
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentWord.synonyms.map((syn, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg text-xs text-nocturn-muted bg-white/[0.03] border border-white/[0.06]"
                        >
                          {syn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Flip Back */}
              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-center gap-2 text-xs text-nocturn-muted">
                <RotateCw className="w-3.5 h-3.5 text-nocturn-accent" />
                <span>Tap card or press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/10 text-[10px] font-mono text-white">Space</kbd> to flip back</span>
              </div>
            </Card>
          </div>
        </motion.div>
      </div>

      {/* Control & Rating Bar */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handlePrev}
            disabled={safeIndex === 0}
            icon={ChevronLeft}
            className="w-full sm:w-auto"
          >
            <span>Previous</span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/10 text-[10px] font-mono text-nocturn-muted">
              ←
            </kbd>
          </Button>

          {/* Quick Mastery Rating Buttons */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => handleRate(1)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Need more practice (Key 1)"
            >
              <span>Again</span>
              <kbd className="px-1 py-0.2 rounded bg-rose-500/20 text-[10px] font-mono">1</kbd>
            </button>
            <button
              type="button"
              onClick={() => handleRate(2)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Familiar but tricky (Key 2)"
            >
              <span>Hard</span>
              <kbd className="px-1 py-0.2 rounded bg-amber-500/20 text-[10px] font-mono">2</kbd>
            </button>
            <button
              type="button"
              onClick={() => handleRate(3)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Know it well (Key 3)"
            >
              <span>Good</span>
              <kbd className="px-1 py-0.2 rounded bg-emerald-500/20 text-[10px] font-mono">3</kbd>
            </button>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleNext}
            className="w-full sm:w-auto"
          >
            <span>
              {safeIndex === effectiveWords.length - 1
                ? 'Complete Set'
                : 'Next Word'}
            </span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded bg-black/30 border border-black/20 text-[10px] font-mono text-black font-bold">
              →
            </kbd>
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Hotkey Legend */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 text-[11px] text-nocturn-muted pt-1">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono text-[10px] text-white">Space</kbd> Flip
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono text-[10px] text-white">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono text-[10px] text-white">→</kbd> Navigate
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono text-[10px] text-white">1</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono text-[10px] text-white">2</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono text-[10px] text-white">3</kbd> Rate
          </span>
        </div>
      </div>

      {/* Vocab Session Config Modal */}
      <VocabSessionConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onStartSession={handleStartNewSession}
        onSaveConfig={(cfg) => setSessionConfig(cfg)}
        initialConfig={sessionConfig}
      />
    </div>
  )
}
