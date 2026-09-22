import { createClient } from '@supabase/supabase-js'

function cleanEnvVar(val) {
  if (!val || typeof val !== 'string') return ''
  let cleaned = val.trim()
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim()
  }
  return cleaned
}

// Canonical resolution using import.meta.env as required by Vite
const rawUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof globalThis !== 'undefined' && globalThis.process?.env?.VITE_SUPABASE_URL) ||
  ''

const rawKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof globalThis !== 'undefined' && globalThis.process?.env?.VITE_SUPABASE_ANON_KEY) ||
  ''

const supabaseUrl = cleanEnvVar(rawUrl)
const supabaseKey = cleanEnvVar(rawKey)

/**
 * Safe development diagnostic helper.
 * Reports ONLY boolean presence — NEVER prints actual URL, keys, or secrets.
 */
export function getSupabaseDiagnostics() {
  const hasUrl = Boolean(supabaseUrl && !supabaseUrl.includes('your-supabase-project'))
  const hasAnonKey = Boolean(supabaseKey && !supabaseKey.includes('your-supabase-anon-key'))
  return {
    hasUrl,
    hasAnonKey,
    isConfigured: Boolean(hasUrl && hasAnonKey),
  }
}

// Log safe configuration status in browser console (booleans only, never secrets)
if (typeof window !== 'undefined') {
  const diag = getSupabaseDiagnostics()
  console.info('[Nocturn Supabase Config]', {
    hasUrl: diag.hasUrl,
    hasAnonKey: diag.hasAnonKey,
    isConfigured: diag.isConfigured,
  })
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('your-supabase-project') &&
  !supabaseKey.includes('your-supabase-anon-key')
)

/**
 * Resilient fetch wrapper for Supabase client.
 * Handles transient network dropouts, HTTP/3 QUIC protocol errors (ERR_QUIC_PROTOCOL_ERROR),
 * and automatic TCP fallback retries.
 */
async function resilientFetch(input, init) {
  const maxRetries = 2
  let lastError = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(input, init)
    } catch (err) {
      lastError = err
      const msg = (err?.message || '').toLowerCase()
      const isNetworkError =
        err?.name === 'TypeError' ||
        msg.includes('failed to fetch') ||
        msg.includes('quic') ||
        msg.includes('network') ||
        msg.includes('aborted')

      if (isNetworkError && attempt < maxRetries) {
        // Chromium falls back from QUIC to TCP upon retrying
        const delay = (attempt + 1) * 200
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      throw err
    }
  }
  throw lastError
}

// Initialize exactly one canonical Supabase client instance.
// Explicitly injects apikey into global headers and uses resilientFetch for QUIC/network recovery.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          apikey: supabaseKey,
        },
        fetch: resilientFetch,
      },
    })
  : null

/**
 * Health check helper to verify Supabase connection without leaking credentials.
 */
export async function testSupabaseConnection() {
  if (!isSupabaseConfigured) {
    return {
      configured: false,
      connected: false,
      message: 'Supabase environment variables unconfigured or invalid',
    }
  }

  if (!supabase) {
    return {
      configured: false,
      connected: false,
      message: 'Failed to initialize Supabase client instance',
    }
  }

  try {
    const { error } = await supabase.auth.getSession()
    if (error) {
      return {
        configured: true,
        connected: false,
        message: `Connection failed: ${error.message}`,
      }
    }

    return {
      configured: true,
      connected: true,
      message: 'Successfully connected to Supabase backend API',
    }
  } catch (err) {
    return {
      configured: true,
      connected: false,
      message: `Network error connecting to Supabase: ${err.message}`,
    }
  }
}

/**
 * Checks if a given userId represents an offline/guest local session.
 */
export function isGuestUserId(userId) {
  if (!userId || typeof userId !== 'string') return true
  return userId === 'guest-local-user' || userId.startsWith('guest')
}

