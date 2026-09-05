import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  getTodayDateKey,
  saveDailyVocabLog,
  saveLearnedWord,
  updateWordQuizResult,
  getReviewQueueWords,
  getWordStatus,
} from '../services/vocabService'
import { generateDailyVocab } from '../services/geminiVocabService'

export function useVocab() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState(null)

  const todayKey = getTodayDateKey()

  // 1. Live Query for All Learned Words
  const allWords = useLiveQuery(async () => {
    if (!db || !db.vocab) return []
    return await db.vocab.toArray()
  }, []) || []

  // 2. Live Query for Today's Daily Vocab Log
  const todayLog = useLiveQuery(async () => {
    if (!db || !db.dailyVocabLogs) return null
    return await db.dailyVocabLogs.get(todayKey)
  }, [todayKey])

  // 3. Derived Today's Progress
  const todayGeneratedWords = todayLog?.words || []

  // Learned words count from today's generated set
  const learnedTodayCount = allWords.filter((w) => w.date_added === todayKey).length
  const isDailyCompleted = Boolean(todayLog?.completed || (todayGeneratedWords.length === 5 && learnedTodayCount >= 5))

  // 4. Live Query for Review Queue Words
  const reviewQueue = useLiveQuery(async () => {
    if (!db || !db.vocab) return []
    return await getReviewQueueWords()
  }, [allWords]) || []

  // 5. Generate / Fetch Daily Words Action
  const fetchOrGenerateDailyWords = useCallback(async () => {
    if (isGenerating) return

    setGenerationError(null)

    // Check if today's log already exists
    const existingLog = await db.dailyVocabLogs.get(todayKey)

    if (existingLog && Array.isArray(existingLog.words) && existingLog.words.length === 5) {
      return existingLog.words
    }

    setIsGenerating(true)

    try {
      // Gather existing words to prevent duplicate recommendations from Gemini
      const existingList = await db.vocab.toArray()
      const existingWordNames = existingList.map((w) => w.word)

      const newWords = await generateDailyVocab(existingWordNames)

      const newLog = {
        date: todayKey,
        words: newWords,
        completed: false,
        created_at: new Date().toISOString(),
      }

      await saveDailyVocabLog(newLog)
      setIsGenerating(false)
      return newWords
    } catch (err) {
      console.error('[useVocab] Daily word generation failed:', err)
      const errorMsg = err.message || 'Failed to generate vocabulary words'
      setGenerationError(errorMsg)
      setIsGenerating(false)
      throw err
    }
  }, [todayKey, isGenerating])

  // 6. Mark Word Learned Action
  const markWordLearned = useCallback(
    async (wordItem) => {
      const saved = await saveLearnedWord({
        ...wordItem,
        date_added: todayKey,
        correct_count: 0,
        last_quizzed_date: null,
      })

      // Check if all 5 today words are now learned
      const currentLog = await db.dailyVocabLogs.get(todayKey)
      if (currentLog) {
        const updatedLearnedCount = (
          await db.vocab.where('date_added').equals(todayKey).toArray()
        ).length

        if (updatedLearnedCount >= 5) {
          await saveDailyVocabLog({
            ...currentLog,
            completed: true,
          })
        }
      }

      return saved
    },
    [todayKey]
  )

  // 7. Record Quiz Result Action
  const recordQuizResult = useCallback(async (wordId, isCorrect) => {
    return await updateWordQuizResult(wordId, isCorrect)
  }, [])

  return {
    allWords,
    todayLog,
    todayGeneratedWords,
    learnedTodayCount,
    isDailyCompleted,
    reviewQueue,
    reviewCount: reviewQueue.length,
    isGenerating,
    generationError,
    fetchOrGenerateDailyWords,
    markWordLearned,
    recordQuizResult,
    getWordStatus,
  }
}
