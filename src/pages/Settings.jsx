import { CheckSquare, ListTodo, Info } from 'lucide-react'
import PreferenceCard from '../components/settings/PreferenceCard'
import VocabSettingsCard from '../components/settings/VocabSettingsCard'
import ThemeSettingsCard from '../components/settings/ThemeSettingsCard'
import IntegrationCard from '../components/settings/IntegrationCard'
import SupabaseConnectionCard from '../components/settings/SupabaseConnectionCard'

export default function Settings() {
  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Header Section */}
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-nocturn-muted">
          Customize your Nocturn experience.
        </p>
      </header>

      {/* Preferences Section */}
      <PreferenceCard />

      {/* Vocabulary Learning Limit */}
      <VocabSettingsCard />

      {/* Customize Theme Section */}
      <ThemeSettingsCard />

      {/* Backend Supabase Section */}
      <SupabaseConnectionCard />

      {/* Integrations Section */}
      <section className="space-y-3">
        <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide px-1">
          Integrations
        </h2>
        <div className="space-y-2.5">
          <IntegrationCard
            title="Google Tasks"
            description="Connect your Google Tasks"
            icon={CheckSquare}
          />
          <IntegrationCard
            title="Microsoft To Do"
            description="Connect your Microsoft To Do"
            icon={ListTodo}
          />
        </div>
      </section>

      {/* About Application Section */}
      <section className="space-y-3">
        <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide px-1">
          About
        </h2>
        <div className="nocturn-card p-5 sm:p-6 border border-nocturn-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-nocturn-surface border border-nocturn-border flex items-center justify-center text-nocturn-accent shrink-0">
              <Info className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold text-white block">
                Nocturn
              </span>
              <span className="text-xs text-nocturn-muted block">
                Focus better. Plan smarter.
              </span>
            </div>
          </div>

          <span className="text-xs font-mono font-medium text-nocturn-muted bg-nocturn-surface px-3 py-1 rounded-full border border-nocturn-border">
            v1.0
          </span>
        </div>
      </section>
    </div>
  )
}
