/**
 * Dynamic Favicon Switcher
 * Swaps favicon between static and active glowing icon when timer is running.
 */

export function setFaviconActive(running) {
  if (typeof document === 'undefined') return
  const link = document.querySelector("link[rel~='icon']")
  if (link) {
    link.href = running ? '/favicon-active.svg' : '/favicon.svg'
  }
}
