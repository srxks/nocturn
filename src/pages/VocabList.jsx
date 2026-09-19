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
import { Card, Badge, Button, Tabs } from '../components/ui'

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

  const filterTabs = [
    { id: 'all', label: 'All', count: allWords.length },
    {
      id: 'learning',
      label: 'In Progress',
      count: allWords.filter((w) => getWordStatus(w) === 'learning').length,
    },
    {
      id: 'settled',
      label: 'Mastered',
      count: allWords.filter((w) => getWordStatus(w) === 'settled').length,
    },
    {
      id: 'due_for_refresh',
      label: 'Due for Refresh',
      count: allWords.filter((w) => getWordStatus(w) === 'due_for_refresh').length,
    },
  ]

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/vocab')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-nocturn-muted hover:text-white transition-colors mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Vocabulary</span>
          </button>

          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Word Library
          </h1>
          <p className="text-nocturn-muted text-xs sm:text-sm">
            All learned GRE vocabulary words and mastery status.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={Plus}
          >
            Add Word
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/vocab/learn')}
            icon={Sparkles}
          >
            Learn Words
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsConfirmDeleteAllOpen(true)}
            disabled={allWords.length === 0}
            icon={Trash2}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
          >
            Delete All
          </Button>
        </div>
      </div>

      {/* Search Bar & Filter Tabs */}
      <div className="space-y-4">
        <div className="relative max-w-xl">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-nocturn-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search words or definitions..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] focus:border-nocturn-accent/60 rounded-xl text-sm text-white placeholder:text-nocturn-muted outline-none transition-colors"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Tabs
            tabs={filterTabs}
            activeTab={activeFilter}
            onChange={setActiveFilter}
            size="sm"
          />
        </div>
        <p className="text-[11px] text-nocturn-muted">
          Mastery: 5 successful reviews. Mastered words remain permanently in your library.
        </p>
      </div>

      {/* Word Grid */}
      {filteredWords.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-nocturn-muted mx-auto opacity-40" />
          <h3 className="text-base font-semibold text-white">No Words Found</h3>
          <p className="text-xs text-nocturn-muted max-w-sm mx-auto">
            {searchQuery
              ? `No words matched "${searchQuery}"`
              : 'You have not learned any words in this category yet.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                >
                  <Card
                    variant="interactive"
                    padding="sm"
                    className="space-y-3 flex flex-col justify-between group h-full"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-semibold text-white group-hover:text-nocturn-accent transition-colors">
                          {wordItem.word}
                        </h3>

                        {/* Status Badge */}
                        {status === 'settled' ? (
                          <Badge variant="success" size="sm" dot>
                            Mastered
                          </Badge>
                        ) : status === 'due_for_refresh' ? (
                          <Badge variant="warning" size="sm" dot>
                            Refresh
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm" dot>
                            In Progress
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-nocturn-muted line-clamp-2 leading-relaxed">
                        {wordItem.definition}
                      </p>
                    </div>

                    {/* Footer Mastery Bar */}
                    <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <span className="text-[11px] text-nocturn-muted capitalize">
                        {wordItem.part_of_speech || 'noun'}
                      </span>

                      <span className="text-[11px] font-mono font-medium text-nocturn-accent">
                        {wordItem.correct_count >= 5 ? 'Mastered' : `${wordItem.correct_count || 0}/5 reviews`}
                      </span>
                    </div>
                  </Card>
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
          <div className="w-full max-w-md bg-nocturn-card border border-rose-500/30 rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Delete All Vocabulary Words?</h3>
            </div>
            <p className="text-xs sm:text-sm text-nocturn-muted">
              Delete all vocabulary words? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsConfirmDeleteAllOpen(false)}
                disabled={isDeletingAll}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteAllConfirm}
                disabled={isDeletingAll}
              >
                {isDeletingAll ? 'Deleting...' : 'Delete All'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
