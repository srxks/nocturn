import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Palette,
  Timer,
  RefreshCw,
  Database,
  Sliders,
  CheckSquare,
  ListTodo,
  Info,
  ArrowRight,
} from 'lucide-react'
import PreferenceCard from '../components/settings/PreferenceCard'
import UiStyleSettingsCard from '../components/settings/UiStyleSettingsCard'
import VocabSettingsCard from '../components/settings/VocabSettingsCard'
import ThemeSettingsCard from '../components/settings/ThemeSettingsCard'
import IntegrationCard from '../components/settings/IntegrationCard'
import SupabaseConnectionCard from '../components/settings/SupabaseConnectionCard'
import SyncDiagnosticsCard from '../components/settings/SyncDiagnosticsCard'
import DataManagementCard from '../components/settings/DataManagementCard'
import NotificationSettingsCard from '../components/settings/NotificationSettingsCard'
import { Card, Badge, Button, Tabs } from '../components/ui'

export default function Settings() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')

  const categoryTabs = [
    { id: 'all', label: 'All', icon: Sliders },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'focus', label: 'Focus & Learning', icon: Timer },
    { id: 'sync', label: 'Cloud & Sync', icon: RefreshCw },
    { id: 'data', label: 'Data & Integrations', icon: Database },
  ]

  const showAll = activeCategory === 'all'
  const showAppearance = showAll || activeCategory === 'appearance'
  const showFocus = showAll || activeCategory === 'focus'
  const showSync = showAll || activeCategory === 'sync'
  const showData = showAll || activeCategory === 'data'

  return (
    <div className="w-full space-y-6 sm:space-y-8 pb-12">
      {/* Header Section */}
      <header className="space-y-3 sm:space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              Settings
            </h1>
            <Badge variant="neutral" size="sm">
              Preferences
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-nocturn-muted">
            Configure appearance, focus intervals, offline sync, and data backups.
          </p>
        </div>

        {/* Category Navigation Tabs */}
        <div className="overflow-x-auto pb-1 no-scrollbar">
          <Tabs
            tabs={categoryTabs}
            activeTab={activeCategory}
            onChange={setActiveCategory}
            size="sm"
          />
        </div>
      </header>

      {/* 1. Appearance & Theme Section */}
      {showAppearance && (
        <section className="space-y-5">
          <div className="border-b border-white/[0.06] pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-nocturn-muted">
              Appearance & Layout
            </h2>
          </div>

          <UiStyleSettingsCard />
          <PreferenceCard />
          <ThemeSettingsCard />
        </section>
      )}

      {/* 2. Focus & Learning Section */}
      {showFocus && (
        <section className="space-y-5">
          <div className="border-b border-white/[0.06] pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-nocturn-muted">
              Focus & Learning
            </h2>
          </div>

          {/* Focus Timer Configuration Link Card */}
          <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-accent shrink-0">
                <Timer className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="text-sm sm:text-base font-semibold text-white block">
                  Focus Timer & Cycles
                </span>
                <span className="text-xs text-nocturn-muted block mt-0.5">
                  Configure work intervals, short breaks, long breaks, and auto-start rules.
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/timer-settings')}
              icon={ArrowRight}
              className="self-start sm:self-auto shrink-0"
            >
              Configure Timer
            </Button>
          </Card>

          <NotificationSettingsCard />
          <VocabSettingsCard />
        </section>
      )}

      {/* 3. Cloud & Synchronization Section */}
      {showSync && (
        <section className="space-y-5">
          <div className="border-b border-white/[0.06] pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-nocturn-muted">
              Cloud & Synchronization
            </h2>
          </div>

          <SupabaseConnectionCard />
          <SyncDiagnosticsCard />
        </section>
      )}

      {/* 4. Data & Backups Section */}
      {showData && (
        <section className="space-y-5">
          <div className="border-b border-white/[0.06] pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-nocturn-muted">
              Data & Integrations
            </h2>
          </div>

          <DataManagementCard />

          {/* Integrations */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-nocturn-muted px-0.5">
              External Task Services
            </h3>
            <div className="space-y-2.5">
              <IntegrationCard
                title="Google Tasks"
                description="Connect and two-way sync your Google Tasks"
                icon={CheckSquare}
              />
              <IntegrationCard
                title="Microsoft To Do"
                description="Connect and import lists from Microsoft To Do"
                icon={ListTodo}
              />
            </div>
          </div>

          {/* About Application Card */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-nocturn-muted px-0.5">
              About
            </h3>
            <Card className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-accent shrink-0">
                  <Info className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <span className="text-sm sm:text-base font-semibold text-white block">
                    Nocturn
                  </span>
                  <span className="text-xs text-nocturn-muted block">
                    Calm, high-performance productivity workspace.
                  </span>
                </div>
              </div>

              <span className="text-xs font-mono font-medium text-nocturn-muted bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.06]">
                v1.0.0
              </span>
            </Card>
          </div>
        </section>
      )}
    </div>
  )
}
