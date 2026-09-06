/**
 * Gemini Vocabulary Service
 * Responsible for requesting daily GRE-level vocabulary words.
 *
 * Security Architecture:
 * Keeps Gemini API key server-side (via backend proxy / Supabase function).
 * Uses model: gemini-3.6-flash and Gemini Interactions API format.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Mandatory default model: gemini-3.6-flash
export const GEMINI_MODEL = 'gemini-3.6-flash'

/**
 * Validates structured vocabulary words returned by Gemini.
 * Rejects malformed objects or arrays with fewer than `count` valid words.
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
      item.definition.trim().length > 0 &&
      typeof item.example_sentence === 'string' &&
      item.example_sentence.trim().length > 0
    ) {
      const word = item.word.trim()
      const definition = item.definition.trim()
      const example_sentence = item.example_sentence.trim()
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
  if (validWords.length < targetCount) {
    return {
      valid: false,
      words: validWords,
      error: `Gemini service returned only ${validWords.length} valid words (${targetCount} required)`,
    }
  }

  return { valid: true, words: validWords.slice(0, targetCount) }
}

/**
 * Generates daily GRE vocabulary words via server-side layer with gemini-3.6-flash.
 *
 * @param {Array<string>} existingWordsList List of words already learned
 * @param {number} count Number of words to generate
 * @returns {Promise<Array>} List of validated word objects
 */
export async function generateDailyVocab(existingWordsList = [], count = 5) {
  if (!navigator.onLine) {
    throw new Error("You're offline. Connect to the internet to generate today's new words.")
  }

  const targetCount = Math.max(1, count)
  const excludedStr = existingWordsList.length > 0
    ? `Do NOT include any of these previously learned words: ${existingWordsList.slice(-100).join(', ')}.`
    : ''

  const promptText = `Generate exactly ${targetCount} GRE-level vocabulary words for a student preparing for the GRE exam.
Requirements:
- Words must be medium to high difficulty, non-trivial, and extremely relevant for the GRE.
- ${excludedStr}
- Provide concise but accurate definitions.
- Provide natural, contextual example sentences.
- Include part of speech (e.g. noun, adjective, verb) and 2-3 relevant synonyms.

Return ONLY a valid JSON array containing exactly ${targetCount} objects. Do NOT use markdown code blocks, backticks, or any explanatory text outside the JSON.

Expected JSON Structure:
[
  {
    "word": "Equanimity",
    "definition": "Mental calmness, composure, and evenness of temper, especially in a difficult situation.",
    "example_sentence": "She accepted both praise and criticism with equal equanimity.",
    "part_of_speech": "noun",
    "synonyms": ["composure", "calmness", "tranquility"],
    "difficulty": "Hard"
  }
]`

  // 1. Primary backend: Supabase Edge Function 'generate-vocab'
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('generate-vocab', {
        body: {
          prompt: promptText,
          model: GEMINI_MODEL,
          existingWords: existingWordsList,
          count: targetCount,
        },
      })
      if (!error && data?.words) {
        const validation = validateVocabResponse(data.words, targetCount)
        if (validation.valid) return validation.words
      }
      if (error) {
        console.warn('[geminiVocabService] Supabase Edge Function notice:', error)
      }
    } catch (err) {
      console.warn('[geminiVocabService] Exception invoking generate-vocab Edge Function:', err)
    }
  }

  // 2. Dev environment local proxy fallback (only in dev mode when Vite dev server is active)
  if (import.meta.env.DEV) {
    try {
      const response = await fetch('/api/generate-vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          model: GEMINI_MODEL,
          existingWords: existingWordsList,
          count: targetCount,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const rawWords = data.words || data
        const validation = validateVocabResponse(rawWords, targetCount)
        if (validation.valid) return validation.words
      }
    } catch {
      // Dev proxy unavailable
    }
  }

  throw new Error(
    'Vocabulary generation service unavailable. Ensure the Supabase Edge Function (generate-vocab) is deployed and configured with GEMINI_API_KEY.'
  )
}
