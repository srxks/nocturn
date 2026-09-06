import { supabase, isSupabaseConfigured } from './supabaseClient'

/**
 * Signs up a user with email and password
 */
export async function signUpWithEmail(email, password, fullName) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase client is not configured.')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) throw error
  return data
}

/**
 * Signs in a user with email and password
 */
export async function signInWithEmail(email, password) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase client is not configured.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

/**
 * Initiates Google OAuth Sign In
 */
export async function signInWithGoogle() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase client is not configured.')
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  })

  if (error) throw error
  return data
}

/**
 * Signs out the current user
 */
export async function signOut() {
  if (!isSupabaseConfigured || !supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Fetches the current session and user
 */
export async function getSession() {
  if (!isSupabaseConfigured || !supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) return null
  return data.session
}
