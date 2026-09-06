import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { AuthContext } from './AuthContextObject'
import { syncWithCloud } from '../services/syncService'
import { updateUserProfileRemote, fetchUserProfileRemote } from '../lib/profile'
import { startRealtime, stopRealtime } from '../services/realtimeService'
import { drainSyncQueue } from '../services/syncQueue'
import { db } from '../db/db'
import { cleanupLegacyLocalStorage, setStorageItem } from '../utils/storageUtils'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(() => isSupabaseConfigured && Boolean(supabase))

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    let lastInitializedUserId = null
    let isInitializing = false

    // Handles all setup required after a user signs in
    const handleAuthUser = async (authUser, event = null) => {
      if (!authUser?.id) return
      // Ignore token refresh events and redundant initializations
      if (event === 'TOKEN_REFRESHED') return
      if (lastInitializedUserId === authUser.id && event !== 'SIGNED_IN') return
      if (isInitializing) return

      isInitializing = true
      lastInitializedUserId = authUser.id

      try {
        // 0. Clean up any legacy localStorage caches to prevent stale data conflicts
        cleanupLegacyLocalStorage()

        // 1. Ensure user profile exists, preserving existing custom display name
        const existingProfile = await fetchUserProfileRemote(authUser.id)
        const nameToUse =
          existingProfile?.display_name ||
          authUser.user_metadata?.full_name ||
          authUser.email?.split('@')[0] ||
          'Nocturn User'
        setStorageItem('nocturn_user_name', nameToUse)

        if (!existingProfile?.display_name) {
          await updateUserProfileRemote(authUser.id, {
            display_name: nameToUse,
            avatar_url: authUser.user_metadata?.avatar_url || null,
          })
        }

        // 2. Start centralized realtime subscriptions for all tables
        startRealtime(authUser.id)

        // 3. Drain any offline mutations queued while the user was disconnected
        await drainSyncQueue()

        // 4. Two-way timestamp reconciliation sync (Dexie <-> Supabase)
        await syncWithCloud(authUser.id)
      } catch (err) {
        console.warn('[AuthProvider] Auth user initialization notice:', err)
      } finally {
        isInitializing = false
      }
    }

    // Get the initial session on mount
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession)
      setUser(initSession?.user ?? null)
      setLoading(false)
      if (initSession?.user) {
        handleAuthUser(initSession.user, 'GET_SESSION')
      }
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      setLoading(false)

      if (currentSession?.user) {
        handleAuthUser(currentSession.user, event)
      } else {
        // User signed out — tear down realtime subscriptions
        lastInitializedUserId = null
        stopRealtime()
      }
    })

    // Register online event listener to drain sync queue on reconnect
    const handleOnline = () => {
      drainSyncQueue().catch(err =>
        console.warn('[AuthProvider] Failed to drain sync queue on reconnect:', err)
      )
    }
    window.addEventListener('online', handleOnline)

    return () => {
      subscription?.unsubscribe()
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  const signUpWithEmail = async (email, password, fullName) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Please set environment variables.')
    }
    const cleanName = typeof fullName === 'string' ? fullName.trim() : ''
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: cleanName,
        },
      },
    })
    if (error) throw error

    if (cleanName) {
      setStorageItem('nocturn_user_name', cleanName)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('nocturn:profile-updated', { detail: { display_name: cleanName } })
        )
      }
    }

    if (data?.user?.id && cleanName) {
      try {
        await updateUserProfileRemote(data.user.id, { display_name: cleanName })
      } catch (err) {
        console.warn('[AuthContext] Could not upsert user profile on signup:', err)
      }
    }
    return data
  }

  const signInWithEmail = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Please set environment variables.')
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Please set environment variables.')
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

  const signOut = async () => {
    if (!isSupabaseConfigured || !supabase) return
    // Stop realtime before signing out to prevent subscription errors
    stopRealtime()
    try {
      cleanupLegacyLocalStorage()
      const customThemes = await db.themes.filter((t) => !t.isPreset).toArray()
      if (customThemes.length > 0) {
        await db.themes.bulkDelete(customThemes.map((t) => t.id))
      }
      await db.themeSettings.put({
        id: 'active',
        activeThemeId: 'preset-nocturn-green',
        customColors: null,
      })
      await db.timerSettings.put({
        id: 'default',
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        sessions: 4,
        autoStartBreaks: false,
        autoStartPomo: false,
      })
    } catch (err) {
      console.warn('[AuthProvider] Local state cleanup notice on signOut:', err)
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
