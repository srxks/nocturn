import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  ArrowRight,
  Plus,
  Volume2,
  SlidersHorizontal,
  Play,
  RotateCcw,
  Library,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { useVocab } from '../hooks/useVocab'
import VocabWordModal from '../components/vocab/VocabWordModal'
import VocabSessionConfigModal from '../components/vocab/VocabSessionConfigModal'
import {
  getVocabSessionConfig,
  generateAndSaveTodayLearningSession,
  DEFAULT_VOCAB_SESSION_CONFIG,
} from '../services/vocabService'
import { speakWord } from '../services/soundService'

export default function Vocab() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    allWords,
    learnedTodayCount,
    isDailyCompleted,
    todayVocabLog,
    reviewCount,
    addWord,
  } = useVocab()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [sessionConfig, setSessionConfig] = useState(() => ({ ...DEFAULT_VOCAB_SESSION_CONFIG }))

  // Load saved study session configuration per user
  useEffect(() => {
    let isMounted = true
    async function loadConfig() {
      try {
        const cfg = await getVocabSessionConfig(user?.id)
        if (isMounted && cfg) {
          setSessionConfig(cfg)
        }
      } catch (err) {
        console.warn('[Vocab] Failed to load config:', err)
      }
    }
    loadConfig()

    const handleConfigUpdate = (e) => {
      if (e?.detail) setSessionConfig(e.detail)
    }
    window.addEventListener('nocturn:vocab-config-updated', handleConfigUpdate)
    return () => {
      isMounted = false
      window.removeEventListener('nocturn:vocab-config-updated', handleConfigUpdate)
    }
  }, [user?.id])

  const totalConfiguredWords =
    (sessionConfig?.easy || 0) + (sessionConfig?.medium || 0) + (sessionConfig?.hard || 0)

  const handleStartLearn = async () => {
    if (totalConfiguredWords <= 0) {
      setIsConfigModalOpen(true)
      return
    }

    try {
      if (isDailyCompleted && todayVocabLog?.words?.length > 0) {
        navigate('/vocab/learn', { state: { customWords: todayVocabLog.words, config: sessionConfig } })
        return
      }

      if (todayVocabLog?.words?.length > 0) {
        navigate('/vocab/learn')
        return
      }

      const words = await generateAndSaveTodayLearningSession(user?.id, sessionConfig)
      navigate('/vocab/learn', { state: { customWords: words, config: sessionConfig } })
    } catch (err) {
      console.warn('Error starting vocab session:', err)
      navigate('/vocab/learn')
    }
  }

  // Word of the Day (Deterministic rotation based on day of month)
  const wordOfTheDay = useMemo(() => {
    if (!allWords || allWords.length === 0) return null
    const daySeed = new Date().getDate()
    return allWords[daySeed % allWords.length]
  }, [allWords])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Vocabulary
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Expand and retain high-yield vocabulary through active recall and spaced repetition.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Word</span>
          </button>

          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            title="Configure study quota & difficulties"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Study Settings</span>
          </button>
        </div>
      </div>

      {/* 2. Today's Learning Overview Strip */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
              Today's Goal
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-neutral-300 font-mono">
              {sessionConfig.easy} Easy · {sessionConfig.medium} Medium · {sessionConfig.hard} Hard
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white font-mono">
              {learnedTodayCount} / {totalConfiguredWords}
            </span>
            <span className="text-xs text-neutral-400">words learned today</span>
          </div>
          <div className="w-full max-w-md h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{
                width: `${totalConfiguredWords > 0 ? Math.min(100, (learnedTodayCount / totalConfiguredWords) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-neutral-400 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-5">
          <div>
            <span className="text-lg font-bold font-mono text-white block">
              {reviewCount}
            </span>
            <span className="text-[11px] text-neutral-500 uppercase font-semibold">
              Words Due Review
            </span>
          </div>
          <div className="border-l border-white/10 pl-4">
            <span className="text-lg font-bold font-mono text-emerald-400 block">
              {allWords.length}
            </span>
            <span className="text-[11px] text-neutral-500 uppercase font-semibold">
              Total in Library
            </span>
          </div>
        </div>
      </div>

      {/* 3. Three Core Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ACTION 1: Learn New Words */}
        <div className="p-5 rounded-2xl bg-white/[0.025] hover:bg-white/[0.035] border border-white/[0.08] flex flex-col justify-between space-y-4 transition-all">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">1. Learn New Words</h2>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Study today's curated flashcards with definitions, examples, and synonyms.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartLearn}
            disabled={totalConfiguredWords === 0}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-semibold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>
              {isDailyCompleted && learnedTodayCount >= totalConfiguredWords
                ? 'Review Today’s Set'
                : learnedTodayCount > 0
                ? 'Continue Learning'
                : 'Start Learning'}
            </span>
          </button>
        </div>

        {/* ACTION 2: Review Due Words */}
        <div className="p-5 rounded-2xl bg-white/[0.025] hover:bg-white/[0.035] border border-white/[0.08] flex flex-col justify-between space-y-4 transition-all">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">2. Review Due Words</h2>
                {reviewCount > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {reviewCount} Due
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Test previously learned words through adaptive multiple-choice quizzes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/vocab/review')}
            disabled={reviewCount === 0}
            className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              reviewCount > 0
                ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                : 'bg-white/5 text-neutral-500 border border-white/5 cursor-default'
            }`}
          >
            <span>{reviewCount > 0 ? 'Start Review' : 'All Caught Up!'}</span>
            {reviewCount > 0 && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* ACTION 3: Word Library */}
        <div className="p-5 rounded-2xl bg-white/[0.025] hover:bg-white/[0.035] border border-white/[0.08] flex flex-col justify-between space-y-4 transition-all">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">3. Word Library</h2>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Search, filter, edit, or delete words in your personal vocabulary collection.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/vocab/list')}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>Browse Library ({allWords.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Word of the Day Restrained Card */}
      {wordOfTheDay && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.015] border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                Word of the Day
              </span>
              {wordOfTheDay.part_of_speech && (
                <span className="text-xs text-neutral-500 italic">
                  ({wordOfTheDay.part_of_speech})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white tracking-tight">
                {wordOfTheDay.word}
              </span>
              <button
                type="button"
                onClick={() => speakWord(wordOfTheDay.word)}
                title="Pronounce word"
                className="p-1 text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {wordOfTheDay.definition}
            </p>
          </div>

          <div className="text-right shrink-0 self-end sm:self-center">
            <span className="text-[11px] text-neutral-500 font-mono">
              Mastery: {wordOfTheDay.correct_count || 0}/5
            </span>
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isAddModalOpen && (
          <VocabWordModal
            mode="add"
            onSave={async (wordData) => {
              await addWord(wordData)
            }}
            onClose={() => setIsAddModalOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isConfigModalOpen && (
          <VocabSessionConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={(newCfg) => setSessionConfig(newCfg)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
