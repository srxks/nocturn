import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BookOpen, Plus, Check } from 'lucide-react'

function VocabWordForm({ initialData, mode, onSave, onClose }) {
  const [word, setWord] = useState(() => (mode === 'edit' && initialData?.word) || '')
  const [definition, setDefinition] = useState(() => (mode === 'edit' && initialData?.definition) || '')
  const [exampleSentence, setExampleSentence] = useState(() => (mode === 'edit' && initialData?.example_sentence) || '')
  const [partOfSpeech, setPartOfSpeech] = useState(() => (mode === 'edit' && initialData?.part_of_speech) || 'noun')
  const [difficulty, setDifficulty] = useState(() => (mode === 'edit' && initialData?.difficulty) || 'Hard')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!word.trim()) {
      setError('Word cannot be empty.')
      return
    }
    if (!definition.trim()) {
      setError('Definition cannot be empty.')
      return
    }

    try {
      setIsSaving(true)
      setError('')
      await onSave({
        word: word.trim(),
        definition: definition.trim(),
        example_sentence: exampleSentence.trim(),
        part_of_speech: partOfSpeech,
        difficulty: difficulty,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save vocabulary word.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-nocturn-card border border-nocturn-border rounded-3xl p-6 sm:p-7 shadow-2xl z-10 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent">
                {mode === 'add' ? <Plus className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
              </div>
              <h2 className="text-xl font-bold text-white">
                {mode === 'add' ? 'Add Vocabulary Word' : 'Edit Vocabulary Word'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-nocturn-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Word Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nocturn-muted uppercase tracking-wider block">
                Word *
              </label>
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="e.g. Aberration"
                disabled={mode === 'edit'}
                className="w-full px-3.5 py-2.5 bg-nocturn-surface border border-nocturn-border rounded-xl text-white placeholder:text-nocturn-muted focus:outline-none focus:border-nocturn-accent text-sm disabled:opacity-60"
              />
            </div>

            {/* Definition Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nocturn-muted uppercase tracking-wider block">
                Definition *
              </label>
              <textarea
                rows={2}
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                placeholder="Clear and concise definition..."
                className="w-full px-3.5 py-2.5 bg-nocturn-surface border border-nocturn-border rounded-xl text-white placeholder:text-nocturn-muted focus:outline-none focus:border-nocturn-accent text-sm resize-none"
              />
            </div>

            {/* Example Sentence Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nocturn-muted uppercase tracking-wider block">
                Example Sentence (Optional)
              </label>
              <textarea
                rows={2}
                value={exampleSentence}
                onChange={(e) => setExampleSentence(e.target.value)}
                placeholder="Usage in a sentence..."
                className="w-full px-3.5 py-2.5 bg-nocturn-surface border border-nocturn-border rounded-xl text-white placeholder:text-nocturn-muted focus:outline-none focus:border-nocturn-accent text-sm resize-none"
              />
            </div>

            {/* Part of Speech & Difficulty Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-nocturn-muted uppercase tracking-wider block">
                  Part of Speech
                </label>
                <select
                  value={partOfSpeech}
                  onChange={(e) => setPartOfSpeech(e.target.value)}
                  className="w-full px-3 py-2.5 bg-nocturn-surface border border-nocturn-border rounded-xl text-white text-xs focus:outline-none focus:border-nocturn-accent cursor-pointer"
                >
                  <option value="noun">Noun</option>
                  <option value="verb">Verb</option>
                  <option value="adjective">Adjective</option>
                  <option value="adverb">Adverb</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-nocturn-muted uppercase tracking-wider block">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2.5 bg-nocturn-surface border border-nocturn-border rounded-xl text-white text-xs focus:outline-none focus:border-nocturn-accent cursor-pointer"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-nocturn-border/60">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-nocturn-border transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-nocturn-accent hover:bg-nocturn-accent-bright text-black text-xs font-bold transition-all shadow-[0_0_12px_rgba(var(--color-nocturn-accent-rgb),0.3)] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{mode === 'add' ? 'Add Word' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default function VocabWordModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  mode = 'add', // 'add' | 'edit'
}) {
  if (!isOpen) return null

  const formKey = initialData?.id || (mode === 'add' ? 'add' : 'edit')

  return (
    <VocabWordForm
      key={formKey}
      initialData={initialData}
      mode={mode}
      onSave={onSave}
      onClose={onClose}
    />
  )
}
