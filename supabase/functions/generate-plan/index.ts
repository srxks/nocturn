import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

function getCorsHeaders(req: Request) {
  const reqHeaders = req.headers.get('Access-Control-Request-Headers')
  return {
    'Access-Control-Allow-Origin': '*',
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

    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY')
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
    const { prompt } = body

    let selectedModel = body.model || 'gemini-3.6-flash'
    if (selectedModel.includes('1.5') || selectedModel.includes('2.5')) {
      selectedModel = 'gemini-3.6-flash'
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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

    const plan = JSON.parse(cleaned)
    return new Response(JSON.stringify({ plan }), {
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
