import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Palette,
  Check,
  RotateCcw,
  Save,
  Trash2,
  Edit2,
  Plus,
  Sparkles,
  X,
  AlertCircle,
} from 'lucide-react'
import { useTheme } from '../../context/useTheme'

export default function ThemeSettingsCard() {
  const {
    activeTheme,
    presetThemes,
    savedThemes,
    applyTheme,
    previewCustomColors,
    saveCustomTheme,
    deleteSavedTheme,
    resetToNocturn,
  } = useTheme()

  const [isEditing, setIsEditing] = useState(false)
  const [editingThemeId, setEditingThemeId] = useState(null)
  const [themeNameInput, setThemeNameInput] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [deletingThemeId, setDeletingThemeId] = useState(null)

  // Color editor state
  const [customColors, setCustomColors] = useState(() => ({
    background: activeTheme?.colors?.background || '#000000',
    surface: activeTheme?.colors?.surface || '#0B120D',
    elevated: activeTheme?.colors?.elevated || '#101A13',
    accent: activeTheme?.colors?.accent || '#00E676',
    accentGlow: activeTheme?.colors?.accentGlow || '#69F0AE',
    text: activeTheme?.colors?.text || '#FFFFFF',
    textSecondary: activeTheme?.colors?.textSecondary || '#A7B3AA',
    border: activeTheme?.colors?.border || '#18261C',
    overdue: activeTheme?.colors?.overdue || '#EF4444',
    today: activeTheme?.colors?.today || '#3B82F6',
    tomorrow: activeTheme?.colors?.tomorrow || '#EAB308',
    future: activeTheme?.colors?.future || '#00E676',
  }))

  const handleColorChange = (key, value) => {
    const updated = { ...customColors, [key]: value }
    setCustomColors(updated)
    previewCustomColors(updated)
  }

  const handleStartCreate = () => {
    setEditingThemeId(null)
    setThemeNameInput('')
    const initialColors = activeTheme?.colors ? { ...activeTheme.colors } : customColors
    setCustomColors(initialColors)
    setIsEditing(true)
  }

  const handleStartEdit = (savedTheme) => {
    setEditingThemeId(savedTheme.id)
    setThemeNameInput(savedTheme.name)
    setCustomColors({ ...savedTheme.colors })
    previewCustomColors(savedTheme.colors)
    setIsEditing(true)
  }

  const handleSaveSubmit = async (e) => {
    e.preventDefault()
    if (!themeNameInput.trim()) return

    await saveCustomTheme(themeNameInput.trim(), customColors, editingThemeId)
    setShowSaveModal(false)
    setIsEditing(false)
    setEditingThemeId(null)
  }

  const handleConfirmDelete = async () => {
    if (deletingThemeId) {
      await deleteSavedTheme(deletingThemeId)
      setDeletingThemeId(null)
    }
  }

  const handleConfirmReset = async () => {
    await resetToNocturn()
    setShowResetConfirm(false)
    setIsEditing(false)
  }

  return (
    <div className="nocturn-card p-5 sm:p-6 border border-nocturn-border space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-nocturn-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent shrink-0">
            <Palette className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Customize Theme
            </h2>
            <p className="text-xs text-nocturn-muted">
              Personalize colors, accents, and deadline indicators across Nocturn.
            </p>
          </div>
        </div>

        {/* Reset to Nocturn CTA */}
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="nocturn-btn-secondary py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Nocturn</span>
        </button>
      </div>

      {/* Current Active Theme Banner */}
      <div className="p-4 rounded-2xl bg-nocturn-surface border border-nocturn-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-semibold text-nocturn-muted">Active Theme:</span>
          <span className="text-sm font-bold text-white truncate flex items-center gap-2">
            <span>{activeTheme.name}</span>
            {activeTheme.isPreset ? (
              <span className="text-[10px] bg-nocturn-accent/15 text-nocturn-accent px-2 py-0.5 rounded-full border border-nocturn-accent/30 font-mono">
                Built-in Preset
              </span>
            ) : (
              <span className="text-[10px] bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30 font-mono">
                Saved Theme
              </span>
            )}
          </span>
        </div>

        {/* Swatch chips */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: activeTheme.colors?.background }} title="Background" />
          <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: activeTheme.colors?.surface }} title="Surface" />
          <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: activeTheme.colors?.accent }} title="Accent" />
          <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: activeTheme.colors?.overdue || '#EF4444' }} title="Overdue Red" />
          <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: activeTheme.colors?.today || '#3B82F6' }} title="Today Blue" />
          <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: activeTheme.colors?.tomorrow || '#EAB308' }} title="Tomorrow Yellow" />
          <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: activeTheme.colors?.future || '#00E676' }} title="Future Green" />
        </div>
      </div>

      {/* Preset Themes Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-nocturn-muted flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-nocturn-accent" />
          <span>Preset Themes</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {presetThemes.map((preset) => {
            const isActive = activeTheme.id === preset.id

            return (
              <motion.button
                key={preset.id}
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => applyTheme(preset)}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-nocturn-surface border-nocturn-accent shadow-[0_0_16px_rgba(0,230,118,0.2)] ring-1 ring-nocturn-accent'
                    : 'bg-nocturn-surface/50 border-nocturn-border/80 hover:border-nocturn-accent/35'
                }`}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-sm font-bold text-white truncate">
                    {preset.name}
                  </span>
                  {isActive && (
                    <span className="w-5 h-5 rounded-full bg-nocturn-accent text-black flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-lg border border-white/20" style={{ backgroundColor: preset.colors.background }} title="Background" />
                  <span className="w-5 h-5 rounded-lg border border-white/20" style={{ backgroundColor: preset.colors.surface }} title="Surface" />
                  <span className="w-5 h-5 rounded-lg border border-white/20" style={{ backgroundColor: preset.colors.elevated }} title="Elevated" />
                  <span className="w-5 h-5 rounded-lg border border-white/20" style={{ backgroundColor: preset.colors.accent }} title="Accent" />
                  <span className="w-5 h-5 rounded-lg border border-white/20 ml-auto" style={{ backgroundColor: preset.colors.text }} title="Text" />
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Saved Custom Themes Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-nocturn-muted">
            Saved Custom Themes ({savedThemes.length})
          </h3>
          <button
            type="button"
            onClick={handleStartCreate}
            className="text-xs font-semibold text-nocturn-accent hover:text-nocturn-accent-bright inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Custom Theme</span>
          </button>
        </div>

        {savedThemes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {savedThemes.map((theme) => {
                const isActive = activeTheme.id === theme.id

                return (
                  <motion.div
                    key={theme.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                      isActive
                        ? 'bg-nocturn-surface border-nocturn-accent shadow-[0_0_16px_rgba(0,230,118,0.2)]'
                        : 'bg-nocturn-surface/50 border-nocturn-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-white truncate">
                        {theme.name}
                      </span>
                      {isActive && (
                        <span className="text-[10px] bg-nocturn-accent/15 text-nocturn-accent font-semibold px-2 py-0.5 rounded-full border border-nocturn-accent/30">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.colors.background }} />
                      <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.colors.surface }} />
                      <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.colors.accent }} />
                      <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.colors.overdue || '#EF4444' }} />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-nocturn-border/50">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => applyTheme(theme)}
                          className="px-2.5 py-1 rounded-lg bg-nocturn-accent/15 text-nocturn-accent text-xs font-semibold border border-nocturn-accent/30 hover:bg-nocturn-accent/25 cursor-pointer"
                        >
                          Apply
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(theme)}
                        className="p-1 rounded-lg text-nocturn-muted hover:text-white hover:bg-nocturn-surface cursor-pointer"
                        title="Edit Theme"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingThemeId(theme.id)}
                        className="p-1 rounded-lg text-nocturn-muted hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                        title="Delete Theme"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        ) : (
          <p className="text-xs text-nocturn-muted italic">
            No custom themes saved yet. Click "Create Custom Theme" to design your own palette.
          </p>
        )}
      </div>

      {/* Custom Theme Editor Card */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 sm:p-5 rounded-2xl bg-nocturn-surface border border-nocturn-accent/40 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-nocturn-border pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-nocturn-accent" />
              <span>{editingThemeId ? 'Edit Saved Theme' : 'Design Custom Palette'}</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-1 text-nocturn-muted hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { key: 'background', label: 'Background' },
              { key: 'surface', label: 'Surface / Card' },
              { key: 'elevated', label: 'Elevated Surface' },
              { key: 'accent', label: 'Accent Color' },
              { key: 'accentGlow', label: 'Accent Glow' },
              { key: 'text', label: 'Primary Text' },
              { key: 'textSecondary', label: 'Secondary Text' },
              { key: 'border', label: 'Border Color' },
              { key: 'overdue', label: 'Overdue (Red)' },
              { key: 'today', label: 'Due Today (Blue)' },
              { key: 'tomorrow', label: 'Due Tomorrow (Yellow)' },
              { key: 'future', label: 'Future (Green)' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-nocturn-card border border-nocturn-border">
                <span className="text-xs font-medium text-white truncate">{label}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="color"
                    value={customColors[key] || '#000000'}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customColors[key] || '#000000'}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="w-16 bg-nocturn-surface border border-nocturn-border rounded-md px-1.5 py-0.5 text-[11px] font-mono text-white text-center uppercase"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-nocturn-border">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-xl bg-nocturn-surface text-nocturn-muted text-xs font-medium hover:text-white border border-nocturn-border cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              className="nocturn-btn-primary py-1.5 px-4 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-black" />
              <span>Save Theme</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Save Theme Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md p-5 sm:p-6 rounded-2xl bg-nocturn-card border border-nocturn-border space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">Save Custom Theme</h3>
            <form onSubmit={handleSaveSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-nocturn-muted font-medium block mb-1">
                  Theme Name
                </label>
                <input
                  type="text"
                  value={themeNameInput}
                  onChange={(e) => setThemeNameInput(e.target.value)}
                  placeholder="e.g. Forest, Cyberpunk, Obsidian"
                  autoFocus
                  required
                  className="w-full nocturn-input text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 rounded-xl bg-nocturn-surface text-nocturn-muted text-xs font-semibold hover:text-white border border-nocturn-border cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!themeNameInput.trim()}
                  className="nocturn-btn-primary py-2 px-5 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Save Theme
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingThemeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm p-5 rounded-2xl bg-nocturn-card border border-nocturn-border space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6 stroke-[2]" />
              <h3 className="text-base font-bold text-white">Delete Theme?</h3>
            </div>
            <p className="text-xs text-nocturn-muted leading-relaxed">
              Are you sure you want to delete this custom theme? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingThemeId(null)}
                className="px-3.5 py-1.5 rounded-xl bg-nocturn-surface text-nocturn-muted text-xs font-semibold border border-nocturn-border cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-xl bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/40 hover:bg-red-500/30 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm p-5 rounded-2xl bg-nocturn-card border border-nocturn-border space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-nocturn-accent">
              <RotateCcw className="w-6 h-6 stroke-[2]" />
              <h3 className="text-base font-bold text-white">Reset to Nocturn Green?</h3>
            </div>
            <p className="text-xs text-nocturn-muted leading-relaxed">
              This will restore the active theme back to standard Nocturn Green. Your saved themes will remain safe.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl bg-nocturn-surface text-nocturn-muted text-xs font-semibold border border-nocturn-border cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="nocturn-btn-primary py-1.5 px-4 text-xs font-semibold cursor-pointer"
              >
                Reset Theme
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
