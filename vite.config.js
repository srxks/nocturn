/* global process */
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

function vocabDevApiPlugin(env) {
  return {
    name: 'vocab-dev-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/generate-vocab')) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

          if (req.method === 'OPTIONS') {
            res.statusCode = 200
            res.end()
            return
          }

          if (req.method === 'POST') {
            try {
              let rawBody = ''
              for await (const chunk of req) {
                rawBody += chunk
              }
              const body = rawBody ? JSON.parse(rawBody) : {}
              const { prompt, count = 5 } = body
              const rawModel = body.model || 'gemini-3.6-flash'
              const model =
                rawModel.includes('1.5') || rawModel.includes('2.5')
                  ? 'gemini-3.6-flash'
                  : rawModel
              const apiKey =
                env.VITE_GEMINI_API_KEY ||
                env.GEMINI_API_KEY ||
                process.env.VITE_GEMINI_API_KEY ||
                process.env.GEMINI_API_KEY

              if (!apiKey || apiKey.includes('your-gemini-api-key')) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on server' }))
                return
              }

              const targetCount = Math.max(1, Number(count) || 5)
              const promptText =
                prompt ||
                `Generate exactly ${targetCount} GRE-level vocabulary words. Return ONLY a valid JSON array of objects with keys: word, definition, example_sentence, part_of_speech, synonyms, difficulty.`

              const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
              const geminiRes = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: promptText }] }],
                  generationConfig: {
                    temperature: 0.7,
                    responseMimeType: 'application/json',
                  },
                }),
              })

              if (!geminiRes.ok) {
                const errText = await geminiRes.text()
                res.statusCode = geminiRes.status
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: `Gemini API error: ${errText}` }))
                return
              }

              const data = await geminiRes.json()
              const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text
              let cleaned = (candidateText || '').trim()
              if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
              }

              const words = JSON.parse(cleaned)
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ words }))
              return
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }))
              return
            }
          }
        }

        if (req.url && req.url.startsWith('/api/plan-day')) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

          if (req.method === 'OPTIONS') {
            res.statusCode = 200
            res.end()
            return
          }

          if (req.method === 'POST') {
            try {
              let rawBody = ''
              for await (const chunk of req) {
                rawBody += chunk
              }
              const body = rawBody ? JSON.parse(rawBody) : {}
              const { prompt } = body
              const rawModel = body.model || 'gemini-3.6-flash'
              const model =
                rawModel.includes('1.5') || rawModel.includes('2.5')
                  ? 'gemini-3.6-flash'
                  : rawModel
              const apiKey =
                env.VITE_GEMINI_API_KEY ||
                env.GEMINI_API_KEY ||
                process.env.VITE_GEMINI_API_KEY ||
                process.env.GEMINI_API_KEY

              if (!apiKey || apiKey.includes('your-gemini-api-key')) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on server' }))
                return
              }

              const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
              const geminiRes = await fetch(geminiUrl, {
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

              if (!geminiRes.ok) {
                const errText = await geminiRes.text()
                res.statusCode = geminiRes.status
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: `Gemini API error: ${errText}` }))
                return
              }

              const data = await geminiRes.json()
              const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text
              let cleaned = (candidateText || '').trim()
              if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
              }

              const plan = JSON.parse(cleaned)
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ plan }))
              return
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }))
              return
            }
          }
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      vocabDevApiPlugin(env),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Nocturn',
        short_name: 'Nocturn',
        description: 'Focus & Productivity PWA',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
    ],
  }
})
