import { createContext, useContext, useState, useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { db } from '../db/db'
import { useAuth } from './useAuth'
import { upsertUserSettings } from '../lib/themes'
import { isRealtimeWrite } from '../services/realtimeService'

const AnimationContext = createContext({
  animationMode: 'on',
  setAnimationMode: () => {},
  isAnimationsOff: false,
  isReducedMotion: false,
})

export function useAnimation() {
  return useContext(AnimationContext)
}

export function AnimationProvider({ children }) {
  const { user } = useAuth()
  const [animationMode, setAnimationModeState] = useState(() => {
    if (typeof window === 'undefined') return 'on'
    const stored = localStorage.getItem('nocturn_animation_mode')
    if (stored === 'on' || stored === 'reduced' || stored === 'off') {
      return stored
    }
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return prefersReduced ? 'reduced' : 'on'
  })

  // Hydrate from Dexie userSettings on mount
  useEffect(() => {
    let isMounted = true
    async function hydrate() {
      try {
        if (!db?.userSettings) return
        const prefs = await db.userSettings.get('preferences')
        if (prefs?.animationMode && isMounted) {
          if (prefs.animationMode !== animationMode) {
            setAnimationModeState(prefs.animationMode)
          }
        }
      } catch (err) {
        console.warn('[AnimationProvider] hydration error:', err)
      }
    }
    hydrate()
    return () => {
      isMounted = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronize data-animations attribute and localStorage
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-animations', animationMode)
      try {
        localStorage.setItem('nocturn_animation_mode', animationMode)
      } catch {
        // ignore in private mode
      }
    }
  }, [animationMode])

  const setAnimationMode = async (mode) => {
    if (mode !== 'on' && mode !== 'reduced' && mode !== 'off') return
    setAnimationModeState(mode)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-animations', mode)
      try {
        localStorage.setItem('nocturn_animation_mode', mode)
      } catch {
        // ignore
      }
    }

    try {
      const prefs = (await db.userSettings.get('preferences')) || {}
      await db.userSettings.put({
        ...prefs,
        id: 'preferences',
        animationMode: mode,
        updatedAt: new Date().toISOString(),
      })
      if (user?.id && !isRealtimeWrite()) {
        await upsertUserSettings(user.id, { animationMode: mode })
      }
    } catch (err) {
      console.warn('[AnimationProvider] Save error:', err)
    }
  }

  // Framer Motion configuration mapping
  const motionConfigProps =
    animationMode === 'off'
      ? { reducedMotion: 'always', transition: { duration: 0 } }
      : animationMode === 'reduced'
      ? { reducedMotion: 'always' }
      : { reducedMotion: 'user' }

  return (
    <AnimationContext.Provider
      value={{
        animationMode,
        setAnimationMode,
        isAnimationsOff: animationMode === 'off',
        isReducedMotion: animationMode === 'reduced',
      }}
    >
      <MotionConfig {...motionConfigProps}>
        {children}
      </MotionConfig>
    </AnimationContext.Provider>
  )
}
