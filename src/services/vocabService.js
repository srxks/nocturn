import { db } from '../db/db.js'
import { supabase, isSupabaseConfigured, isGuestUserId } from '../lib/supabaseClient.js'
import {
  upsertVocabWordsRemote,
  deleteVocabWordRemote,
  deleteAllVocabWordsRemote,
  mapVocabWordToRow,
} from '../lib/vocab.js'
import { isRealtimeWrite } from './realtimeService.js'
import { enqueueMutation, purgePendingVocabMutations } from './syncQueue.js'
import { recordTombstone } from './conflictService.js'
import { toUuid } from '../lib/idUtils.js'
import { GRE_VOCAB_DATASET } from '../data/greVocabDataset.js'
import { upsertUserSettings } from '../lib/themes.js'

/**
 * Synchronous, offline-first helper to retrieve the active user ID without
 * triggering remote network roundtrips or QUIC connection failures.
 */
export function getActiveUserId(passedUserId = null) {
  if (passedUserId && !isGuestUserId(passedUserId)) return passedUserId
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('nocturn_auth_user') : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.id && !isGuestUserId(parsed.id)) return parsed.id
    }
  } catch {
    // Ignore localStorage parse errors
  }
  return null
}

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

export function getTodayDateKey() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDaysDifference(dateStrA, dateStrB) {
  if (!dateStrA || !dateStrB) return 0
  const partsA = String(dateStrA).split('T')[0].split('-').map(Number)
  const partsB = String(dateStrB).split('T')[0].split('-').map(Number)
  if (partsA.length < 3 || partsB.length < 3) return 0
  const utcA = Date.UTC(partsA[0], partsA[1] - 1, partsA[2])
  const utcB = Date.UTC(partsB[0], partsB[1] - 1, partsB[2])
  return Math.floor(Math.abs(utcB - utcA) / (1000 * 60 * 60 * 24))
}

export async function getDailyVocabLog(dateKey = getTodayDateKey()) {
  try {
    if (!db || !db.dailyVocabLogs) return null
    return (await db.dailyVocabLogs.get(dateKey)) || null
  } catch (err) {
    console.error('Failed to get daily vocab log:', err)
    return null
  }
}

export async function saveDailyVocabLog(dailyLog) {
  try {
    if (!db || !db.dailyVocabLogs) return
    await db.dailyVocabLogs.put(dailyLog)
  } catch (err) {
    console.error('Failed to save daily vocab log:', err)
  }
}

export async function getAllLearnedWords(userId = null) {
  try {
    if (!db || !db.vocab) return []
    const sessionUserId = getActiveUserId(userId)
    const all = await db.vocab.toArray()
    if (sessionUserId) {
      return all.filter((w) => !w.userId || w.userId === sessionUserId)
    }
    return all
  } catch (err) {
    console.error('Failed to fetch learned words from Dexie:', err)
    return []
  }
}

export async function saveLearnedWord(wordRecord) {
  try {
    const sessionUserId = getActiveUserId(wordRecord.userId)
    const normalizedWord = (wordRecord.word || '').trim().toLowerCase()
    const allLocal = await db.vocab.toArray()
    const existing = allLocal.find((w) => w.word?.trim().toLowerCase() === normalizedWord)

    const recordId =
      wordRecord.id ||
      existing?.id ||
      (sessionUserId ? toUuid(`vocab-${sessionUserId}-${normalizedWord}`) : crypto.randomUUID())

    const nowIso = new Date().toISOString()
    const record = {
      id: recordId,
      userId: sessionUserId,
      word: wordRecord.word.trim(),
      definition: wordRecord.definition,
      example_sentence: wordRecord.example_sentence || '',
      part_of_speech: wordRecord.part_of_speech || 'noun',
      synonyms: wordRecord.synonyms || [],
      difficulty: wordRecord.difficulty || 'Medium',
      date_added: wordRecord.date_added || getTodayDateKey(),
      correct_count: Math.min(Math.max(wordRecord.correct_count ?? existing?.correct_count ?? 0, 0), 5),
      last_quizzed_date: wordRecord.last_quizzed_date || existing?.last_quizzed_date || null,
      updatedAt: nowIso,
    }

    // 1. Local Dexie write ALWAYS happens first!
    await db.vocab.put(record)

    // 2. Non-blocking remote sync with offline queue fallback
    if (sessionUserId && !isRealtimeWrite() && isSupabaseConfigured && supabase) {
      upsertVocabWordsRemote([record], sessionUserId)
        .then((res) => {
          if (!res || res.length === 0) {
            enqueueMutation('upsert', 'vocab_words', mapVocabWordToRow(record, sessionUserId))
          }
        })
        .catch(() => {
          enqueueMutation('upsert', 'vocab_words', mapVocabWordToRow(record, sessionUserId))
        })
    }

    return record
  } catch (err) {
    console.error('Failed to save learned word:', err)
    throw err
  }
}

