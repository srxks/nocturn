import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, BookOpen, Plus, Check } from 'lucide-react'
import { db } from '../../db/db'

function VocabWordForm({ initialData, mode, onSave, onClose }) {
  const [word, setWord] = useState(() => (mode === 'edit' && initialData?.word) || '')
  const [definition, setDefinition] = useState(() => (mode === 'edit' && initialData?.definition) || '')
  const [exampleSentence, setExampleSentence] = useState(() => (mode === 'edit' && initialData?.example_sentence) || '')
  const [partOfSpeech, setPartOfSpeech] = useState(() => (mode === 'edit' && initialData?.part_of_speech) || 'noun')
  const [difficulty, setDifficulty] = useState(() => (mode === 'edit' && initialData?.difficulty) || 'Medium')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const wordInputRef = useRef(null)

  useEffect(() => {
    wordInputRef.current?.focus()
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, isSaving])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSaving) return

    const cleanWord = word.trim().replace(/\s+/g, ' ')
    const cleanDef = definition.trim()
    const cleanExample = exampleSentence.trim()

    if (!cleanWord) {
      setError('Word cannot be empty.')
      wordInputRef.current?.focus()
      return
    }
    if (!cleanDef) {
      setError('Definition cannot be empty.')
      return
    }

    try {
      setIsSaving(true)
      setError('')

      // In add mode, check if word already exists in library (case-insensitive)
      if (mode === 'add' && db?.vocab) {
        const lower = cleanWord.toLowerCase()
        const existing = await db.vocab
          .filter((w) => w.word?.trim().toLowerCase() === lower)
          .first()
        if (existing) {
          setError(`"${cleanWord}" already exists in your vocabulary library.`)
          setIsSaving(false)
          return
        }
      }

      await onSave({
        word: cleanWord,
        definition: cleanDef,
        example_sentence: cleanExample,
        part_of_speech: partOfSpeech || 'noun',
        difficulty: difficulty || 'Medium',
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save vocabulary word.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!isSaving ? onClose : undefined}
        className="absolute inset-0 cursor-pointer"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="relative w-full max-w-md bg-[#0d0f17] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              {mode === 'add' ? <Plus className="w-5 h-5 stroke-[2.5]" /> : <BookOpen className="w-5 h-5" />}
            </div>
            <h2 className="text-xl font-bold text-white">
              {mode === 'add' ? 'Add Vocabulary Word' : 'Edit Vocabulary Word'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
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
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
              Word *
            </label>
            <input
              ref={wordInputRef}
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="e.g. Aberration"
              disabled={mode === 'edit' || isSaving}
              className="w-full px-3.5 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 text-sm disabled:opacity-60"
            />
          </div>

          {/* Definition Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
              Definition *
            </label>
            <textarea
              rows={2}
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="Clear and concise definition..."
              disabled={isSaving}
              className="w-full px-3.5 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 text-sm resize-none disabled:opacity-60"
            />
          </div>

          {/* Example Sentence Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
              Example Sentence (Optional)
            </label>
            <textarea
              rows={2}
              value={exampleSentence}
              onChange={(e) => setExampleSentence(e.target.value)}
              placeholder="Usage in a sentence..."
              disabled={isSaving}
              className="w-full px-3.5 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 text-sm resize-none disabled:opacity-60"
            />
          </div>

          {/* Part of Speech & Difficulty Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                Part of Speech
              </label>
              <select
                value={partOfSpeech}
                onChange={(e) => setPartOfSpeech(e.target.value)}
                disabled={isSaving}
                className="w-full px-3 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-60"
              >
                <option value="noun">Noun</option>
                <option value="verb">Verb</option>
                <option value="adjective">Adjective</option>
                <option value="adverb">Adverb</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                disabled={isSaving}
                className="w-full px-3 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-60"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isSaving ? 'Saving...' : mode === 'add' ? 'Add Word' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function VocabWordModal({
  isOpen,
  onClose,
  onSave,
  onSubmit,
  initialData = null,
  mode = 'add', // 'add' | 'edit'
}) {
  if (isOpen !== undefined && !isOpen) return null

  const formKey = initialData?.id || (mode === 'add' ? 'add' : 'edit')
  const saveHandler = onSave || onSubmit

  return (
    <VocabWordForm
      key={formKey}
      initialData={initialData}
      mode={mode}
      onSave={saveHandler}
      onClose={onClose}
    />
  )
}
