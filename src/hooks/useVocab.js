import { useState, useCallback, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useAuth } from '../context/useAuth'
import {
  getTodayDateKey,
  saveDailyVocabLog,
  saveLearnedWord,
  deleteLearnedWord,
  deleteAllVocabWords,
  updateWordQuizResult,
  getReviewQueueWords,
  getWordStatus,
} from '../services/vocabService'
import { generateDailyVocab } from '../services/geminiVocabService'

export function useVocab() {
  const { user } = useAuth()
  const userId = user?.id || null
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState(null)

  const todayKey = getTodayDateKey()
  const sessionLearnKey = `nocturn_vocab_learn_idx_${userId || 'guest'}_${todayKey}`
  const sessionCompleteKey = `nocturn_vocab_learn_completed_${userId || 'guest'}_${todayKey}`
  const sessionCompletedIdsKey = `nocturn_vocab_learn_ids_${userId || 'guest'}_${todayKey}`

  // 0. Live Query for User Settings (Daily Vocab Limit)
  const userSettings = useLiveQuery(async () => {
    if (!db || !db.userSettings) return null
    return await db.userSettings.get('preferences')
  }, [])
  const dailyLimit = Number(userSettings?.dailyVocabLimit) || 5

  // 1. Live Query for All Learned Words for current user
  const rawAllWords = useLiveQuery(async () => {
    if (!db || !db.vocab) return []
    return await db.vocab.toArray()
  }, [])

  const allWords = useMemo(() => {
    const list = rawAllWords || []
    if (!userId) return list
    return list.filter((w) => !w.userId || w.userId === userId)
  }, [rawAllWords, userId])

  // 2. Live Query for Today's Vocab Log
  const todayVocabLog = useLiveQuery(async () => {
    if (!db || !db.dailyVocabLogs) return null
    return await db.dailyVocabLogs.get(todayKey)
  }, [todayKey])

  // 3. Selection of words for today's daily learning set
  // Stable and deterministic: honors today's log if present, else selects deterministically
  const dailyWords = useMemo(() => {
    if (allWords.length === 0) return []

    // If a daily set was already recorded for today in dailyVocabLogs, honor those exact words
    if (todayVocabLog?.wordIds?.length > 0) {
      const wordsMap = new Map(allWords.map((w) => [w.id, w]))
      const matched = []
      for (const id of todayVocabLog.wordIds) {
        if (wordsMap.has(id)) {
          matched.push(wordsMap.get(id))
        }
      }
      if (matched.length > 0) {
        return matched
      }
    }

    const wordsAddedToday = allWords.filter((w) => w.date_added === todayKey)
    const unlearned = allWords
      .filter((w) => (w.correct_count || 0) < 5 && w.date_added !== todayKey)
      .sort((a, b) => {
        if ((a.correct_count || 0) !== (b.correct_count || 0)) {
          return (a.correct_count || 0) - (b.correct_count || 0)
        }
        return (a.word || '').localeCompare(b.word || '')
      })

    const needed = Math.max(0, dailyLimit - wordsAddedToday.length)
    const selected = [...wordsAddedToday, ...unlearned.slice(0, needed)]

    return selected.sort((a, b) => {
      const aToday = a.date_added === todayKey ? 1 : 0
      const bToday = b.date_added === todayKey ? 1 : 0
      if (aToday !== bToday) return bToday - aToday
      if ((a.correct_count || 0) !== (b.correct_count || 0)) {
        return (a.correct_count || 0) - (b.correct_count || 0)
      }
      return (a.word || '').localeCompare(b.word || '')
    })
  }, [allWords, todayVocabLog, dailyLimit, todayKey])

  // Session Resumption Metrics
  const isDailyCompleted = useMemo(() => {
    if (allWords.length === 0 || dailyWords.length === 0) return false
    if (todayVocabLog?.completed === true) return true
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem(sessionCompleteKey) === 'true') {
        return true
      }
    } catch {
      // ignore
    }
    return false
  }, [allWords.length, dailyWords.length, todayVocabLog, sessionCompleteKey])

  const currentLearningIndex = useMemo(() => {
    if (dailyWords.length === 0) return 0
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(sessionLearnKey) : null
      if (saved !== null && !isNaN(parseInt(saved, 10))) {
        return Math.max(0, Math.min(parseInt(saved, 10), dailyWords.length - 1))
      }
    } catch {
      // ignore
    }
    if (typeof todayVocabLog?.currentIndex === 'number') {
      return Math.max(0, Math.min(todayVocabLog.currentIndex, dailyWords.length - 1))
    }
    return 0
  }, [dailyWords.length, sessionLearnKey, todayVocabLog])

  const learnedTodayCount = useMemo(() => {
    if (allWords.length === 0 || dailyWords.length === 0) return 0
    if (isDailyCompleted) return dailyWords.length

    let completedSet = new Set()
    if (Array.isArray(todayVocabLog?.completedWordIds)) {
      todayVocabLog.completedWordIds.forEach((id) => completedSet.add(id))
    }
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(sessionCompletedIdsKey) : null
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => completedSet.add(id))
        }
      }
    } catch {
      // ignore
    }

    const count = dailyWords.filter((w) => completedSet.has(w.id)).length
    return Math.max(count, Math.min(currentLearningIndex, dailyWords.length))
  }, [allWords.length, dailyWords, isDailyCompleted, todayVocabLog, sessionCompletedIdsKey, currentLearningIndex])

  const totalUserWords = allWords.length
  const effectiveDailyTarget = totalUserWords > 0 ? Math.min(dailyLimit, Math.max(dailyWords.length, 1)) : dailyLimit

  // 4. Live Query for Review Queue Words (scoped to user, deterministic, excludes today-quizzed)
  const reviewQueue = useLiveQuery(async () => {
    if (!db || !db.vocab) return []
    return await getReviewQueueWords(userId, dailyLimit)
  }, [userId, dailyLimit]) || []

  // 5. Generate Words Action via Gemini AI
  const fetchOrGenerateDailyWords = useCallback(async () => {
    if (isGenerating) return []

    setGenerationError(null)
    setIsGenerating(true)

    try {
      const existingWordNames = allWords.map((w) => w.word)
      const newWords = await generateDailyVocab(existingWordNames, dailyLimit)

      const savedList = []
      for (const item of newWords) {
        const saved = await saveLearnedWord({
          ...item,
          userId: userId,
          date_added: todayKey,
          correct_count: 0,
          last_quizzed_date: null,
        })
        savedList.push(saved)
      }

      await saveDailyVocabLog({
        date: todayKey,
        userId: userId,
        wordIds: savedList.map((w) => w.id),
        words: savedList,
        completed: false,
        currentIndex: 0,
        completedWordIds: [],
        created_at: new Date().toISOString(),
      })

      try {
        localStorage.setItem(sessionLearnKey, '0')
        localStorage.setItem(sessionCompleteKey, 'false')
        localStorage.setItem(sessionCompletedIdsKey, '[]')
      } catch {
        // ignore
      }

      setIsGenerating(false)
      return savedList
    } catch (err) {
      console.error('[useVocab] Daily word generation failed:', err)
      const errorMsg = err.message || 'Failed to generate vocabulary words'
      setGenerationError(errorMsg)
      setIsGenerating(false)
      throw err
    }
  }, [todayKey, isGenerating, dailyLimit, allWords, userId, sessionLearnKey, sessionCompleteKey, sessionCompletedIdsKey])

  // 6. Mark Word Learned Action
  const markWordLearned = useCallback(
    async (wordItem) => {
      const saved = await saveLearnedWord({
        ...wordItem,
        userId: userId || wordItem.userId || null,
        date_added: todayKey,
      })
      return saved
    },
    [todayKey, userId]
  )

  // 7. Record Quiz Result Action
  const recordQuizResult = useCallback(async (wordId, isCorrect) => {
    return await updateWordQuizResult(wordId, isCorrect)
  }, [])

  // 8. CRUD Actions
  const addWord = useCallback(
    async (wordData) => {
      return await saveLearnedWord({
        ...wordData,
        userId: userId,
        date_added: todayKey,
        correct_count: 0,
        last_quizzed_date: null,
      })
    },
    [todayKey, userId]
  )

  const editWord = useCallback(
    async (wordId, updates) => {
      const existing = await db.vocab.get(wordId)
      if (!existing) return null
      return await saveLearnedWord({
        ...existing,
        ...updates,
        id: wordId,
        userId: userId || existing.userId || null,
      })
    },
    [userId]
  )

  const deleteWord = useCallback(async (wordId) => {
    return await deleteLearnedWord(wordId)
  }, [])

  const deleteAllWords = useCallback(async () => {
    return await deleteAllVocabWords(userId)
  }, [userId])

  return {
    allWords,
    dailyWords,
    todayGeneratedWords: dailyWords, // backward compatible
    learnedTodayCount,
    effectiveDailyTarget,
    isDailyCompleted,
    currentLearningIndex,
    todayVocabLog,
    sessionLearnKey,
    sessionCompleteKey,
    sessionCompletedIdsKey,
    dailyLimit,
    reviewQueue,
    reviewCount: reviewQueue.length,
    isGenerating,
    generationError,
    fetchOrGenerateDailyWords,
    markWordLearned,
    recordQuizResult,
    getWordStatus,
    addWord,
    editWord,
    deleteWord,
    deleteAllWords,
  }
}