export async function deleteLearnedWord(wordId) {
  try {
    const existing = await db.vocab.get(wordId)
    const sessionUserId = existing?.userId || getActiveUserId()

    if (sessionUserId) {
      await recordTombstone('vocab_words', wordId, sessionUserId)
      if (existing?.word) {
        await recordTombstone('vocab_words', existing.word.trim().toLowerCase(), sessionUserId)
      }
    }

    await db.vocab.delete(wordId)

    if (sessionUserId && !isRealtimeWrite() && isSupabaseConfigured && supabase) {
      deleteVocabWordRemote(wordId, sessionUserId)
        .then((ok) => {
          if (!ok) {
            enqueueMutation('delete', 'vocab_words', { id: wordId, user_id: sessionUserId })
          }
        })
        .catch(() => {
          enqueueMutation('delete', 'vocab_words', { id: wordId, user_id: sessionUserId })
        })
    }

    return true
  } catch (err) {
    console.error('Failed to delete learned word:', err)
    return false
  }
}

export async function deleteAllVocabWords(userId = null) {
  try {
    const sessionUserId = getActiveUserId(userId)
    const allLocal = await db.vocab.toArray()
    const userWords = sessionUserId
      ? allLocal.filter((w) => !w.userId || w.userId === sessionUserId)
      : allLocal

    const wordIds = userWords.map((w) => w.id)

    // 1. Record tombstones for all deleted words so they cannot be resurrected
    if (sessionUserId) {
      for (const w of userWords) {
        await recordTombstone('vocab_words', w.id, sessionUserId)
        if (w.word) {
          await recordTombstone('vocab_words', w.word.trim().toLowerCase(), sessionUserId)
        }
      }
      await recordTombstone('vocab_words', `all-${sessionUserId}`, sessionUserId)
    }

    // 2. Purge pending offline sync queue upserts for this user's vocab
    purgePendingVocabMutations(sessionUserId)

    // 3. Wipe local Dexie records immediately
    if (wordIds.length > 0) {
      await db.vocab.bulkDelete(wordIds)
    }
    if (db.dailyVocabLogs) {
      await db.dailyVocabLogs.clear()
    }

    // 4. Remote deletion in background
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    if (sessionUserId && isOnline && !isRealtimeWrite() && isSupabaseConfigured && supabase) {
      deleteAllVocabWordsRemote(sessionUserId)
        .then((ok) => {
          if (!ok) {
            enqueueMutation('delete_all_user_vocab', 'vocab_words', { user_id: sessionUserId })
          }
        })
        .catch(() => {
          enqueueMutation('delete_all_user_vocab', 'vocab_words', { user_id: sessionUserId })
        })
    } else if (sessionUserId && !isRealtimeWrite()) {
      enqueueMutation('delete_all_user_vocab', 'vocab_words', { user_id: sessionUserId })
    }

    // 5. Notify UI derivation listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nocturn:vocab-cleared', { detail: { userId: sessionUserId } }))
    }

    return true
  } catch (err) {
    console.error('Failed to delete all vocab words:', err)
    return false
  }
}

