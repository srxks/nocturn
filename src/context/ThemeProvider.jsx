import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ensureSeedData } from '../db/db'
import { ThemeContext } from './ThemeContext'
import { DEFAULT_NOCTURN_THEME, PRESET_THEMES } from '../constants/presetThemes'

export function ThemeProvider({ children }) {
  useEffect(() => {
    ensureSeedData()
  }, [])

  // Dexie live queries for themes and active theme settings
  const dbThemes = useLiveQuery(async () => {
    return await db.themes.toArray()
  }, [])

  const activeThemeSetting = useLiveQuery(async () => {
    return await db.themeSettings.get('active')
  }, [])

  // Separate preset themes vs user custom themes
  const allThemes = dbThemes && dbThemes.length > 0 ? dbThemes : PRESET_THEMES
  const presetThemes = allThemes.filter((t) => t.isPreset)
  const savedThemes = allThemes.filter((t) => !t.isPreset)

  // Resolve current active theme object
  const activeThemeId = activeThemeSetting?.activeThemeId || DEFAULT_NOCTURN_THEME.id
  let activeTheme = allThemes.find((t) => t.id === activeThemeId) || DEFAULT_NOCTURN_THEME

  // If custom colors were temporarily applied
  if (activeThemeSetting?.customColors) {
    activeTheme = {
      ...activeTheme,
      colors: {
        ...activeTheme.colors,
        ...activeThemeSetting.customColors,
      },
    }
  }

  // Apply CSS variables dynamically to document root
  useEffect(() => {
    if (!activeTheme || !activeTheme.colors) return

    const root = document.documentElement
    const c = activeTheme.colors

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
  }, [activeTheme])

  // 1. Apply Theme
  const applyTheme = async (themeObj) => {
    await db.themeSettings.put({
      id: 'active',
      activeThemeId: themeObj.id,
      customColors: null,
    })
  }

  // 2. Preview Custom Colors in Live Realtime without persisting immediately
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

    if (existingId && !existingId.startsWith('preset-')) {
      await db.themes.update(existingId, {
        name,
        colors,
        updatedAt: now,
      })
      await applyTheme({ id: existingId, name, colors })
      return existingId
    }

    const newId = `theme-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const newTheme = {
      id: newId,
      name,
      isPreset: false,
      userId: null, // Ready for future backend sync
      colors,
      createdAt: now,
      updatedAt: now,
    }

    await db.themes.add(newTheme)
    await applyTheme(newTheme)
    return newId
  }

  // 4. Delete Saved Theme
  const deleteSavedTheme = async (themeId) => {
    const target = await db.themes.get(themeId)
    if (!target || target.isPreset) return // Prevent deleting built-in presets

    await db.themes.delete(themeId)

    // If deleting active theme, fall back to Nocturn Green
    if (activeTheme.id === themeId) {
      await applyTheme(DEFAULT_NOCTURN_THEME)
    }
  }

  // 5. Reset to Default Nocturn Theme
  const resetToNocturn = async () => {
    await applyTheme(DEFAULT_NOCTURN_THEME)
  }

  return (
    <ThemeContext.Provider
      value={{
        activeTheme,
        presetThemes,
        savedThemes,
        applyTheme,
        previewCustomColors,
        saveCustomTheme,
        deleteSavedTheme,
        resetToNocturn,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
