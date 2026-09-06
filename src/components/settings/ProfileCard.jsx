import { User, ShieldCheck } from 'lucide-react'

export default function ProfileCard() {
  return (
    <div className="nocturn-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-nocturn-border">
      <div className="flex items-center gap-4">
        {/* Avatar Placeholder */}
        <div className="w-14 h-14 rounded-full bg-nocturn-accent/15 border-2 border-nocturn-accent/40 flex items-center justify-center text-nocturn-accent-bright shadow-[0_0_20px_rgba(var(--color-nocturn-accent-rgb),0.25)] shrink-0">
          <User className="w-7 h-7 stroke-[2]" />
        </div>

        {/* User Info */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-white">Nocturn User</h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-nocturn-accent-bright bg-nocturn-accent/15 px-2 py-0.5 rounded-full border border-nocturn-accent/30">
              <ShieldCheck className="w-3 h-3 stroke-[2.5]" />
              Local
            </span>
          </div>
          <p className="text-xs sm:text-sm text-nocturn-muted">
            Productivity workspace
          </p>
        </div>
      </div>

      <div className="text-xs text-nocturn-dim font-medium bg-nocturn-surface px-3 py-1.5 rounded-xl border border-nocturn-border">
        Offline Session
      </div>
    </div>
  )
}
