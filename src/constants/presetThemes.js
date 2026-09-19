/**
 * Nocturn Preset Themes Configuration
 * Shared theme objects ready for database persistence.
 * Calm Premium Productivity Palette
 */

export const DEFAULT_NOCTURN_THEME = {
  id: 'preset-nocturn-green', // Preserved for database backward compatibility
  name: 'Nocturn Obsidian',
  isPreset: true,
  userId: null,
  colors: {
    background: '#090A0C',
    surface: '#121418',
    elevated: '#16191F',
    accent: '#6366F1',
    accentGlow: '#818CF8',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    border: 'rgba(255, 255, 255, 0.08)',
    overdue: '#EF4444',
    today: '#6366F1',
    tomorrow: '#F59E0B',
    future: '#10B981',
  },
}

export const PRESET_THEMES = [
  DEFAULT_NOCTURN_THEME,
  {
    id: 'preset-warm-amber',
    name: 'Warm Amber',
    isPreset: true,
    userId: null,
    colors: {
      background: '#0C0A09',
      surface: '#141210',
      elevated: '#1C1917',
      accent: '#F59E0B',
      accentGlow: '#FBBF24',
      text: '#FAF8F5',
      textSecondary: '#A8A29E',
      border: 'rgba(255, 255, 255, 0.08)',
      overdue: '#EF4444',
      today: '#F59E0B',
      tomorrow: '#FBBF24',
      future: '#10B981',
    },
  },
  {
    id: 'preset-midnight-blue',
    name: 'Midnight Slate',
    isPreset: true,
    userId: null,
    colors: {
      background: '#090D16',
      surface: '#0F172A',
      elevated: '#1E293B',
      accent: '#38BDF8',
      accentGlow: '#7DD3FC',
      text: '#F8FAFC',
      textSecondary: '#94A3B8',
      border: 'rgba(255, 255, 255, 0.08)',
      overdue: '#EF4444',
      today: '#38BDF8',
      tomorrow: '#FBBF24',
      future: '#10B981',
    },
  },
  {
    id: 'preset-sage-earth',
    name: 'Sage Minimal',
    isPreset: true,
    userId: null,
    colors: {
      background: '#080C0A',
      surface: '#101713',
      elevated: '#17221C',
      accent: '#10B981',
      accentGlow: '#34D399',
      text: '#F8FAFC',
      textSecondary: '#94A3B8',
      border: 'rgba(255, 255, 255, 0.08)',
      overdue: '#EF4444',
      today: '#10B981',
      tomorrow: '#F59E0B',
      future: '#10B981',
    },
  },
]

