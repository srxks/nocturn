import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { AuthContext } from './AuthContextObject'
import { syncWithCloud } from '../services/syncService'
import { updateUserProfileRemote, fetchUserProfileRemote } from '../lib/profile'
import { startRealtime, stopRealtime } from '../services/realtimeService'
import { drainSyncQueue } from '../services/syncQueue'
import { db } from '../db/db'
import { cleanupLegacyLocalStorage, setStorageItem } from '../utils/storageUtils'

const getCachedAuthUser = () => {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('nocturn_auth_user') : null
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  try {
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
          const val = JSON.parse(localStorage.getItem(k))
          if (val?.user) return val.user
        }
      }
    }
  } catch {
    // ignore
  }
  return null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCachedAuthUser())
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(() => isSupabaseConfigured && Boolean(supabase) && !getCachedAuthUser())

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return
    }

    let lastInitializedUserId = null
    let isInitializing = false
    let hasEndedLoading = false

    const endLoading = (userToSet, sessionToSet) => {
      if (hasEndedLoading) return
      hasEndedLoading = true
      if (sessionToSet !== undefined) setSession(sessionToSet)
      if (userToSet !== undefined) setUser(userToSet)
      setLoading(false)
    }

    // Guard against hanging indefinitely on net::ERR_CONNECTION_CLOSED / refresh_token outage
    const timeoutId = setTimeout(() => {
      const fallbackUser = getCachedAuthUser()
      endLoading(fallbackUser ?? null, null)
      if (fallbackUser) {
        handleAuthUser(fallbackUser, 'TIMEOUT_FALLBACK')
      }
    }, 2500)

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

    // Get the initial session on mount with timeout and catch guard
    supabase.auth
      .getSession()
      .then(({ data: { session: initSession }, error }) => {
        clearTimeout(timeoutId)
        if (error) {
          console.warn('[AuthProvider] getSession error:', error.message)
          const fallbackUser = getCachedAuthUser()
          endLoading(fallbackUser ?? null, null)
          if (fallbackUser) {
            handleAuthUser(fallbackUser, 'OFFLINE_FALLBACK')
          }
          return
        }
        endLoading(initSession?.user ?? null, initSession ?? null)
        if (initSession?.user) {
          try {
            localStorage.setItem('nocturn_auth_user', JSON.stringify(initSession.user))
          } catch {
            // ignore storage error
          }
          handleAuthUser(initSession.user, 'GET_SESSION')
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId)
        console.warn('[AuthProvider] getSession network failure, using cached offline state:', err)
        const fallbackUser = getCachedAuthUser()
        endLoading(fallbackUser ?? null, null)
        if (fallbackUser) {
          handleAuthUser(fallbackUser, 'OFFLINE_FALLBACK')
        }
      })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      clearTimeout(timeoutId)
      endLoading(currentSession?.user ?? null, currentSession ?? null)

      if (currentSession?.user) {
        try {
          localStorage.setItem('nocturn_auth_user', JSON.stringify(currentSession.user))
        } catch {
          // ignore storage error
        }
        handleAuthUser(currentSession.user, event)
      } else if (event === 'SIGNED_OUT') {
        try {
          localStorage.removeItem('nocturn_auth_user')
        } catch {
          // ignore storage error
        }
        lastInitializedUserId = null
        stopRealtime()
      }
    })

    // Register online event listener to refresh session and drain sync queue on reconnect
    const handleOnline = async () => {
      try {
        const { data: { session: refreshedSession } } = await supabase.auth.getSession()
        if (refreshedSession?.user) {
          setSession(refreshedSession)
          setUser(refreshedSession.user)
          try {
            localStorage.setItem('nocturn_auth_user', JSON.stringify(refreshedSession.user))
          } catch {
            // ignore storage error
          }
          startRealtime(refreshedSession.user.id)
        }
      } catch (err) {
        console.warn('[AuthProvider] Online session refresh notice:', err)
      }

      drainSyncQueue().catch((err) =>
        console.warn('[AuthProvider] Failed to drain sync queue on reconnect:', err)
      )
    }
    window.addEventListener('online', handleOnline)

    return () => {
      clearTimeout(timeoutId)
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
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('nocturn_auth_user')
      }
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
