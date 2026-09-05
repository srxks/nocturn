import { createContext } from 'react'

export const ThemeContext = createContext({
  activeTheme: null,
  presetThemes: [],
  savedThemes: [],
  applyTheme: () => {},
  saveCustomTheme: () => {},
  deleteSavedTheme: () => {},
  resetToNocturn: () => {},
})
