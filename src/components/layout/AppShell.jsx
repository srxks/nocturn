import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import BottomNav from './BottomNav'
import SidebarNav from './SidebarNav'
import CommandPaletteModal from '../common/CommandPaletteModal'
import ShortcutsHelpModal from '../common/ShortcutsHelpModal'
import NotificationBell from '../common/NotificationBell'
import SyncStatusIndicator from '../common/SyncStatusIndicator'
import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts'

export default function AppShell() {
  const location = useLocation()
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false)

  useGlobalShortcuts({
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isShortcutsHelpOpen,
    setIsShortcutsHelpOpen,
  })

  return (
    <div className="h-screen min-h-[100dvh] lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-nocturn-bg text-nocturn-text antialiased selection:bg-nocturn-accent/30 selection:text-white">
      {/* Desktop Sidebar Navigation */}
      <SidebarNav
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
      />

      {/* Scrollable Main Content Area for Desktop & Mobile */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto w-full">
        {/* Mobile Top Header with Quick Search trigger, Sync status and Notification Bell */}
        <header className="lg:hidden flex items-center justify-between px-4 py-2.5 border-b border-nocturn-border/60 bg-nocturn-card/80 backdrop-blur-md sticky top-0 z-30 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold tracking-tight text-white">Nocturn</span>
            <SyncStatusIndicator compact />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell />
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-nocturn-border text-xs text-nocturn-muted hover:text-white transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-nocturn-accent" />
              <span>⌘K</span>
            </button>
          </div>
        </header>

        <main className="w-full max-w-7xl xl:max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-10 xl:px-12 pt-6 sm:pt-8 lg:pt-10 pb-28 lg:pb-12 flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full flex-1 flex flex-col"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Global Command Palette & Unified Search Modal */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
      />

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <ShortcutsHelpModal
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />
    </div>
  )
}
