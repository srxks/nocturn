/**
 * UI Style System Tokens
 * Defines characteristics for NORMAL (modern minimal) and ANGULAR (futuristic command center HUD)
 */

export const UI_STYLES = {
  NORMAL: 'normal',
  ANGULAR: 'angular',
}

export const UI_STYLE_CONFIG = {
  [UI_STYLES.NORMAL]: {
    id: 'normal',
    name: 'Normal',
    subtitle: 'Modern Minimal',
    description: 'Clean, calm, rounded surfaces with high legibility and soft elevations.',
    badgeLabel: 'Default',
    cardClass: 'rounded-3xl border-nocturn-border',
    buttonClass: 'rounded-2xl',
    pillClass: 'rounded-full',
  },
  [UI_STYLES.ANGULAR]: {
    id: 'angular',
    name: 'Angular',
    subtitle: 'Command Center HUD',
    description: 'Futuristic technical interface with chamfered corners, thin borders, and telemetry readouts.',
    badgeLabel: 'Futuristic HUD',
    cardClass: 'rounded-none border-nocturn-border/80 angular-chamfer',
    buttonClass: 'rounded-none angular-chamfer-sm',
    pillClass: 'rounded-none font-mono text-[10px]',
  },
}
