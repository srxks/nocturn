import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard, Compass, Zap, CheckSquare } from 'lucide-react'
import { useTheme } from '../../context/useTheme'

const SHORTCUT_GROUPS = [
  {
    title: 'Global & Search',
    icon: Zap,
    shortcuts: [
      { keys: ['⌘', 'K'], altKeys: ['Ctrl', 'K'], label: 'Open Command Palette / Search' },
      { keys: ['/'], label: 'Quick Search' },
      { keys: ['?'], label: 'Open Shortcuts Cheatsheet' },
      { keys: ['Esc'], label: 'Close Active Modal / Palette' },
    ],
  },
  {
    title: 'Navigation',
    icon: Compass,
    shortcuts: [
      { keys: ['T'], label: 'Go to Focus Timer' },
      { keys: ['P'], label: 'Go to Plan My Day' },
      { keys: ['V'], label: 'Go to Vocabulary' },
      { keys: ['C'], label: 'Go to Calendar' },
      { keys: ['S'], label: 'Go to Settings' },
      { keys: ['Shift', 'T'], label: 'Go to Tasks' },
      { keys: ['Shift', 'P'], label: 'Go to Profile' },
    ],
  },
  {
    title: 'Task Actions',
    icon: CheckSquare,
    shortcuts: [
      { keys: ['N'], label: 'Quick Focus New Task Input' },
      { keys: ['↵'], label: 'Submit Task / Execute Action' },
      { keys: ['↑', '↓'], label: 'Navigate Selection in Palette' },
    ],
  },
]

export default function ShortcutsHelpModal({ isOpen, onClose }) {
  const { uiStyle } = useTheme()
  const isAngular = uiStyle === 'angular'
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className={`relative w-full max-w-xl bg-nocturn-card border border-nocturn-border shadow-2xl overflow-hidden z-10 ${
            isAngular ? 'rounded-none angular-chamfer font-mono' : 'rounded-3xl'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-nocturn-border/70 bg-nocturn-surface/50">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl bg-nocturn-accent/15 border border-nocturn-accent/30 flex items-center justify-center text-nocturn-accent ${
                  isAngular ? 'rounded-none' : 'rounded-xl'
                }`}
              >
                <Keyboard className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {isAngular ? '[ KEYBOARD_SHORTCUTS ]' : 'Keyboard Shortcuts'}
                </h3>
                <p className="text-xs text-nocturn-muted">
                  Press keys anywhere outside text inputs
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-nocturn-muted hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {SHORTCUT_GROUPS.map((group) => {
              const GroupIcon = group.icon
              return (
                <section key={group.title} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-nocturn-accent uppercase tracking-wider">
                    <GroupIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{group.title}</span>
                  </div>

                  <div className="space-y-2">
                    {group.shortcuts.map((item) => {
                      const displayKeys = isMac || !item.altKeys ? item.keys : item.altKeys
                      return (
                        <div
                          key={item.label}
                          className={`flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-nocturn-border/50 transition-colors ${
                            isAngular ? 'rounded-none' : 'rounded-xl'
                          }`}
                        >
                          <span className="text-xs text-nocturn-text font-medium">
                            {item.label}
                          </span>
                          <div className="flex items-center gap-1">
                            {displayKeys.map((key) => (
                              <kbd
                                key={key}
                                className={`px-2 py-1 text-[11px] font-mono font-semibold bg-black/60 border border-white/15 text-white shadow-sm ${
                                  isAngular ? 'rounded-none' : 'rounded-md'
                                }`}
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-nocturn-border/60 bg-nocturn-surface/40 flex items-center justify-between text-xs text-nocturn-muted">
            <span>Tip: Press <kbd className="font-mono bg-black/40 px-1.5 py-0.5 rounded border border-white/10">?</kbd> at any time to reopen</span>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-white hover:text-nocturn-accent transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
