import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, CheckCircle2, BookOpen, Star, RefreshCw } from 'lucide-react'
import { getWordStatus } from '../../services/vocabService'

export default function VocabDetailModal({ word, onClose }) {
  if (!word) return null

  const status = getWordStatus(word)

  const getStatusBadge = () => {
    if (status === 'settled') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Settled
        </span>
      )
    }
    if (status === 'due_for_refresh') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <RefreshCw className="w-3.5 h-3.5" />
          Due for Refresh
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-nocturn-accent/15 text-nocturn-accent border border-nocturn-accent/30">
        <BookOpen className="w-3.5 h-3.5" />
        Learning
      </span>
    )
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
        {/* Backdrop overlay click */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-nocturn-card border border-nocturn-border rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-10 overflow-hidden"
        >
          {/* Top Close Button */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-5 right-5 p-2 rounded-xl text-nocturn-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header & Badges */}
          <div className="space-y-4 pr-8">
            <div className="flex flex-wrap items-center gap-2">
              {getStatusBadge()}
              {word.part_of_speech && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-nocturn-muted bg-white/5 border border-nocturn-border">
                  {word.part_of_speech}
                </span>
              )}
              {word.difficulty && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-amber-400/90 bg-amber-400/10 border border-amber-400/20">
                  {word.difficulty}
                </span>
              )}
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {word.word}
            </h2>
          </div>

          {/* Mastery Score Progress */}
          <div className="my-6 p-4 rounded-2xl bg-white/[0.03] border border-nocturn-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-nocturn-muted">Mastery Progress</span>
              <span className="text-nocturn-accent font-bold">
                {word.correct_count} / 5 Correct
              </span>
            </div>

            <div className="flex gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    i <= word.correct_count
                      ? 'bg-nocturn-accent shadow-[0_0_8px_rgba(0,230,118,0.5)]'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Definition */}
          <div className="space-y-2 my-4">
            <h3 className="text-xs uppercase font-bold tracking-wider text-nocturn-muted">
              Definition
            </h3>
            <p className="text-base text-nocturn-text leading-relaxed">
              {word.definition}
            </p>
          </div>

          {/* Example Sentence */}
          {word.example_sentence && (
            <div className="space-y-2 my-4 p-4 rounded-2xl bg-nocturn-accent/5 border-l-4 border-nocturn-accent">
              <h3 className="text-xs uppercase font-bold tracking-wider text-nocturn-accent">
                Example Sentence
              </h3>
              <p className="text-sm text-white/90 italic">
                "{word.example_sentence}"
              </p>
            </div>
          )}

          {/* Synonyms */}
          {Array.isArray(word.synonyms) && word.synonyms.length > 0 && (
            <div className="space-y-2 my-4">
              <h3 className="text-xs uppercase font-bold tracking-wider text-nocturn-muted">
                Synonyms
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {word.synonyms.map((syn, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-xl text-xs text-nocturn-text bg-white/5 border border-nocturn-border/50"
                  >
                    {syn}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meta Dates */}
          <div className="mt-6 pt-4 border-t border-nocturn-border/60 flex flex-wrap justify-between gap-3 text-xs text-nocturn-muted">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Added: {word.date_added || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-nocturn-accent/70" />
              <span>
                Last Quizzed:{' '}
                {word.last_quizzed_date ? word.last_quizzed_date : 'Never'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
