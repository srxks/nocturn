import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ArrowLeft,
  BookOpen,
  Sparkles,
} from 'lucide-react'
import { useVocab } from '../hooks/useVocab'
import { getWordStatus } from '../services/vocabService'
import VocabDetailModal from '../components/vocab/VocabDetailModal'

export default function VocabList() {
  const navigate = useNavigate()
  const { allWords } = useVocab()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'learning' | 'settled' | 'due_for_refresh'
  const [selectedWord, setSelectedWord] = useState(null)

  // Filter and search words
  const filteredWords = useMemo(() => {
    return allWords.filter((item) => {
      const status = getWordStatus(item)

      // Filter tab match
      if (activeFilter === 'learning' && status !== 'learning') return false
      if (activeFilter === 'settled' && status !== 'settled') return false
      if (activeFilter === 'due_for_refresh' && status !== 'due_for_refresh')
        return false

      // Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const wordMatch = item.word?.toLowerCase().includes(q)
        const defMatch = item.definition?.toLowerCase().includes(q)
        return wordMatch || defMatch
      }

      return true
    })
  }, [allWords, activeFilter, searchQuery])

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/vocab')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-nocturn-muted hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Vocab</span>
          </button>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Word Library
          </h1>
          <p className="text-nocturn-muted text-sm">
            All learned GRE vocabulary words & progress tracker.
          </p>
        </div>

        <button
          onClick={() => navigate('/vocab/learn')}
          className="self-start sm:self-auto px-5 py-2.5 rounded-2xl bg-nocturn-accent text-black font-bold hover:bg-nocturn-accent-bright shadow-[0_0_15px_rgba(0,230,118,0.3)] transition-colors flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Learn New Words</span>
        </button>
      </div>

      {/* Search Bar & Filter Tabs */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-nocturn-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search words or definitions..."
            className="w-full pl-12 pr-4 py-3.5 bg-nocturn-card border border-nocturn-border rounded-2xl text-white placeholder:text-nocturn-muted focus:outline-none focus:border-nocturn-accent transition-colors"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: `All (${allWords.length})` },
            {
              id: 'learning',
              label: `Learning (${
                allWords.filter((w) => getWordStatus(w) === 'learning').length
              })`,
            },
            {
              id: 'settled',
              label: `Settled (${
                allWords.filter((w) => getWordStatus(w) === 'settled').length
              })`,
            },
            {
              id: 'due_for_refresh',
              label: `Due for Refresh (${
                allWords.filter((w) => getWordStatus(w) === 'due_for_refresh')
                  .length
              })`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeFilter === tab.id
                  ? 'bg-nocturn-accent/15 text-nocturn-accent border border-nocturn-accent/30 shadow-[0_0_12px_rgba(0,230,118,0.2)]'
                  : 'bg-nocturn-card text-nocturn-muted hover:text-white border border-nocturn-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Word Grid */}
      {filteredWords.length === 0 ? (
        <div className="p-12 text-center bg-nocturn-card border border-nocturn-border rounded-3xl space-y-3">
          <BookOpen className="w-12 h-12 text-nocturn-muted mx-auto opacity-50" />
          <h3 className="text-lg font-bold text-white">No Words Found</h3>
          <p className="text-sm text-nocturn-muted max-w-sm mx-auto">
            {searchQuery
              ? `No words matched "${searchQuery}"`
              : 'You have not learned any words in this category yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredWords.map((wordItem) => {
              const status = getWordStatus(wordItem)

              return (
                <motion.div
                  key={wordItem.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setSelectedWord(wordItem)}
                  className="p-5 rounded-3xl bg-nocturn-card border border-nocturn-border hover:border-nocturn-accent/40 cursor-pointer transition-all duration-200 space-y-3 flex flex-col justify-between group shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl font-bold text-white group-hover:text-nocturn-accent transition-colors">
                        {wordItem.word}
                      </h3>

                      {/* Status Badge */}
                      {status === 'settled' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Settled
                        </span>
                      ) : status === 'due_for_refresh' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Refresh
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-nocturn-accent/15 text-nocturn-accent border border-nocturn-accent/30">
                          Learning
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-nocturn-text/80 line-clamp-2 leading-relaxed">
                      {wordItem.definition}
                    </p>
                  </div>

                  {/* Footer Mastery Bar */}
                  <div className="pt-3 border-t border-nocturn-border/60 flex items-center justify-between text-xs">
                    <span className="text-nocturn-muted">
                      {wordItem.part_of_speech || 'noun'}
                    </span>

                    <span className="font-bold text-nocturn-accent">
                      {wordItem.correct_count} / 5 correct
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Vocab Detail Modal */}
      {selectedWord && (
        <VocabDetailModal
          word={selectedWord}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </div>
  )
}
