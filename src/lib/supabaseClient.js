import { createClient } from '@supabase/supabase-js'

const env =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : (typeof globalThis !== 'undefined' && globalThis.process?.env) || {}
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY

// Initialize Supabase client cleanly using publishable / anon public key
export const supabase =
  supabaseUrl && supabaseKey && !supabaseUrl.includes('your-supabase-project')
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null

export const isSupabaseConfigured = Boolean(supabase)

/**
 * Health check helper to verify Supabase connection
 */
export async function testSupabaseConnection() {
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-supabase-project')) {
    return {
      configured: false,
      connected: false,
      message: 'Supabase environment variables unconfigured',
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