export async function updateWordQuizResult(wordId, isCorrect, passedUserId = null) {
  try {
    const existing = await db.vocab.get(wordId)
    if (!existing) return null

    const sessionUserId = existing.userId || getActiveUserId(passedUserId)
    const today = getTodayDateKey()
    const newCount = isCorrect
      ? Math.min((existing.correct_count || 0) + 1, 5)
      : (existing.correct_count || 0)

    const updated = {
      ...existing,
      correct_count: newCount,
      last_quizzed_date: today,
      updatedAt: new Date().toISOString(),
    }

    // 1. Local Dexie write ALWAYS happens first!
    await db.vocab.put(updated)

    // 2. Non-blocking remote sync with offline queue fallback
    if (sessionUserId && !isRealtimeWrite() && isSupabaseConfigured && supabase) {
      upsertVocabWordsRemote([updated], sessionUserId)
        .then((res) => {
          if (!res || res.length === 0) {
            enqueueMutation('upsert', 'vocab_words', mapVocabWordToRow(updated, sessionUserId))
          }
        })
        .catch(() => {
          enqueueMutation('upsert', 'vocab_words', mapVocabWordToRow(updated, sessionUserId))
        })
    }

    return updated
  } catch (err) {
    console.error('Failed to update word quiz result:', err)
    return null
  }
}

function createSeededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

function shuffleArray(arr, rng) {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}

export async function completeDailyReview(userId = null) {
  try {
    const today = getTodayDateKey()
    const sessionUserId = getActiveUserId(userId)
    const existing = db.dailyVocabLogs ? await db.dailyVocabLogs.get(today) : null

    const updated = {
      ...(existing || { date: today, wordIds: [] }),
      userId: sessionUserId,
      reviewCompleted: true,
      reviewedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (db.dailyVocabLogs) {
      await db.dailyVocabLogs.put(updated)
    }

    const completedFlagKey = `nocturn_review_completed_${sessionUserId || 'guest'}_${today}`
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(completedFlagKey, 'true')
      localStorage.setItem(`nocturn_review_completed_guest_${today}`, 'true')
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(completedFlagKey, 'true')
      sessionStorage.setItem(`nocturn_review_completed_guest_${today}`, 'true')
    }

    return true
  } catch (err) {
    console.error('Failed to mark daily review completed:', err)
    return false
  }
}

export async function getReviewQueueWords(userId = null, limit = 10) {
  try {
    const today = getTodayDateKey()
    const sessionUserId = getActiveUserId(userId)

    // 0. Check if user has explicitly completed their review session for today in Dexie or storage
    if (db && db.dailyVocabLogs) {
      const todayLog = await db.dailyVocabLogs.get(today)
      if (todayLog?.reviewCompleted === true) {
        return []
      }
    }

    const completedFlagKey = `nocturn_review_completed_${sessionUserId || 'guest'}_${today}`
    if (
      typeof localStorage !== 'undefined' &&
      (localStorage.getItem(completedFlagKey) === 'true' ||
        localStorage.getItem(`nocturn_review_completed_guest_${today}`) === 'true')
    ) {
      return []
    }

    const allWords = await getAllLearnedWords(userId)
    const maxLimit = Math.min(10, Math.max(1, Number(limit) || 10))

    // 1. Filter:
    // - Exclude words learned today (w.date_added === today)
    // - Include words from all previous days (w.date_added !== today)
    // - Exclude words already reviewed/quizzed today (w.last_quizzed_date >= today)
    const eligible = allWords.filter((w) => {
      if (!w || !w.word) return false
      if (w.date_added === today) return false
      if (w.last_quizzed_date && w.last_quizzed_date >= today) return false
      return true
    })

    // Deduplicate by normalized word name
    const seen = new Set()
    const deduped = []
    for (const w of eligible) {
      const norm = (w.word || '').trim().toLowerCase()
      if (!norm || seen.has(norm)) continue
      seen.add(norm)
      deduped.push(w)
    }

    if (deduped.length === 0) return []

    // 2. Group into priority tiers by review age:
    // Oldest reviewed word has highest priority!
    // Words never reviewed (null / undefined / empty last_quizzed_date) are the oldest / highest priority of all.
    // Words with older last_quizzed_date come next.
    const buckets = new Map()
    for (const w of deduped) {
      const key = w.last_quizzed_date ? String(w.last_quizzed_date).slice(0, 10) : '0000-00-00'
      if (!buckets.has(key)) {
        buckets.set(key, [])
      }
      buckets.get(key).push(w)
    }

    // Sort bucket keys ascending: '0000-00-00' first (never reviewed), then oldest date to newest date
    const sortedBucketKeys = Array.from(buckets.keys()).sort()

    // 3. Randomly select up to maximum 10 words using daily seed:
    const seedStr = `${today}-${userId || 'guest'}`
    const seededRandom = createSeededRandom(seedStr)

    const selected = []
    for (const key of sortedBucketKeys) {
      if (selected.length >= maxLimit) break

      const bucketWords = buckets.get(key)
      const shuffledBucket = shuffleArray(bucketWords, seededRandom)

      const needed = maxLimit - selected.length
      selected.push(...shuffledBucket.slice(0, needed))
    }

    // 4. Sort selected words: strictly from oldest reviewed word (high priority) to newest one
    selected.sort((a, b) => {
      const aQuizzed = Boolean(a.last_quizzed_date)
      const bQuizzed = Boolean(b.last_quizzed_date)
      // Never reviewed (null) comes first
      if (!aQuizzed && bQuizzed) return -1
      if (aQuizzed && !bQuizzed) return 1

      // Oldest review date first
      if (a.last_quizzed_date && b.last_quizzed_date) {
        if (a.last_quizzed_date !== b.last_quizzed_date) {
          return a.last_quizzed_date.localeCompare(b.last_quizzed_date)
        }
      }

      // Tie-breaker: word name
      return (a.word || '').localeCompare(b.word || '')
    })

    return selected.slice(0, maxLimit)
  } catch (err) {
    console.error('Failed to get review queue words:', err)
    return []
  }
}

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

