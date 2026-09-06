import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Plus,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { useVocab } from '../hooks/useVocab'
import { getWordStatus } from '../services/vocabService'
import VocabDetailModal from '../components/vocab/VocabDetailModal'
import VocabWordModal from '../components/vocab/VocabWordModal'

export default function VocabList() {
  const navigate = useNavigate()
  const { allWords, addWord, deleteAllWords } = useVocab()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'learning' | 'settled' | 'due_for_refresh'
  const [selectedWord, setSelectedWord] = useState(null)
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

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-nocturn-border transition-colors flex items-center gap-2 text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-nocturn-accent" />
            <span>Add Word</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/vocab/learn')}
            className="px-4 py-2.5 rounded-2xl bg-nocturn-accent text-black font-bold hover:bg-nocturn-accent-bright shadow-[0_0_15px_rgba(var(--color-nocturn-accent-rgb),0.3)] transition-colors flex items-center gap-2 text-xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Learn Words</span>
          </button>

          <button
            type="button"
            onClick={() => setIsConfirmDeleteAllOpen(true)}
            disabled={allWords.length === 0}
            className="px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors flex items-center gap-2 text-xs font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Delete All Words</span>
          </button>
        </div>
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
              label: `In Progress (${
                allWords.filter((w) => getWordStatus(w) === 'learning').length
              })`,
            },
            {
              id: 'settled',
              label: `Mastered (${
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
                  ? 'bg-nocturn-accent/15 text-nocturn-accent border border-nocturn-accent/30 shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.2)]'
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
                          Mastered
                        </span>
                      ) : status === 'due_for_refresh' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Refresh
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-nocturn-accent/15 text-nocturn-accent border border-nocturn-accent/30">
                          In Progress
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
                      {wordItem.correct_count >= 5 ? 'Mastered' : `${wordItem.correct_count || 0} of 5 reviews passed`}
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
          <div className="w-full max-w-md bg-nocturn-card border border-rose-500/30 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete All Vocabulary Words?</h3>
            </div>
            <p className="text-sm text-nocturn-muted">
              Delete all vocabulary words? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAllOpen(false)}
                disabled={isDeletingAll}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-nocturn-border cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllConfirm}
                disabled={isDeletingAll}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer transition-colors disabled:opacity-50"
              >
                {isDeletingAll ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
