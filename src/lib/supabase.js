import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Initialize Supabase client if environment variables are provided
export const supabase =
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-supabase-project')
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export const isSupabaseConfigured = Boolean(supabase)

/**
 * Verifies communication with the Supabase backend.
 * Returns { configured: boolean, connected: boolean, message: string }
 */
export async function testSupabaseConnection() {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-supabase-project')) {
    return {
      configured: false,
      connected: false,
      message: 'Supabase environment variables unconfigured (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env)',
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