export function generateQuizOptions(targetWord, allWordsPool = []) {
  const correctDef = targetWord.definition

  const otherDefs = allWordsPool
    .filter((w) => w.id !== targetWord.id && w.definition !== correctDef)
    .map((w) => w.definition)

  const uniqueOtherDefs = Array.from(new Set(otherDefs))

  const availableDistractors = [...uniqueOtherDefs]
  for (const fallback of CURATED_GRE_DISTRACTORS) {
    if (availableDistractors.length >= 3) break
    if (fallback !== correctDef && !availableDistractors.includes(fallback)) {
      availableDistractors.push(fallback)
    }
  }

  const shuffledDistractors = [...availableDistractors]
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)

  const rawChoices = [
    { text: correctDef, isCorrect: true },
    ...shuffledDistractors.map((def) => ({ text: def, isCorrect: false })),
  ]

  return rawChoices.sort(() => 0.5 - Math.random())
}

export const DEFAULT_VOCAB_SESSION_CONFIG = {
  easy: 1,
  medium: 3,
  hard: 1,
}

export function normalizeVocabSessionConfig(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_VOCAB_SESSION_CONFIG }
  return {
    easy: Math.max(0, parseInt(raw.easy, 10) || 0),
    medium: Math.max(0, parseInt(raw.medium, 10) || 0),
    hard: Math.max(0, parseInt(raw.hard, 10) || 0),
  }
}

/**
 * Retrieves eligible NEW vocabulary words according to the user's saved configuration.
 *
 * Rules:
 * 1. Read the user's saved configuration counts for Easy, Medium, Hard.
 * 2. Exclude words already learned by this user.
 * 3. Exclude words currently in the review queue.
 * 4. Exclude MASTERED words.
 * 5. Exclude words already selected in this session.
 * 6. Randomly sample the requested number from each difficulty pool WITHOUT replacement.
 *    - DO NOT use alphabetical database order.
 *    - DO NOT take the first N rows.
 * 7. Shuffle the combined final session into a random presentation order.
 * 8. Returns the randomized array of words.
 *    - Does NOT mark words as learned.
 *    - Does NOT modify vocabulary mastery.
 *    - Does NOT create review records.
 */
