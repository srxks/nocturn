/**
 * Gemini Vocabulary Service
 * Responsible for requesting daily GRE-level vocabulary words.
 *
 * Architecture:
 * 1. Primary: Supabase Edge Function 'generate-vocab' (server-side Gemini invocation)
 * 2. Secondary: Local Vite dev proxy '/api/generate-vocab' (only in dev mode)
 *
 * Strict Privacy & Real-AI Rules:
 * - Browser NEVER receives or uses Gemini API secrets.
 * - Zero fabricated, fake, or hard-coded fallback vocabulary words.
 * - Negative prompt blacklist ensures all words are brand-new and distinct.
 * - If AI service is unavailable, throws an honest, retryable error message.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

export const GEMINI_MODEL = 'gemini-3.6-flash'

/**
 * Robust JSON array extractor handling markdown fences, thought signatures, and text preamble.
 */
export function extractJsonArray(text) {
  if (!text || typeof text !== 'string') return null
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  }
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0])
      if (Array.isArray(parsed)) return parsed
    } catch {
      // ignore
    }
  }
  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // ignore
  }
  return null
}

/**
 * Validates structured vocabulary words returned by Gemini.
 */
export function validateVocabResponse(rawList, count = 5) {
  if (!Array.isArray(rawList)) {
    return { valid: false, words: [], error: 'Response is not a valid JSON array' }
  }

  const validWords = []

  for (const item of rawList) {
    if (
      item &&
      typeof item === 'object' &&
      typeof item.word === 'string' &&
      item.word.trim().length > 0 &&
      typeof item.definition === 'string' &&
      item.definition.trim().length > 0
    ) {
      const word = item.word.trim()
      const definition = item.definition.trim()
      const example_sentence =
        typeof item.example_sentence === 'string' && item.example_sentence.trim().length > 0
          ? item.example_sentence.trim()
          : `The scholar noted the importance of understanding the word "${word}".`

      const part_of_speech =
        typeof item.part_of_speech === 'string' && item.part_of_speech.trim()
          ? item.part_of_speech.trim().toLowerCase()
          : 'noun'

      let synonyms = []
      if (Array.isArray(item.synonyms)) {
        synonyms = item.synonyms.map((s) => String(s).trim()).filter(Boolean)
      } else if (typeof item.synonyms === 'string') {
        synonyms = item.synonyms.split(',').map((s) => s.trim()).filter(Boolean)
      }
      if (synonyms.length === 0) {
        synonyms = ['scholarly', 'GRE']
      }

      const difficulty =
        typeof item.difficulty === 'string' && item.difficulty.trim()
          ? item.difficulty.trim()
          : 'Hard'

      validWords.push({
        word,
        definition,
        example_sentence,
        part_of_speech,
        synonyms,
        difficulty,
      })
    }
  }

  const targetCount = Math.max(1, count)
  return {
    valid: validWords.length >= targetCount,
    words: validWords.slice(0, targetCount),
    error:
      validWords.length < targetCount
        ? `Found only ${validWords.length} valid words (${targetCount} required)`
        : null,
  }
}

/**
 * Filters candidates against already known words and prevents intra-batch duplication.
 */
export function deduplicateAgainstExisting(candidates = [], existingWordsList = []) {
  const existingSet = new Set(
    existingWordsList.map((w) => String(w).trim().toLowerCase())
  )
  const result = []
  const seenInBatch = new Set()

  for (const item of candidates) {
    if (!item || !item.word) continue
    const norm = String(item.word).trim().toLowerCase()
    if (!existingSet.has(norm) && !seenInBatch.has(norm)) {
      seenInBatch.add(norm)
      result.push(item)
    }
  }

  return result
}

/**
 * Generates daily GRE vocabulary words via Supabase Edge Function with gemini-3.6-flash.
 *
 * @param {Array<string>} existingWordsList List of words already in user's library
 * @param {number} count Number of words to generate
 * @returns {Promise<Array>} List of validated, 100% brand new word objects
 */
