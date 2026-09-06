import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '*'
  const reqHeaders = req.headers.get('Access-Control-Request-Headers')
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      reqHeaders || 'authorization, x-client-info, apikey, content-type, x-region',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // 1. Handle CORS preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            'GEMINI_API_KEY is not configured in Supabase Edge Function secrets. Run: supabase secrets set GEMINI_API_KEY=your_key',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { prompt, existingWords = [], count = 5 } = body

    // Always use gemini-3.6-flash (active supported model)
    let selectedModel = body.model || 'gemini-3.6-flash'
    if (selectedModel.includes('1.5') || selectedModel.includes('2.5')) {
      selectedModel = 'gemini-3.6-flash'
    }

    const targetCount = Math.max(1, Number(count) || 5)
    const excludedStr =
      Array.isArray(existingWords) && existingWords.length > 0
        ? `Do NOT include any of these previously learned words: ${existingWords.slice(-100).join(', ')}.`
        : ''

    const promptText =
      prompt ||
      `Generate exactly ${targetCount} GRE-level vocabulary words for a student preparing for the GRE exam.
Requirements:
- Words must be medium to high difficulty, non-trivial, and extremely relevant for the GRE.
- ${excludedStr}
- Provide concise but accurate definitions.
- Provide natural, contextual example sentences.
- Include part of speech (e.g. noun, adjective, verb) and 2-3 relevant synonyms.

Return ONLY a valid JSON array containing exactly ${targetCount} objects with keys: word, definition, example_sentence, part_of_speech, synonyms, difficulty.`

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return new Response(
        JSON.stringify({ error: `Gemini API returned ${response.status}: ${errText}` }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const data = await response.json()
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!candidateText) {
      return new Response(
        JSON.stringify({ error: 'Gemini returned an empty candidate response' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    let cleaned = candidateText.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    }

    const words = JSON.parse(cleaned)
    if (!Array.isArray(words)) {
      return new Response(
        JSON.stringify({ error: 'Gemini output was not a JSON array' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(JSON.stringify({ words }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