export async function getWordsByDifficultyDistribution({
  easy = 0,
  medium = 0,
  hard = 0,
  userId = null,
} = {}) {
  const sessionUserId = getActiveUserId(userId)
  const today = getTodayDateKey()
  const allLearned = await getAllLearnedWords(sessionUserId)

  // 1. Build exclusion set: normalized words already learned, being reviewed, or mastered
  const excludedWordsSet = new Set()
  for (const w of allLearned) {
    if (!w || !w.word) continue
    const norm = w.word.trim().toLowerCase()
    excludedWordsSet.add(norm)
  }

  const requestedTiers = [
    { difficulty: 'Easy', count: Math.max(0, parseInt(easy, 10) || 0) },
    { difficulty: 'Medium', count: Math.max(0, parseInt(medium, 10) || 0) },
    { difficulty: 'Hard', count: Math.max(0, parseInt(hard, 10) || 0) },
  ]

  const selectedWordsSet = new Set()
  const combinedSelected = []

  for (const req of requestedTiers) {
    if (req.count <= 0) continue

    // Query eligible unlearned words from GRE_VOCAB_DATASET
    const eligiblePool = GRE_VOCAB_DATASET.filter((item) => {
      if ((item.difficulty || '').toLowerCase() !== req.difficulty.toLowerCase()) return false
      const norm = (item.word || '').trim().toLowerCase()
      if (!norm) return false
      if (excludedWordsSet.has(norm)) return false
      if (selectedWordsSet.has(norm)) return false
      return true
    })

    // Randomly sample req.count items without replacement (Fisher-Yates shuffle, NOT alphabetical, NOT first N)
    const shuffledPool = [...eligiblePool]
    for (let i = shuffledPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = shuffledPool[i]
      shuffledPool[i] = shuffledPool[j]
      shuffledPool[j] = temp
    }

    const sampled = shuffledPool.slice(0, req.count)
    for (const w of sampled) {
      selectedWordsSet.add((w.word || '').trim().toLowerCase())
      combinedSelected.push({
        id: toUuid(`vocab-${sessionUserId || 'guest'}-${w.word.trim().toLowerCase()}`),
        userId: sessionUserId,
        word: w.word.trim(),
        definition: w.definition,
        example_sentence: w.example_sentence || '',
        part_of_speech: w.part_of_speech || 'noun',
        difficulty: req.difficulty,
        synonyms: w.synonyms || [],
        correct_count: 0,
        date_added: today,
      })
    }
  }

  // Shuffle the combined final session into a random presentation order!
  for (let i = combinedSelected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = combinedSelected[i]
    combinedSelected[i] = combinedSelected[j]
    combinedSelected[j] = temp
  }

  return combinedSelected
}

/**
 * Generates and initializes today's active study session according to the user's
 * saved configuration. Shuffles the presentation order and persists to dailyVocabLogs.
 */
export async function generateAndSaveTodayLearningSession(userId = null, config = null) {
  const sessionUserId = getActiveUserId(userId)
  const today = getTodayDateKey()
  const cfg = config || (await getVocabSessionConfig(sessionUserId))
  const cleanConfig = normalizeVocabSessionConfig(cfg)

  const sessionWords = await getWordsByDifficultyDistribution({
    easy: cleanConfig.easy,
    medium: cleanConfig.medium,
    hard: cleanConfig.hard,
    userId: sessionUserId,
  })

  // Save session to dailyVocabLogs
  if (db && db.dailyVocabLogs) {
    await db.dailyVocabLogs.put({
      date: today,
      userId: sessionUserId,
      config: cleanConfig,
      words: sessionWords,
      wordIds: sessionWords.map((w) => w.id),
      currentIndex: 0,
      completedWordIds: [],
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  // Reset session progress indicators for today
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(`nocturn_vocab_learn_completed_${sessionUserId || 'guest'}_${today}`)
    localStorage.removeItem(`nocturn_vocab_learn_completed_guest_${today}`)
    localStorage.setItem(`nocturn_vocab_learn_idx_${sessionUserId || 'guest'}_${today}`, '0')
    localStorage.setItem(`nocturn_vocab_learn_ids_${sessionUserId || 'guest'}_${today}`, JSON.stringify([]))
  }

  return sessionWords
}

export async function getVocabSessionConfig(userId = null) {
  const sessionUserId = getActiveUserId(userId)
  const storageKey = sessionUserId
    ? `nocturn_vocab_session_config_${sessionUserId}`
    : 'nocturn_vocab_session_config'

  // 1. Try local storage first for instant synchronous feedback
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(storageKey) || localStorage.getItem('nocturn_vocab_session_config')
      if (saved) {
        return normalizeVocabSessionConfig(JSON.parse(saved))
      }
    }
  } catch {
    // ignore
  }

  // 2. Try Dexie userSettings
  try {
    if (db && db.userSettings) {
      const prefs = await db.userSettings.get('preferences')
      if (prefs?.vocabSessionConfig) {
        return normalizeVocabSessionConfig(prefs.vocabSessionConfig)
      }
    }
  } catch {
    // ignore
  }

  return { ...DEFAULT_VOCAB_SESSION_CONFIG }
}

