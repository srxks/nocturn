/**
 * Gemini Vocabulary Service
 * Responsible for requesting daily GRE-level vocabulary words.
 *
 * Security Architecture:
 * Keeps Gemini API key server-side (via backend proxy or Supabase Edge Function).
 * Configurable model via VITE_GEMINI_MODEL env variable (defaults to gemini-2.5-flash).
 */

import { supabase } from '../lib/supabase'

// Configurable model name via environment variable (default: gemini-2.5-flash)
export const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'

/**
 * Validates structured vocabulary words returned by Gemini.
 * Rejects malformed objects or arrays with fewer than 5 valid words.
 */
export function validateVocabResponse(rawList) {
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

  if (validWords.length < 5) {
    return {
      valid: false,
      words: validWords,
      error: `Gemini service returned only ${validWords.length} valid words (5 required)`,
    }
  }

  return { valid: true, words: validWords.slice(0, 5) }
}

/**
 * Generates 5 daily GRE vocabulary words via backend service or Edge Function.
 *
 * @param {Array<string>} existingWordsList List of words already learned
 * @returns {Promise<Array>} List of 5 validated word objects
 */
export async function generateDailyVocab(existingWordsList = []) {
  if (!navigator.onLine) {
    throw new Error("You're offline. Connect to the internet to generate today's new words.")
  }

  const excludedStr = existingWordsList.length > 0
    ? `Do NOT include any of these previously learned words: ${existingWordsList.slice(-100).join(', ')}.`
    : ''

  const promptText = `Generate exactly 5 GRE-level vocabulary words for a student preparing for the GRE exam.
Requirements:
- Words must be medium to high difficulty, non-trivial, and extremely relevant for the GRE.
- ${excludedStr}
- Provide concise but accurate definitions.
- Provide natural, contextual example sentences.
- Include part of speech (e.g. noun, adjective, verb) and 2-3 relevant synonyms.

Return ONLY a valid JSON array containing exactly 5 objects. Do NOT use markdown code blocks, backticks, or any explanatory text outside the JSON.

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

  // 1. Try Supabase Edge Function 'generate-vocab' if Supabase is connected
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('generate-vocab', {
        body: { prompt: promptText, model: GEMINI_MODEL, existingWords: existingWordsList },
      })
      if (!error && data?.words) {
        const validation = validateVocabResponse(data.words)
        if (validation.valid) return validation.words
      }
    } catch {
      // Fallback to backend API endpoint
    }
  }

  // 2. Call backend proxy endpoint
  const apiEndpoint = import.meta.env.VITE_GEMINI_API_ENDPOINT || '/api/generate-vocab'

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptText,
        model: GEMINI_MODEL,
        existingWords: existingWordsList,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      const rawWords = data.words || data
      const validation = validateVocabResponse(rawWords)
      if (validation.valid) return validation.words
    }
  } catch {
    // Continue to dev environment fallback
  }

  // 3. Development Fallback using configured dev key if present
  const devKey = import.meta.env.VITE_GEMINI_API_KEY
  if (devKey && !devKey.includes('your-gemini-api-key')) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${devKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
      }),
    })

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}))
      throw new Error(`Gemini API Error (${GEMINI_MODEL}): ${errJson.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!candidateText) throw new Error('Gemini returned an empty payload')

    let cleanedText = candidateText.trim()
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    }

    const parsed = JSON.parse(cleanedText)
    const validation = validateVocabResponse(parsed)
    if (!validation.valid) throw new Error(validation.error)

    return validation.words
  }

  throw new Error('Backend vocabulary service unavailable. Configure server proxy or VITE_GEMINI_MODEL.')
}
