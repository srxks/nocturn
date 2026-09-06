import { db } from '../db/db.js'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
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
    let sessionUserId = userId
    if (!sessionUserId && isSupabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: {} }))
      sessionUserId = session?.user?.id || null
    }

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
    let sessionUserId = null
    if (isSupabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: {} }))
      sessionUserId = session?.user?.id || null
    }

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
      difficulty: wordRecord.difficulty || 'Hard',
      date_added: wordRecord.date_added || getTodayDateKey(),
      correct_count: Math.min(Math.max(wordRecord.correct_count ?? existing?.correct_count ?? 0, 0), 5),
      last_quizzed_date: wordRecord.last_quizzed_date || existing?.last_quizzed_date || null,
      updatedAt: nowIso,
    }

    await db.vocab.put(record)

    if (sessionUserId && !isRealtimeWrite()) {
      try {
        const res = await upsertVocabWordsRemote([record], sessionUserId)
        if (!res || res.length === 0) {
          enqueueMutation('upsert', 'vocab_words', mapVocabWordToRow(record, sessionUserId))
        }
      } catch {
        enqueueMutation('upsert', 'vocab_words', mapVocabWordToRow(record, sessionUserId))
      }
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
    let sessionUserId = existing?.userId || null
    if (!sessionUserId && isSupabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: {} }))
      sessionUserId = session?.user?.id || null
    }

    if (sessionUserId) {
      await recordTombstone('vocab_words', wordId, sessionUserId)
      if (existing?.word) {
        await recordTombstone('vocab_words', existing.word.trim().toLowerCase(), sessionUserId)
      }
    }

    await db.vocab.delete(wordId)

    if (sessionUserId && !isRealtimeWrite()) {
      try {
        const ok = await deleteVocabWordRemote(wordId, sessionUserId)
        if (!ok) {
          enqueueMutation('delete', 'vocab_words', { id: wordId, user_id: sessionUserId })
        }
      } catch {
        enqueueMutation('delete', 'vocab_words', { id: wordId, user_id: sessionUserId })
      }
    }

    return true
  } catch (err) {
    console.error('Failed to delete learned word:', err)
    return false
  }
}

export async function deleteAllVocabWords(userId = null) {
  try {
    let sessionUserId = userId
    if (!sessionUserId && isSupabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: {} }))
      sessionUserId = session?.user?.id || null
    }

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

    // 3. Wipe local Dexie records
    if (wordIds.length > 0) {
      await db.vocab.bulkDelete(wordIds)
    }
    if (db.dailyVocabLogs) {
      await db.dailyVocabLogs.clear()
    }

    // 4. Remote deletion for current user only
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    if (sessionUserId && isOnline && !isRealtimeWrite() && isSupabaseConfigured && supabase) {
      try {
        const ok = await deleteAllVocabWordsRemote(sessionUserId)
        if (!ok) {
          enqueueMutation('delete_all_user_vocab', 'vocab_words', { user_id: sessionUserId })
        }
      } catch {
        enqueueMutation('delete_all_user_vocab', 'vocab_words', { user_id: sessionUserId })
      }
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

export async function updateWordQuizResult(wordId, isCorrect) {
  try {
    const existing = await db.vocab.get(wordId)
    if (!existing) return null

    let sessionUserId = null
    if (isSupabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      sessionUserId = session?.user?.id || null
    }

    const today = getTodayDateKey()
    const newCount = isCorrect
      ? Math.min(existing.correct_count + 1, 5)
      : existing.correct_count

    const updated = {
      ...existing,
      correct_count: newCount,
      last_quizzed_date: today,
      updatedAt: new Date().toISOString(),
    }

    await db.vocab.put(updated)

    if (sessionUserId && !isRealtimeWrite()) {
      try {
        const res = await upsertVocabWordsRemote([updated], sessionUserId)
        if (!res || res.length === 0) {
          enqueueMutation('upsert', 'vocab_words', mapVocabWordToRow(updated, sessionUserId))
        }
      } catch {
        enqueueMutation('upsert', 'vocab_words', mapVocabWordToRow(updated, sessionUserId))
      }
    }

    return updated
  } catch (err) {
    console.error('Failed to update word quiz result:', err)
    return null
  }
}

export async function getReviewQueueWords(userId = null, limit = null) {
  try {
    const allWords = await getAllLearnedWords(userId)
    const today = getTodayDateKey()

    const eligible = allWords.filter((w) => {
      if (!w || !w.word) return false

      // Words quizzed today are already reviewed today -> leave queue
      if (w.last_quizzed_date && w.last_quizzed_date >= today) {
        return false
      }

      // Words added today that are currently unlearned (< 5 and no quiz history)
      // belong in today's active daily learning set, NOT in the review queue
      if (w.date_added === today && (Number(w.correct_count) || 0) === 0 && !w.last_quizzed_date) {
        return false
      }

      // Words never quizzed are due immediately
      if (!w.last_quizzed_date) {
        return true
      }

      const daysSince = getDaysDifference(w.last_quizzed_date, today)
      const count = Number(w.correct_count) || 0

      // Spaced repetition schedule: words currently being learned remain in progress
      if (count === 0) return true
      if (count === 1) return daysSince >= 1
      if (count === 2) return daysSince >= 3
      if (count === 3) return daysSince >= 5
      if (count === 4) return daysSince >= 7
      // Settled words (count >= 5) need refresh only after 14 days
      return daysSince >= 14
    })

    // Deduplicate by normalized word name so duplicates never appear in the review queue
    const seen = new Set()
    const dedupedEligible = []
    for (const w of eligible) {
      const norm = (w.word || '').trim().toLowerCase()
      if (!norm || seen.has(norm)) continue
      seen.add(norm)
      dedupedEligible.push(w)
    }

    // Deterministic, stable ordering
    dedupedEligible.sort((a, b) => {
      const aQuizzed = Boolean(a.last_quizzed_date)
      const bQuizzed = Boolean(b.last_quizzed_date)
      if (!aQuizzed && bQuizzed) return -1
      if (aQuizzed && !bQuizzed) return 1

      if ((a.correct_count || 0) !== (b.correct_count || 0)) {
        return (a.correct_count || 0) - (b.correct_count || 0)
      }

      if (a.last_quizzed_date && b.last_quizzed_date) {
        if (a.last_quizzed_date !== b.last_quizzed_date) {
          return a.last_quizzed_date.localeCompare(b.last_quizzed_date)
        }
      }

      if ((a.word || '') !== (b.word || '')) {
        return (a.word || '').localeCompare(b.word || '')
      }

      return (a.id || '').localeCompare(b.id || '')
    })

    if (limit && limit > 0) {
      return dedupedEligible.slice(0, limit)
    }

    return dedupedEligible
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
