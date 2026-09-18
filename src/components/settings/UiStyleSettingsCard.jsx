import { Check, LayoutGrid, Terminal } from 'lucide-react'
import { useTheme } from '../../context/useTheme'
import { UI_STYLES } from '../../styles/uiStyleTokens'

export default function UiStyleSettingsCard() {
  const { uiStyle, setUiStyle } = useTheme()

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide">
          UI Style & Appearance
        </h2>
        <span className="text-xs font-mono text-nocturn-muted">
          Active: <span className="text-nocturn-accent uppercase font-bold">{uiStyle}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PREVIEW OPTION 1: NORMAL STYLE */}
        <button
          type="button"
          onClick={() => setUiStyle(UI_STYLES.NORMAL)}
          className={`text-left p-5 sm:p-6 transition-all duration-200 cursor-pointer relative overflow-hidden rounded-3xl border flex flex-col justify-between ${
            uiStyle === UI_STYLES.NORMAL
              ? 'bg-nocturn-card border-nocturn-accent shadow-[0_0_25px_rgba(var(--color-nocturn-accent-rgb),0.25)] ring-1 ring-nocturn-accent'
              : 'bg-nocturn-card/60 border-nocturn-border hover:border-nocturn-border/90 hover:bg-nocturn-card/90'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-nocturn-surface border border-nocturn-border flex items-center justify-center text-nocturn-accent shadow-sm">
                <LayoutGrid className="w-5 h-5 stroke-[2]" />
              </div>
              {uiStyle === UI_STYLES.NORMAL && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-nocturn-accent text-black shadow-[0_0_10px_rgba(var(--color-nocturn-accent-rgb),0.4)]">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  Active
                </span>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Normal
              </h3>
              <p className="text-xs text-nocturn-muted mt-0.5">
                Modern minimal productivity layout with rounded corners and calm surfaces.
              </p>
            </div>

            {/* Live Interactive Mini-Preview */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-nocturn-border/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-medium">Task Card Preview</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-nocturn-accent/15 text-nocturn-accent border border-nocturn-accent/30">
                  Priority
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-md border border-nocturn-accent bg-nocturn-accent flex items-center justify-center">
                  <Check className="w-3 h-3 text-black stroke-[3]" />
                </div>
                <div className="h-2 rounded-full bg-white/15 flex-1" />
              </div>
              <div className="pt-1 flex items-center justify-end">
                <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-nocturn-accent text-black shadow-sm">
                  Focus
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-nocturn-border/40 text-[11px] text-nocturn-muted flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-nocturn-accent/80" />
            <span>Rounded • Smooth Shadows • Clean Readability</span>
          </div>
        </button>

        {/* PREVIEW OPTION 2: ANGULAR STYLE */}
        <button
          type="button"
          onClick={() => setUiStyle(UI_STYLES.ANGULAR)}
          className={`text-left p-5 sm:p-6 transition-all duration-200 cursor-pointer relative overflow-hidden rounded-none border flex flex-col justify-between angular-chamfer ${
            uiStyle === UI_STYLES.ANGULAR
              ? 'bg-nocturn-card border-nocturn-accent shadow-[0_0_25px_rgba(var(--color-nocturn-accent-rgb),0.3)] ring-1 ring-nocturn-accent'
              : 'bg-nocturn-card/60 border-nocturn-border hover:border-nocturn-border/90 hover:bg-nocturn-card/90'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-none bg-nocturn-surface border border-nocturn-border flex items-center justify-center text-nocturn-accent angular-chamfer-sm">
                <Terminal className="w-5 h-5 stroke-[2.2]" />
              </div>
              {uiStyle === UI_STYLES.ANGULAR && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-xs font-mono font-bold bg-nocturn-accent text-black shadow-[0_0_10px_rgba(var(--color-nocturn-accent-rgb),0.4)]">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  [ACTIVE]
                </span>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-white tracking-tight font-mono">
                [ ANGULAR ]
              </h3>
              <p className="text-xs text-nocturn-muted mt-0.5 font-mono">
                Futuristic command center HUD with chamfered cuts and technical telemetry.
              </p>
            </div>

            {/* Live Interactive Mini-Preview */}
            <div className="p-4 rounded-none bg-white/[0.03] border border-nocturn-border/80 space-y-3 angular-chamfer-sm">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white font-medium">[SYS.TASK_01]</span>
                <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold bg-nocturn-accent/20 text-nocturn-accent border border-nocturn-accent/40">
                  [HIGH_PRIO]
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-none border border-nocturn-accent bg-nocturn-accent flex items-center justify-center">
                  <Check className="w-3 h-3 text-black stroke-[3]" />
                </div>
                <div className="h-1.5 rounded-none bg-white/20 flex-1 font-mono" />
              </div>
              <div className="pt-1 flex items-center justify-end">
                <span className="px-3 py-1 rounded-none text-xs font-mono font-bold bg-nocturn-accent text-black angular-chamfer-sm">
                  [FOCUS_EXEC]
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-nocturn-border/40 text-[11px] font-mono text-nocturn-muted flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-nocturn-accent" />
            <span>Chamfered Corners • HUD Reticle • Segmented Telemetry</span>
          </div>
        </button>
      </div>
    </section>
  )
}
