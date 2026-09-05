import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { useVocab } from '../hooks/useVocab'

export default function VocabLearn() {
  const navigate = useNavigate()
  const {
    todayGeneratedWords,
    learnedTodayCount,
    isGenerating,
    generationError,
    fetchOrGenerateDailyWords,
    markWordLearned,
  } = useVocab()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isCompletedView, setIsCompletedView] = useState(false)
  const [loadingWords, setLoadingWords] = useState(false)

  // Fetch words if not generated yet
  useEffect(() => {
    async function initWords() {
      if (todayGeneratedWords.length === 0 && !isGenerating && !generationError) {
        try {
          setLoadingWords(true)
          await fetchOrGenerateDailyWords()
        } catch {
          // Handled by hook error state
        } finally {
          setLoadingWords(false)
        }
      }
    }
    initWords()
  }, [todayGeneratedWords.length, isGenerating, generationError, fetchOrGenerateDailyWords])

  // Save current word as learned when user views / passes it
  useEffect(() => {
    if (todayGeneratedWords[currentIndex]) {
      markWordLearned(todayGeneratedWords[currentIndex])
    }
  }, [currentIndex, todayGeneratedWords, markWordLearned])

  // If daily is already completed before entering, show completion view
  useEffect(() => {
    if (learnedTodayCount >= 5 && todayGeneratedWords.length === 5) {
      // Allow reviewing through cards or completion view
    }
  }, [learnedTodayCount, todayGeneratedWords.length])

  const currentWord = todayGeneratedWords[currentIndex]

  const handleNext = () => {
    if (currentIndex < todayGeneratedWords.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      setIsCompletedView(true)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  // Loading State
  if (isGenerating || loadingWords) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent shadow-[0_0_25px_rgba(0,230,118,0.3)]">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-xl font-bold text-white">
            Generating Daily Vocabulary
          </h2>
          <p className="text-sm text-nocturn-muted">
            Requesting 5 GRE-level words from Gemini AI...
          </p>
        </div>
      </div>
    )
  }

  // Error / Offline State
  if (generationError || todayGeneratedWords.length === 0) {
    return (
      <div className="max-w-xl mx-auto space-y-6 py-8">
        <button
          onClick={() => navigate('/vocab')}
          className="inline-flex items-center gap-2 text-sm text-nocturn-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Vocab</span>
        </button>

        <div className="p-8 rounded-3xl bg-nocturn-card border border-rose-500/30 space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">
            Unable to Load Today's Words
          </h2>
          <p className="text-sm text-nocturn-muted">
            {generationError || "You're offline. Connect to the internet to generate today's new words."}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => fetchOrGenerateDailyWords()}
              className="px-6 py-2.5 rounded-xl bg-nocturn-accent text-black font-bold hover:bg-nocturn-accent-bright transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/vocab')}
              className="px-6 py-2.5 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors border border-nocturn-border"
            >
              Back to Home
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
            Today's 5 Words Completed!
          </h1>
          <p className="text-nocturn-muted text-sm max-w-md mx-auto">
            Great job! You've learned today's GRE vocabulary set. They are now saved in your library.
          </p>
        </div>

        {/* Word Summary List */}
        <div className="bg-nocturn-card border border-nocturn-border rounded-3xl p-6 space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <h3 className="text-xs uppercase font-bold tracking-wider text-nocturn-muted mb-2">
            Today's Words
          </h3>
          {todayGeneratedWords.map((item, idx) => (
            <div
              key={idx}
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
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <button
            onClick={() => navigate('/vocab')}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold border border-nocturn-border transition-colors text-center"
          >
            Back to Vocab Home
          </button>
          <button
            onClick={() => navigate('/vocab/review')}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-nocturn-accent text-black font-bold hover:bg-nocturn-accent-bright shadow-[0_0_20px_rgba(0,230,118,0.4)] transition-colors text-center"
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
          className="inline-flex items-center gap-2 text-sm text-nocturn-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nocturn-card border border-nocturn-border text-xs font-bold text-white">
          <Sparkles className="w-3.5 h-3.5 text-nocturn-accent" />
          <span>
            {currentIndex + 1} / {todayGeneratedWords.length}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden border border-nocturn-border/50">
        <div
          className="h-full bg-nocturn-accent transition-all duration-300 rounded-full"
          style={{
            width: `${((currentIndex + 1) / todayGeneratedWords.length) * 100}%`,
          }}
        />
      </div>

      {/* Flashcard Component with AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="bg-nocturn-card border border-nocturn-border rounded-3xl p-6 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.8)] space-y-6"
        >
          {/* Top Word Badges */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentWord.part_of_speech && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold text-nocturn-accent bg-nocturn-accent/15 border border-nocturn-accent/30">
                  {currentWord.part_of_speech}
                </span>
              )}
              {currentWord.difficulty && (
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
              {currentWord.word}
            </h1>
          </div>

          {/* Definition */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs uppercase font-bold tracking-wider text-nocturn-muted">
              Definition
            </h3>
            <p className="text-lg sm:text-xl text-nocturn-text leading-relaxed font-medium">
              {currentWord.definition}
            </p>
          </div>

          {/* Example Sentence */}
          {currentWord.example_sentence && (
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
          {Array.isArray(currentWord.synonyms) && currentWord.synonyms.length > 0 && (
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
          disabled={currentIndex === 0}
          className="py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-nocturn-border transition-colors flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Previous</span>
        </button>

        <button
          onClick={handleNext}
          className="py-3.5 px-8 rounded-2xl bg-nocturn-accent text-black font-bold hover:bg-nocturn-accent-bright shadow-[0_0_20px_rgba(0,230,118,0.4)] transition-all duration-200 flex items-center gap-2"
        >
          <span>
            {currentIndex === todayGeneratedWords.length - 1
              ? 'Complete Daily Set'
              : 'Next Word'}
          </span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
