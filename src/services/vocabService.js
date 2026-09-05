/**
 * Vocabulary Persistence & Logic Service
 * Handles Dexie database operations for learned words, daily log tracking,
 * review queue selection, and quiz option generation.
 */

import { db } from '../db/db'

// Fallback curated GRE definitions for distractor options when vocabulary set is small
const CURATED_GRE_DISTRACTORS = [
  'To express sharp disapproval or criticism of someone because of their actions.',
  'Lacking interest, enthusiasm, or concern about something.',
  'Showing great care, attention, and perseverance in carrying out tasks.',
  'To make an unpleasant feeling or situation less severe or intense.',
  'Using or expressing more words than are needed; wordy or verbose.',
  'Characterized by severe self-discipline and abstention from indulgence.',
  'Lasting for a very short time; transient or fleeting.',
  'To confirm or give support to a statement, theory, or finding.',
  'Intended to teach, particularly in having moral instruction as an ulterior motive.',
  'Attempting to avoid notice or attention, typically because of guilt or fear.',
]

/**
 * Returns current date in YYYY-MM-DD local calendar format.
 */
export function getTodayDateKey() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Calculates number of days between two YYYY-MM-DD date strings.
 */
export function getDaysDifference(dateStrA, dateStrB) {
  if (!dateStrA || !dateStrB) return 0
  const dateA = new Date(dateStrA)
  const dateB = new Date(dateStrB)
  const diffTime = Math.abs(dateB - dateA)
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Gets today's daily log from IndexedDB.
 */
export async function getDailyVocabLog(dateKey = getTodayDateKey()) {
  try {
    return (await db.dailyVocabLogs.get(dateKey)) || null
  } catch (err) {
    console.error('Failed to get daily vocab log:', err)
    return null
  }
}

/**
 * Saves or updates today's daily log in IndexedDB.
 */
export async function saveDailyVocabLog(dailyLog) {
  try {
    await db.dailyVocabLogs.put(dailyLog)
  } catch (err) {
    console.error('Failed to save daily vocab log:', err)
  }
}

/**
 * Retrieves all learned words from Dexie.
 */
export async function getAllLearnedWords() {
  try {
    return await db.vocab.toArray()
  } catch (err) {
    console.error('Failed to fetch learned words:', err)
    return []
  }
}

/**
 * Adds or updates a single word record in Dexie.
 */
export async function saveLearnedWord(wordRecord) {
  try {
    const record = {
      id: wordRecord.id || `vocab-${Date.now()}-${wordRecord.word.toLowerCase()}`,
      word: wordRecord.word,
      definition: wordRecord.definition,
      example_sentence: wordRecord.example_sentence,
      part_of_speech: wordRecord.part_of_speech || 'noun',
      synonyms: wordRecord.synonyms || [],
      difficulty: wordRecord.difficulty || 'Hard',
      date_added: wordRecord.date_added || getTodayDateKey(),
      correct_count: Math.min(Math.max(wordRecord.correct_count ?? 0, 0), 5),
      last_quizzed_date: wordRecord.last_quizzed_date || null,
    }

    await db.vocab.put(record)
    return record
  } catch (err) {
    console.error('Failed to save learned word:', err)
    throw err
  }
}

/**
 * Updates a word's status after a quiz attempt.
 * - Correct: increment correct_count (max 5), set last_quizzed_date to today.
 * - Wrong: correct_count unchanged, set last_quizzed_date to today.
 */
export async function updateWordQuizResult(wordId, isCorrect) {
  try {
    const existing = await db.vocab.get(wordId)
    if (!existing) return null

    const today = getTodayDateKey()
    const newCount = isCorrect
      ? Math.min(existing.correct_count + 1, 5)
      : existing.correct_count

    const updated = {
      ...existing,
      correct_count: newCount,
      last_quizzed_date: today,
    }

    await db.vocab.put(updated)
    return updated
  } catch (err) {
    console.error('Failed to update word quiz result:', err)
    return null
  }
}

/**
 * Selects review queue pool based on criteria:
 * - correct_count < 5
 * OR
 * - correct_count === 5 AND last_quizzed_date is at least 14 days ago.
 *
 * Randomly selects UP TO 10 words.
 */
export async function getReviewQueueWords() {
  try {
    const allWords = await db.vocab.toArray()
    const today = getTodayDateKey()

    const eligible = allWords.filter((w) => {
      if (w.correct_count < 5) return true
      if (w.correct_count === 5) {
        if (!w.last_quizzed_date) return true
        const daysSince = getDaysDifference(w.last_quizzed_date, today)
        return daysSince >= 14
      }
      return false
    })

    // Random shuffle (Fisher-Yates)
    const shuffled = [...eligible]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Limit to max 10
    return shuffled.slice(0, 10)
  } catch (err) {
    console.error('Failed to get review queue words:', err)
    return []
  }
}

/**
 * Returns word status categorization string:
 * - 'learning': correct_count < 5
 * - 'settled': correct_count === 5 AND last_quizzed_date < 14 days ago
 * - 'due_for_refresh': correct_count === 5 AND last_quizzed_date >= 14 days ago
 */
export function getWordStatus(word) {
  if (!word) return 'learning'
  if (word.correct_count < 5) return 'learning'

  if (word.correct_count === 5) {
    if (!word.last_quizzed_date) return 'due_for_refresh'
    const daysSince = getDaysDifference(word.last_quizzed_date, getTodayDateKey())
    return daysSince >= 14 ? 'due_for_refresh' : 'settled'
  }

  return 'learning'
}

/**
 * Generates 4 multiple choice options for a review question:
 * - 1 correct definition
 * - 3 plausible distractor definitions
 */
export function generateQuizOptions(targetWord, allWordsPool = []) {
  const correctDef = targetWord.definition

  // Collect potential distractors from other learned words
  const otherDefs = allWordsPool
    .filter((w) => w.id !== targetWord.id && w.definition !== correctDef)
    .map((w) => w.definition)

  // Deduplicate
  const uniqueOtherDefs = Array.from(new Set(otherDefs))

  // If not enough from learned words, append from curated fallbacks
  const availableDistractors = [...uniqueOtherDefs]
  for (const fallback of CURATED_GRE_DISTRACTORS) {
    if (availableDistractors.length >= 3) break
    if (fallback !== correctDef && !availableDistractors.includes(fallback)) {
      availableDistractors.push(fallback)
    }
  }

  // Pick 3 random distractors
  const shuffledDistractors = [...availableDistractors]
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)

  // Assemble choices
  const rawChoices = [
    { text: correctDef, isCorrect: true },
    ...shuffledDistractors.map((def) => ({ text: def, isCorrect: false })),
  ]

  // Shuffle the 4 choices
  return rawChoices.sort(() => 0.5 - Math.random())
}