export async function saveVocabSessionConfig(userId = null, config = {}) {
  const sessionUserId = getActiveUserId(userId)
  const cleanConfig = normalizeVocabSessionConfig(config)
  const storageKey = sessionUserId
    ? `nocturn_vocab_session_config_${sessionUserId}`
    : 'nocturn_vocab_session_config'

  // 1. Persist to localStorage
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(cleanConfig))
      localStorage.setItem('nocturn_vocab_session_config', JSON.stringify(cleanConfig))
    }
  } catch {
    // ignore
  }

  // 2. Persist to Dexie userSettings
  const nowIso = new Date().toISOString()
  try {
    if (db && db.userSettings) {
      const existing = (await db.userSettings.get('preferences')) || {}
      await db.userSettings.put({
        ...existing,
        id: 'preferences',
        userId: sessionUserId || existing.userId || null,
        vocabSessionConfig: cleanConfig,
        updatedAt: nowIso,
      })
    }
  } catch (dexieErr) {
    console.warn('[vocabService] Dexie save error:', dexieErr)
  }

  // 3. Sync to Supabase if authenticated
  if (sessionUserId) {
    try {
      const res = await upsertUserSettings(sessionUserId, { vocabSessionConfig: cleanConfig })
      if (!res) {
        enqueueMutation('upsert', 'user_settings', {
          id: toUuid(`settings-${sessionUserId}`),
          user_id: sessionUserId,
          settings: { vocabSessionConfig: cleanConfig },
          updated_at: nowIso,
        })
      }
    } catch {
      enqueueMutation('upsert', 'user_settings', {
        id: toUuid(`settings-${sessionUserId}`),
        user_id: sessionUserId,
        settings: { vocabSessionConfig: cleanConfig },
        updated_at: nowIso,
      })
    }
  }

  // 4. Reset today's session log and completion flags so the new configuration determines the next session immediately!
  const today = getTodayDateKey()
  try {
    if (db && db.dailyVocabLogs) {
      await db.dailyVocabLogs.delete(today)
    }
    if (typeof localStorage !== 'undefined') {
      const keysToRemove = [
        `nocturn_vocab_learn_completed_${userId || 'guest'}_${today}`,
        `nocturn_vocab_learn_completed_${sessionUserId || 'guest'}_${today}`,
        `nocturn_vocab_learn_completed_guest_${today}`,
        `nocturn_vocab_learn_idx_${userId || 'guest'}_${today}`,
        `nocturn_vocab_learn_idx_${sessionUserId || 'guest'}_${today}`,
        `nocturn_vocab_learn_idx_guest_${today}`,
        `nocturn_vocab_learn_ids_${userId || 'guest'}_${today}`,
        `nocturn_vocab_learn_ids_${sessionUserId || 'guest'}_${today}`,
        `nocturn_vocab_learn_ids_guest_${today}`,
      ]
      keysToRemove.forEach((k) => localStorage.removeItem(k))
    }
  } catch {
    // ignore
  }

  // 5. Notify app components of updated configuration
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('nocturn:vocab-config-updated', { detail: cleanConfig })
    )
  }

  return cleanConfig
}

export async function getAvailableWordsCountByDifficulty(userId = null) {
  const sessionUserId = getActiveUserId(userId)
  const allLocal = await getAllLearnedWords(sessionUserId)
  const existingWordsLower = new Set(allLocal.map((w) => (w.word || '').trim().toLowerCase()))

  const counts = { easy: 0, medium: 0, hard: 0 }
  for (const diff of ['easy', 'medium', 'hard']) {
    const unlearnedDatasetCount = GRE_VOCAB_DATASET.filter(
      (w) => (w.difficulty || 'Medium').toLowerCase() === diff && !existingWordsLower.has((w.word || '').trim().toLowerCase())
    ).length
    counts[diff] = unlearnedDatasetCount
  }
  return counts
}
