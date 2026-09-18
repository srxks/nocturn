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

    let body = {}
    try {
      if (req.headers.get('content-type')?.includes('application/json')) {
        body = await req.json()
      }
    } catch {
      return new Response(
        JSON.stringify({
          error: 'invalid_request',
          message: 'Invalid JSON request payload',
          retryable: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'configuration_error',
          message: 'GEMINI_API_KEY is not configured in Supabase Edge Function secrets',
          retryable: false,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { prompt, existingWords = [], count = 5 } = body

    // Configurable model: environment variable or request body with active fallback
    let selectedModel = Deno.env.get('GEMINI_MODEL') || body.model || 'gemini-3.6-flash'
    if (selectedModel.includes('1.5') || selectedModel.includes('2.5')) {
      selectedModel = 'gemini-3.6-flash'
    }

    const targetCount = Math.max(1, Number(count) || 5)
    const cleanExisting = Array.isArray(existingWords)
      ? existingWords.map((w: string) => String(w || '').trim()).filter((w: string) => w.length > 0)
      : []

    const excludedStr =
      cleanExisting.length > 0
        ? `CRITICAL REQUIREMENT: Do NOT include, repeat, or recycle any of these already learned words: ${cleanExisting.join(', ')}.`
        : ''

    const randomSeed = Math.floor(Math.random() * 1000000)
    const promptText =
      prompt ||
      `Generate exactly ${targetCount} advanced, high-yield GRE vocabulary words for a student preparing for the GRE exam.
Requirements:
- Words must be medium to high difficulty, non-trivial, and extremely relevant for the GRE.
- ${excludedStr}
- Provide concise but accurate definitions.
- Provide natural, contextual example sentences.
- Include part of speech (noun, adjective, verb, adverb) and 2-3 relevant synonyms.
- Every word must be brand new, distinct, and unique.
- Exploration Entropy Seed: ${Date.now()}-${randomSeed}.

Return ONLY a valid JSON array containing exactly ${targetCount} objects with keys:
"word", "definition", "example_sentence", "part_of_speech", "synonyms", "difficulty".`

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`

    // Call Gemini API with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    let response: Response
    try {
      response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.9,
          },
        }),
        signal: controller.signal,
      })
    } catch (fetchErr: any) {
      clearTimeout(timeoutId)
      const isTimeout = fetchErr?.name === 'AbortError'
      return new Response(
        JSON.stringify({
          error: isTimeout ? 'timeout' : 'upstream_failure',
          message: isTimeout
            ? 'Gemini generation request timed out. Please try again.'
            : 'Failed to connect to Gemini API upstream',
          retryable: true,
        }),
        {
          status: isTimeout ? 504 : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      let status = 502
      let errType = 'upstream_failure'
      let message = 'Gemini generation service returned an upstream error'
      let retryable = true

      if (response.status === 401 || response.status === 403) {
        status = 401
        errType = 'authentication_problem'
        message = 'Invalid or expired Gemini API credentials in Supabase configuration'
        retryable = false
      } else if (response.status === 429) {
        status = 429
        errType = 'rate_limit'
        message = 'Gemini API rate limit reached. Please retry in a few moments.'
        retryable = true
      } else if (response.status === 503) {
        status = 503
        errType = 'service_unavailable'
        message = 'Gemini model is temporarily overloaded. Please try again.'
        retryable = true
      }

      return new Response(
        JSON.stringify({
          error: errType,
          message,
          statusCode: response.status,
          retryable,
        }),
        {
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const data = await response.json().catch(() => null)
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!candidateText) {
      return new Response(
        JSON.stringify({
          error: 'upstream_failure',
          message: 'Gemini returned an empty candidate response',
          retryable: true,
        }),
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

    const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      cleaned = arrayMatch[0]
    }

    let words
    try {
      words = JSON.parse(cleaned)
    } catch {
      return new Response(
        JSON.stringify({
          error: 'upstream_failure',
          message: 'Could not parse structured vocabulary from Gemini output',
          retryable: true,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!Array.isArray(words)) {
      return new Response(
        JSON.stringify({
          error: 'upstream_failure',
          message: 'Gemini output was not a JSON array',
          retryable: true,
        }),
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
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: 'unexpected_error',
        message: err?.message || 'Unexpected server error in generate-vocab',
        retryable: true,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
