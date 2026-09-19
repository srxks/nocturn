import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * useGlobalShortcuts
 *
 * Provides global hotkeys across the app:
 * - Cmd/Ctrl + K or / : Open Command Palette
 * - ? (Shift + /) : Open Shortcuts Cheatsheet
 * - T : Navigate to Timer
 * - P : Navigate to Plan My Day
 * - V : Navigate to Vocabulary
 * - C : Navigate to Calendar
 * - S : Navigate to Settings
 * - N : Jump to Tasks and focus Add Task input
 */
export function useGlobalShortcuts({
  isCommandPaletteOpen,
  setIsCommandPaletteOpen,
  isShortcutsHelpOpen,
  setIsShortcutsHelpOpen,
}) {
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Check if user is typing inside an editable field
      const activeTag = document.activeElement?.tagName?.toLowerCase()
      const isInput =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        document.activeElement?.isContentEditable

      // 2. Command Palette: Cmd/Ctrl + K (Works everywhere)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
        return
      }

      // 3. Close open modal on Escape
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false)
          return
        }
        if (isShortcutsHelpOpen) {
          setIsShortcutsHelpOpen(false)
          return
        }
      }

      // If typing inside an input/textarea, ignore all single-key shortcuts
      if (isInput) return

      // Don't trigger navigation when modifier keys are pressed (except Shift for ? and specific combos)
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // 4. Quick Search on "/"
      if (e.key === '/') {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
        return
      }

      // 5. Shortcuts Help on "?" (or Shift + /)
      if (e.key === '?') {
        e.preventDefault()
        setIsShortcutsHelpOpen((prev) => !prev)
        return
      }

      // If either modal is currently open, don't trigger background navigation
      if (isCommandPaletteOpen || isShortcutsHelpOpen) return

      // 6. Navigation Shortcuts
      const key = e.key

      if (key === 't' || key === 'T') {
        e.preventDefault()
        navigate('/timer')
      } else if (key === 'p' || key === 'P') {
        e.preventDefault()
        navigate('/plan')
      } else if (key === 'v' || key === 'V') {
        e.preventDefault()
        navigate('/vocab')
      } else if (key === 'c' || key === 'C') {
        e.preventDefault()
        navigate('/calendar')
      } else if (key === 's' || key === 'S') {
        e.preventDefault()
        navigate('/settings')
      } else if (key === 'n' || key === 'N') {
        e.preventDefault()
        navigate('/tasks')
        setTimeout(() => {
          const inputEl = document.querySelector('input[placeholder*="Add a task"]')
          inputEl?.focus()
        }, 80)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    navigate,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isShortcutsHelpOpen,
    setIsShortcutsHelpOpen,
  ])
}
