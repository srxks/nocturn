import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { toUuid } from './idUtils.js'

export function mapRowToVocabWord(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    word: row.word,
    definition: row.definition,
    example_sentence: row.example_sentence || '',
    part_of_speech: 'noun',
    synonyms: [],
    difficulty: 'Hard',
    date_added: row.date_added,
    correct_count: Math.min(Math.max(row.correct_count || 0, 0), 5),
    last_quizzed_date: row.last_quizzed_date || null,
  }
}

export function deduplicateVocabWords(wordsArray) {
  if (!Array.isArray(wordsArray) || wordsArray.length === 0) return []

  const map = new Map()

  for (const item of wordsArray) {
    if (!item || !item.word) continue
    const key = item.word.trim().toLowerCase()

    if (!map.has(key)) {
      map.set(key, item)
    } else {
      const existing = map.get(key)
      const existingScore =
        (existing.correct_count || 0) * 10 +
        (existing.last_quizzed_date ? 5 : 0) +
        (existing.example_sentence ? 2 : 0) +
        new Date(existing.updated_at || existing.created_at || existing.date_added || 0).getTime() / 1e12

      const itemScore =
        (item.correct_count || 0) * 10 +
        (item.last_quizzed_date ? 5 : 0) +
        (item.example_sentence ? 2 : 0) +
        new Date(item.updated_at || item.created_at || item.date_added || 0).getTime() / 1e12

      if (itemScore > existingScore) {
        map.set(key, item)
      }
    }
  }

  return Array.from(map.values())
}

export function mapVocabWordToRow(item, userId) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)
  const validId = isUuid ? item.id : toUuid(`vocab-${userId}-${item.word.trim().toLowerCase()}`)

  return {
    id: validId,
    user_id: userId,
    word: item.word,
    definition: item.definition,
    example_sentence: item.example_sentence || '',
    date_added: item.date_added || new Date().toISOString().split('T')[0],
    correct_count: Math.min(Math.max(item.correct_count || 0, 0), 5),
    last_quizzed_date: item.last_quizzed_date || null,
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function fetchUserVocabWords(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return []

  try {
    const { data, error } = await supabase
      .from('vocab_words')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[vocab.js] Error fetching user vocab words:', error.message)
      return []
    }

    return (data || []).map(mapRowToVocabWord)
  } catch (err) {
    console.warn('[vocab.js] Network error fetching vocab words:', err)
    return []
  }
}

export async function upsertVocabWordsRemote(wordsArray, userId) {
  if (!isSupabaseConfigured || !supabase || !userId || !wordsArray.length) return []

  try {
    const deduplicated = deduplicateVocabWords(wordsArray)
    const rows = deduplicated.map((w) => mapVocabWordToRow(w, userId))

    const { data, error } = await supabase
      .from('vocab_words')
      .upsert(rows, { onConflict: 'id' })
      .select()

    if (error) {
      console.warn('[vocab.js] Error upserting vocab words:', error.message)
      return []
    }

    return (data || []).map(mapRowToVocabWord)
  } catch (err) {
    console.warn('[vocab.js] Network error upserting vocab words:', err)
    return []
  }
}

export async function deleteVocabWordRemote(wordId, userId) {
  if (!isSupabaseConfigured || !supabase || !userId || !wordId) return false
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(wordId)
    const validId = isUuid ? wordId : toUuid(wordId)

    const { error } = await supabase
      .from('vocab_words')
      .delete()
      .eq('id', validId)
      .eq('user_id', userId)

    if (error) {
      console.warn('[vocab.js] Error deleting vocab word:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[vocab.js] Network error deleting vocab word:', err)
    return false
  }
}

export async function deleteAllVocabWordsRemote(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return false
  try {
    const { error } = await supabase
      .from('vocab_words')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.warn('[vocab.js] Error deleting all vocab words:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[vocab.js] Network error deleting all vocab words:', err)
    return false
  }
}

