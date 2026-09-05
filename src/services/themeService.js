import { db } from '../db/db'
import { DEFAULT_NOCTURN_THEME, PRESET_THEMES } from '../constants/presetThemes'

export async function getThemes() {
  try {
    const themes = await db.themes.toArray()
    return themes.length > 0 ? themes : PRESET_THEMES
  } catch (err) {
    console.error('themeService.getThemes failed:', err)
    return PRESET_THEMES
  }
}

export async function getActiveThemeSetting() {
  try {
    return await db.themeSettings.get('active')
  } catch (err) {
    console.error('themeService.getActiveThemeSetting failed:', err)
    return null
  }
}

export async function applyTheme(themeObj) {
  try {
    await db.themeSettings.put({
      id: 'active',
      activeThemeId: themeObj.id,
      customColors: null,
    })
  } catch (err) {
    console.error('themeService.applyTheme failed:', err)
    throw err
  }
}

export async function saveTheme(name, colors, existingId = null) {
  try {
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
  } catch (err) {
    console.error('themeService.saveTheme failed:', err)
    throw err
  }
}

export async function deleteTheme(themeId) {
  try {
    const target = await db.themes.get(themeId)
    if (!target || target.isPreset) return

    await db.themes.delete(themeId)

    const activeSetting = await db.themeSettings.get('active')
    if (activeSetting?.activeThemeId === themeId) {
      await applyTheme(DEFAULT_NOCTURN_THEME)
    }
  } catch (err) {
    console.error('themeService.deleteTheme failed:', err)
    throw err
  }
}
