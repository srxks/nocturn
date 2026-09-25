import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ensureSeedData } from '../db/db'
import { ThemeContext } from './ThemeContext'
import { DEFAULT_NOCTURN_THEME, PRESET_THEMES, V3_THEME_PRESETS } from '../constants/presetThemes'
import { useAuth } from './useAuth'
import {
  upsertUserSettings,
  upsertUserThemeRemote,
  deleteUserThemeRemote,
} from '../lib/themes'
import { isRealtimeWrite } from '../services/realtimeService'

function hexToRgb(hex) {
  if (!hex) return '0, 230, 118'
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
  }
  const num = parseInt(clean, 16)
  if (isNaN(num)) return '0, 230, 118'
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `${r}, ${g}, ${b}`
}

export function ThemeProvider({ children }) {
  const { user } = useAuth()

  useEffect(() => {
    ensureSeedData()
  }, [])

  // NOTE: Themes and settings are synchronized centrally via syncCoordinator
  // and AuthProvider, and received via realtimeService. Dexie is the local reactive
  // source of truth, watched below via useLiveQuery. No duplicate REST calls needed here.

  // Dexie live queries for themes, active theme settings, and user style preferences
  const dbThemes = useLiveQuery(async () => {
    return await db.themes.toArray()
  }, [])

  const activeThemeSetting = useLiveQuery(async () => {
    return await db.themeSettings.get('active')
  }, [])

  const userSettings = useLiveQuery(async () => {
    if (!db || !db.userSettings) return null
    return await db.userSettings.get('preferences')
  }, [])

  const [activePreset, setActivePreset] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('nocturn_theme_preset')) || 'indigo'
  })

  // Sync data-theme attribute to documentElement immediately with 240ms crossfade
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', activePreset)
      try {
        localStorage.setItem('nocturn_theme_preset', activePreset)
      } catch {
        // ignore localStorage error
      }
    }
  }, [activePreset])

  const uiStyle = userSettings?.uiStyle === 'angular' ? 'angular' : 'normal'

  // Sync data-ui-style attribute to documentElement immediately
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-ui-style', uiStyle)
    }
  }, [uiStyle])

  // Separate preset themes vs user custom themes
  const allThemes = dbThemes && dbThemes.length > 0 ? dbThemes : PRESET_THEMES
  const presetThemes = allThemes.filter((t) => t.isPreset)
  const savedThemes = allThemes.filter((t) => !t.isPreset)

  // Resolve current active theme object (normalizing any legacy 'preset-' prefix)
  const rawActiveThemeId = activeThemeSetting?.activeThemeId || activePreset || DEFAULT_NOCTURN_THEME.id
  const cleanActiveId = String(rawActiveThemeId).replace(/^preset-/, '')
  const matchedPreset = PRESET_THEMES.find((p) => p.id === cleanActiveId || p.id === `preset-${cleanActiveId}`)
  let activeTheme =
    allThemes.find((t) => t.id === rawActiveThemeId || t.id === cleanActiveId || t.id === `preset-${cleanActiveId}`) ||
    matchedPreset ||
    DEFAULT_NOCTURN_THEME

  // If custom colors were temporarily applied (live preview)
  if (activeThemeSetting?.customColors) {
    activeTheme = {
      ...activeTheme,
      colors: {
        ...activeTheme.colors,
        ...activeThemeSetting.customColors,
      },
    }
  }

  // Apply CSS variables dynamically to document root whenever active theme changes
  useEffect(() => {
    if (!activeTheme || !activeTheme.colors) return

    const root = document.documentElement
    const c = activeTheme.colors
    const accentRgb = hexToRgb(c.accent)

    root.style.setProperty('--color-nocturn-accent-rgb', accentRgb)
    root.style.setProperty('--color-nocturn-bg', c.background)
    root.style.setProperty('--color-nocturn-card', c.surface)
    root.style.setProperty('--color-nocturn-surface', c.elevated)
    root.style.setProperty('--color-nocturn-accent', c.accent)
    root.style.setProperty('--color-nocturn-accent-bright', c.accentGlow || c.accent)
    root.style.setProperty('--color-nocturn-text', c.text)
    root.style.setProperty('--color-nocturn-muted', c.textSecondary)
    root.style.setProperty('--color-nocturn-border', c.border)
    root.style.setProperty('--color-overdue', c.overdue || '#EF4444')
    root.style.setProperty('--color-today', c.today || '#3B82F6')
    root.style.setProperty('--color-tomorrow', c.tomorrow || '#EAB308')
    root.style.setProperty('--color-future', c.future || c.accent || '#00E676')

    // Quiet Luxury Design Tokens
    root.style.setProperty('--canvas', c.background || '#07070a')
    root.style.setProperty('--card', c.surface || '#11131a')
    root.style.setProperty('--surface', c.elevated || '#161924')
    root.style.setProperty('--accent', c.accent || '#6366F1')
    root.style.setProperty('--theme-accent', c.accent || '#6366F1')
    root.style.setProperty('--glow', `rgba(${accentRgb}, 0.35)`)
    root.style.setProperty('--text-primary', c.text || '#F5F6FA')
    root.style.setProperty('--text-secondary', c.textSecondary || '#9CA3B0')
    root.style.setProperty('--elev-focus', `0 0 0 1px ${c.accent}, 0 0 32px rgba(${accentRgb}, 0.35)`)
  }, [activeTheme])

  // 1. Apply Theme — changes theme immediately locally, then persists to Supabase
  const applyTheme = async (themeObj) => {
    if (!themeObj?.id) return
    const cleanId = String(themeObj.id).replace(/^preset-/, '')

    await db.themeSettings.put({
      id: 'active',
      activeThemeId: cleanId,
      customColors: null,
    })

    if (user?.id && !isRealtimeWrite()) {
      await upsertUserSettings(user.id, { activeThemeId: cleanId })
    }
  }

  // 2. Preview Custom Colors without saving immediately
  const previewCustomColors = async (customColors) => {
    await db.themeSettings.put({
      id: 'active',
      activeThemeId: activeTheme.id,
      customColors: customColors,
    })
  }

  // 3. Save Custom Theme (Create or Update)
  const saveCustomTheme = async (name, colors, existingId = null) => {
    const now = new Date().toISOString()
    const trimmedName = (name || '').trim()
    if (!trimmedName) return null

    // Updating an existing theme by ID
    if (existingId && !existingId.startsWith('preset-')) {
      const updatedTheme = {
        id: existingId,
        userId: user?.id || null,
        name: trimmedName,
        isPreset: false,
        colors,
        updatedAt: now,
      }
      await db.themes.update(existingId, {
        name: trimmedName,
        colors,
        updatedAt: now,
      })
      await applyTheme(updatedTheme)

      if (user?.id && !isRealtimeWrite()) {
        const savedRemote = await upsertUserThemeRemote(updatedTheme, user.id)
        if (savedRemote && savedRemote.id !== existingId) {
          await db.themes.delete(existingId)
          await db.themes.put(savedRemote)
          await applyTheme(savedRemote)
          return savedRemote.id
        }
      }
      return existingId
    }

    // Creating new theme: check if a custom theme with this name already exists in Dexie
    const allCurrentThemes = await db.themes.toArray()
    const existingByName = allCurrentThemes.find(
      (t) => !t.isPreset && t.name.toLowerCase() === trimmedName.toLowerCase()
    )

    const targetId = existingByName ? existingByName.id : crypto.randomUUID()
    const themeRecord = {
      id: targetId,
      name: trimmedName,
      isPreset: false,
      userId: user?.id || null,
      colors,
      createdAt: existingByName?.createdAt || now,
      updatedAt: now,
    }

    await db.themes.put(themeRecord)
    await applyTheme(themeRecord)

    if (user?.id && !isRealtimeWrite()) {
      const savedRemote = await upsertUserThemeRemote(themeRecord, user.id)
      if (savedRemote && savedRemote.id !== targetId) {
        await db.themes.delete(targetId)
        await db.themes.put(savedRemote)
        await applyTheme(savedRemote)
        return savedRemote.id
      }
    }
    return targetId
  }

  // 4. Delete Saved Theme
  const deleteSavedTheme = async (themeId) => {
    const target = await db.themes.get(themeId)
    if (!target || target.isPreset) return

    await db.themes.delete(themeId)

    if (user?.id && !isRealtimeWrite()) {
      await deleteUserThemeRemote(themeId, user.id)
    }

    // If deleting active theme, fall back to default Nocturn Green
    if (activeTheme.id === themeId) {
      await applyTheme(DEFAULT_NOCTURN_THEME)
    }
  }

  // 5. Apply Theme Preset (v3 7-preset instant switch)
  const applyThemePreset = async (presetKey) => {
    const cleanKey = String(presetKey).replace(/^preset-/, '')
    setActivePreset(cleanKey)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', cleanKey)
      try {
        localStorage.setItem('nocturn_theme_preset', cleanKey)
      } catch {
        // ignore localStorage error
      }
    }
    const matched = PRESET_THEMES.find((p) => p.id === cleanKey || p.id === `preset-${cleanKey}`) || DEFAULT_NOCTURN_THEME
    if (matched) {
      await applyTheme({
        ...matched,
        id: cleanKey,
      })
    }
  }

  // 6. Reset to Default Nocturn Theme
  const resetToNocturn = async () => {
    await applyThemePreset('indigo')
    await applyTheme(DEFAULT_NOCTURN_THEME)
  }

  // 7. Set and Persist UI Style ('normal' | 'angular')
  const setUiStyle = async (newStyle) => {
    const validStyle = newStyle === 'angular' ? 'angular' : 'normal'
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-ui-style', validStyle)
    }

    const currentPrefs = (await db.userSettings.get('preferences')) || {}
    const nowIso = new Date().toISOString()
    await db.userSettings.put({
      ...currentPrefs,
      id: 'preferences',
      uiStyle: validStyle,
      updatedAt: nowIso,
    })

    if (user?.id && !isRealtimeWrite()) {
      await upsertUserSettings(user.id, { uiStyle: validStyle })
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nocturn:ui-style-changed', { detail: { uiStyle: validStyle } })
      )
    }
  }

  return (
    <ThemeContext.Provider
      value={{
        activeTheme,
        activePreset,
        applyThemePreset,
        v3Presets: V3_THEME_PRESETS,
        presetThemes,
        savedThemes,
        applyTheme,
        previewCustomColors,
        saveCustomTheme,
        deleteSavedTheme,
        resetToNocturn,
        uiStyle,
        setUiStyle,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
