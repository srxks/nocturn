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
  Volume2,
} from 'lucide-react'
import { useVocab } from '../hooks/useVocab'
import { getWordStatus } from '../services/vocabService'
import { speakWord } from '../services/soundService'
import VocabDetailModal from '../components/vocab/VocabDetailModal'
import VocabWordModal from '../components/vocab/VocabWordModal'
import { Card, Badge, Button, Tabs } from '../components/ui'

export default function VocabList() {
  const navigate = useNavigate()
  const { allWords, addWord, deleteAllWords } = useVocab()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'learning' | 'settled' | 'due_for_refresh'
  const [difficultyFilter, setDifficultyFilter] = useState('all') // 'all' | 'Easy' | 'Medium' | 'Hard'
  const [sortBy, setSortBy] = useState('alphabetical') // 'alphabetical' | 'recent' | 'mastery'
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

  // Filter, search, and sort words
  const filteredWords = useMemo(() => {
    const list = allWords.filter((item) => {
      const status = getWordStatus(item)

      // Filter tab match
      if (activeFilter === 'learning' && status !== 'learning') return false
      if (activeFilter === 'settled' && status !== 'settled') return false
      if (activeFilter === 'due_for_refresh' && status !== 'due_for_refresh') return false

      // Difficulty filter
      if (difficultyFilter !== 'all') {
        const itemDiff = (item.difficulty || 'Medium').toLowerCase()
        if (itemDiff !== difficultyFilter.toLowerCase()) return false
      }

      // Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const wordMatch = item.word?.toLowerCase().includes(q)
        const defMatch = item.definition?.toLowerCase().includes(q)
        const posMatch = item.part_of_speech?.toLowerCase().includes(q)
        return wordMatch || defMatch || posMatch
      }

      return true
    })

    // Sort
    return list.sort((a, b) => {
      if (sortBy === 'recent') {
        const dateA = new Date(a.date_added || a.updatedAt || a.created_at || 0).getTime()
        const dateB = new Date(b.date_added || b.updatedAt || b.created_at || 0).getTime()
        return dateB - dateA
      }
      if (sortBy === 'mastery') {
        return (b.correct_count || 0) - (a.correct_count || 0)
      }
      // default alphabetical
      return (a.word || '').localeCompare(b.word || '')
    })
  }, [allWords, activeFilter, difficultyFilter, searchQuery, sortBy])

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
            All learned GRE vocabulary words, definitions, and mastery progress.
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

      {/* Search Bar & Multi-Dimensional Filters */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-nocturn-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search words, definitions, or parts of speech..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] focus:border-nocturn-accent/60 rounded-xl text-sm text-white placeholder:text-nocturn-muted outline-none transition-colors"
            />
          </div>

          {/* Difficulty Dropdown Filter */}
          <div className="flex items-center gap-2">
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              aria-label="Filter by difficulty"
              className="bg-neutral-900 border border-white/10 text-white text-xs px-3 py-2.5 rounded-xl outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort words"
              className="bg-neutral-900 border border-white/10 text-white text-xs px-3 py-2.5 rounded-xl outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="alphabetical">A → Z</option>
              <option value="recent">Recently Added</option>
              <option value="mastery">Mastery (High to Low)</option>
            </select>
          </div>
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
      </div>

      {/* Word Grid */}
      {filteredWords.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-nocturn-muted mx-auto opacity-40" />
          <h3 className="text-base font-semibold text-white">No Words Found</h3>
          <p className="text-xs text-nocturn-muted max-w-sm mx-auto">
            {searchQuery
              ? `No words matched "${searchQuery}"`
              : allWords.length === 0
              ? 'Your library is empty. Start a learning session or add your first word!'
              : 'No words matched the selected filter criteria.'}
          </p>
          {allWords.length === 0 && (
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/vocab/learn')}
                icon={Sparkles}
              >
                Start Learning Now
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <AnimatePresence>
            {filteredWords.map((wordItem) => {
              const status = getWordStatus(wordItem)
              const diff = wordItem.difficulty || 'Medium'
              const diffBadgeClass =
                diff.toLowerCase() === 'easy'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : diff.toLowerCase() === 'medium'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'

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
                    className="space-y-3 flex flex-col justify-between group h-full border border-white/[0.08] hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
                            {wordItem.word}
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              speakWord(wordItem.word)
                            }}
                            title="Pronounce word"
                            aria-label={`Pronounce ${wordItem.word}`}
                            className="p-1 text-nocturn-muted hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${diffBadgeClass}`}>
                            {diff}
                          </span>
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
                              Learning
                            </Badge>
                          )}
                        </div>
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

                      <span className="text-[11px] font-mono font-medium text-emerald-400">
                        {wordItem.correct_count >= 5 ? '5/5 (Mastered)' : `${wordItem.correct_count || 0}/5 reviews`}
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
          <div className="w-full max-w-md bg-neutral-900 border border-rose-500/30 rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Delete All Vocabulary Words?</h3>
            </div>
            <p className="text-xs sm:text-sm text-nocturn-muted">
              Delete all vocabulary words? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="ghost"
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
