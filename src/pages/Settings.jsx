import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  Bell,
  User,
  LogOut,
  Keyboard,
  RotateCcw,
} from 'lucide-react'
import PreferenceCard from '../components/settings/PreferenceCard'
import VocabSettingsCard from '../components/settings/VocabSettingsCard'
import ThemeSettingsCard from '../components/settings/ThemeSettingsCard'
import IntegrationCard from '../components/settings/IntegrationCard'
import SupabaseConnectionCard from '../components/settings/SupabaseConnectionCard'
import SyncDiagnosticsCard from '../components/settings/SyncDiagnosticsCard'
import DataManagementCard from '../components/settings/DataManagementCard'
import NotificationSettingsCard from '../components/settings/NotificationSettingsCard'
import { Card, Badge, Button, Tabs } from '../components/ui'
import { useAuth } from '../context/useAuth'

const VALID_TABS = ['all', 'appearance', 'focus', 'notifications', 'sync', 'account', 'data']

function normalizeTab(raw) {
  if (!raw) return 'all'
  const lower = String(raw).toLowerCase().trim()
  if (lower === 'theme' || lower === 'themes') return 'appearance'
  if (lower === 'timer' || lower === 'focus' || lower === 'learning') return 'focus'
  if (lower === 'notif' || lower === 'notifications' || lower === 'sound' || lower === 'sounds') return 'notifications'
  if (lower === 'cloud' || lower === 'sync') return 'sync'
  if (lower === 'account' || lower === 'profile' || lower === 'user') return 'account'
  if (lower === 'data' || lower === 'backup' || lower === 'integrations') return 'data'
  if (VALID_TABS.includes(lower)) return lower
  return 'all'
}

export default function Settings() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, signOut } = useAuth()

  const rawTab = searchParams.get('tab') || searchParams.get('category')
  const activeCategory = useMemo(() => normalizeTab(rawTab), [rawTab])

  const handleTabChange = (newTab) => {
    setSearchParams(newTab === 'all' ? {} : { tab: newTab }, { replace: true })
  }

  const categoryTabs = [
    { id: 'all', label: 'All', icon: Sliders },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'focus', label: 'Focus & Timer', icon: Timer },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'sync', label: 'Cloud & Sync', icon: RefreshCw },
    { id: 'account', label: 'Account', icon: User },
    { id: 'data', label: 'Data & Backup', icon: Database },
  ]

  const showAll = activeCategory === 'all'
  const showAppearance = showAll || activeCategory === 'appearance'
  const showFocus = showAll || activeCategory === 'focus'
  const showNotifications = showAll || activeCategory === 'notifications'
  const showSync = showAll || activeCategory === 'sync'
  const showAccount = showAll || activeCategory === 'account'
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
            onChange={handleTabChange}
            size="sm"
          />
        </div>
      </header>

      {/* 1. Appearance & Theme Section */}
      {showAppearance && (
        <section className="space-y-5">
          <div className="border-b border-white/[0.06] pb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-nocturn-muted">
              Appearance & Layout
            </h2>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('nocturn_theme')
                localStorage.removeItem('nocturn_ui_style')
                window.location.reload()
              }}
              className="text-[11px] text-nocturn-muted hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              title="Reset appearance to default"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to default</span>
            </button>
          </div>

          <PreferenceCard />
          <ThemeSettingsCard />

          {/* Keyboard Shortcuts Placeholder */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-nocturn-muted px-0.5">
                Keyboard Shortcuts
              </h3>
              <span className="text-[10px] uppercase font-bold text-nocturn-accent bg-nocturn-accent/10 px-2 py-0.5 rounded-full border border-nocturn-accent/20">
                Coming soon
              </span>
            </div>
            <Card className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-accent shrink-0">
                  <Keyboard className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <span className="text-sm sm:text-base font-semibold text-white block">
                    Custom Shortcuts System
                  </span>
                  <span className="text-xs text-nocturn-muted block mt-0.5">
                    Global keyboard shortcuts have been disabled. Active shortcut: Spacebar on Timer. Custom keybindings are coming in a future release.
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-medium text-nocturn-muted bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.06] shrink-0">
                Spacebar · Timer
              </span>
            </Card>
          </div>
        </section>
      )}

      {/* 2. Focus & Timer Section */}
      {showFocus && (
        <section className="space-y-5">
          <div className="border-b border-white/[0.06] pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-nocturn-muted">
              Focus & Timer
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

          <VocabSettingsCard />
        </section>
      )}

      {/* 3. Notifications & Audio Alerts Section */}
      {showNotifications && (
        <section className="space-y-5">
          <div className="border-b border-white/[0.06] pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-nocturn-muted">
              Notifications & Sound
            </h2>
          </div>

          <NotificationSettingsCard />
        </section>
      )}

      {/* 4. Cloud & Synchronization Section */}
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

      {/* 5. Account & Session Section */}
      {showAccount && (
        <section className="space-y-5">
          <div className="border-b border-white/[0.06] pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-nocturn-muted">
              Account & Security
            </h2>
          </div>

          <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nocturn-accent shrink-0">
                <User className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-semibold text-white block">
                    {user?.is_anonymous || !user?.email || user?.id === 'guest-local-user'
                      ? 'Local Guest Session'
                      : user.email}
                  </span>
                  <Badge variant={user?.email && !user?.is_anonymous ? 'accent' : 'neutral'} size="sm">
                    {user?.email && !user?.is_anonymous ? 'Cloud Connected' : 'Offline / Local'}
                  </Badge>
                </div>
                <span className="text-xs text-nocturn-muted block">
                  {user?.email && !user?.is_anonymous
                    ? 'Your preferences and tasks are securely synchronized with Supabase.'
                    : 'Running in private offline mode. Connect an account to sync across devices.'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/profile')}
                icon={ArrowRight}
              >
                View Profile
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut()
                  navigate('/auth')
                }}
                icon={LogOut}
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
              >
                Sign Out
              </Button>
            </div>
          </Card>
        </section>
      )}

      {/* 6. Data & Backups Section */}
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
