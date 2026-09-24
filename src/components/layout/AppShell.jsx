import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import BottomNav from './BottomNav'
import SidebarNav from './SidebarNav'
import TopBar from './TopBar'
import NotificationBell from '../common/NotificationBell'
import SyncStatusIndicator from '../common/SyncStatusIndicator'
import RouteErrorBoundary from '../common/RouteErrorBoundary'
import PersistentMiniTimer from '../timer/PersistentMiniTimer'
import { pageEnter } from '../../utils/motion'

export default function AppShell() {
  const location = useLocation()

  return (
    <div className="h-screen min-h-[100dvh] lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-[#07070a] text-nocturn-text antialiased selection:bg-nocturn-accent/30 selection:text-white">
      {/* Desktop Sidebar Navigation */}
      <SidebarNav />

      {/* Scrollable Main Content Area for Desktop & Mobile */}
      <div className="nocturn-scroll-container flex-1 flex flex-col min-w-0 h-full overflow-y-auto w-full">
        {/* Mobile Top Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#0b0c12]/80 backdrop-blur-md sticky top-0 z-30 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display text-sm font-bold tracking-tight text-white">Nocturn</span>
            <SyncStatusIndicator compact />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell />
          </div>
        </header>

        {/* Desktop Top Bar with dynamic blur on scroll */}
        <div className="hidden lg:block">
          <TopBar />
        </div>

        <main className="w-full max-w-7xl xl:max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-10 xl:px-12 pt-4 sm:pt-6 lg:pt-8 pb-28 lg:pb-12 flex-1 flex flex-col">
          <motion.div
            key={location.pathname}
            variants={pageEnter}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full flex-1 flex flex-col"
          >
            <RouteErrorBoundary>
              <Outlet />
            </RouteErrorBoundary>
          </motion.div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Persistent Floating Mini-Timer Widget (outside of /timer) */}
      <PersistentMiniTimer />
    </div>
  )
}