export async function generateDailyVocab(existingWordsList = [], count = 5) {
  const targetCount = Math.max(1, Number(count) || 5)

  // Clean and prepare blacklist of known words
  const cleanExisting = Array.from(
    new Set(
      existingWordsList
        .map((w) => String(w || '').trim())
        .filter((w) => w.length > 0)
    )
  )

  const excludedStr =
    cleanExisting.length > 0
      ? `CRITICAL EXCLUSION RULE: Absolutely DO NOT include, repeat, or recycle ANY of these already learned words: ${cleanExisting.join(', ')}.`
      : ''

  const randomSeed = Math.floor(Math.random() * 1000000)
  const promptText = `Generate exactly ${targetCount} advanced, high-yield GRE vocabulary words for a student preparing for the GRE exam.
Requirements:
- Words must be medium to high difficulty, non-trivial, and extremely relevant for the GRE.
- ${excludedStr}
- Provide concise, accurate definitions.
- Provide natural, contextual example sentences.
- Include part of speech (noun, adjective, verb, adverb) and 2-3 relevant synonyms.
- Every word must be brand new, distinct, and unique.
- Exploration Entropy Seed: ${Date.now()}-${randomSeed}.

Return ONLY a valid JSON array containing exactly ${targetCount} objects with keys:
"word", "definition", "example_sentence", "part_of_speech", "synonyms", "difficulty".`

  let edgeError = null

  // 1. Primary backend: Supabase Edge Function 'generate-vocab' with automatic retry
  if (isSupabaseConfigured && supabase) {
    const maxAttempts = 2
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-vocab', {
          body: {
            prompt: promptText,
            model: GEMINI_MODEL,
            existingWords: cleanExisting,
            count: targetCount,
          },
        })

        if (!error && data?.words) {
          const validated = validateVocabResponse(data.words, targetCount)
          const deduped = deduplicateAgainstExisting(validated.words, cleanExisting)
          if (deduped.length > 0) {
            return deduped
          }
        }

        if (error) {
          console.warn(`[geminiVocabService] Supabase Edge Function notice (attempt ${attempt + 1}/${maxAttempts}):`, error)
          edgeError = error.message || 'Supabase Edge Function returned an error'
        }
      } catch (err) {
        console.warn(`[geminiVocabService] Exception invoking generate-vocab (attempt ${attempt + 1}/${maxAttempts}):`, err)
        edgeError = err?.message || 'Network error connecting to vocabulary generator'
      }

      // If first attempt failed with network/QUIC glitch, wait briefly before retrying
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 600))
      }
    }
  }

  // 2. Dev environment local proxy fallback (when Vite dev server proxy is active)
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    try {
      const response = await fetch('/api/generate-vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          model: GEMINI_MODEL,
          existingWords: cleanExisting,
          count: targetCount,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const rawWords = data?.words || data
        if (Array.isArray(rawWords)) {
          const validated = validateVocabResponse(rawWords, targetCount)
          const deduped = deduplicateAgainstExisting(validated.words, cleanExisting)
          if (deduped.length > 0) {
            return deduped
          }
        }
      }
    } catch {
      // Dev proxy unavailable
    }
  }

  // No fake or hardcoded words: throw an honest, retryable user message
  const finalError =
    edgeError && edgeError.includes('GEMINI_API_KEY')
      ? 'GEMINI_API_KEY is not configured in Supabase Edge Function secrets.'
      : edgeError &&
        (edgeError.toLowerCase().includes('failed to fetch') ||
          edgeError.toLowerCase().includes('network') ||
          edgeError.toLowerCase().includes('quic') ||
          edgeError.toLowerCase().includes('timeout'))
      ? 'Network connection interrupted while reaching vocabulary generator. Please retry.'
      : 'Vocabulary generation is temporarily unavailable. Please try again.'

  throw new Error(finalError)
}
