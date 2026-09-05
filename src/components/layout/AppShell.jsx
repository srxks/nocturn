import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import BottomNav from './BottomNav'
import SidebarNav from './SidebarNav'

export default function AppShell() {
  const location = useLocation()

  return (
    <div className="h-screen min-h-[100dvh] lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-nocturn-bg text-nocturn-text antialiased selection:bg-nocturn-accent selection:text-black">
      {/* Desktop Sidebar Navigation */}
      <SidebarNav />

      {/* Scrollable Main Content Area for Desktop & Mobile */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto w-full">
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
    </div>
  )
}
