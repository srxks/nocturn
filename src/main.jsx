import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Robust guard against Web Vitals / INP performance observer errors (e.g. t.entries[0].startTime)
if (typeof window !== 'undefined' && !window.__nocturn_inp_guard_active) {
  window.__nocturn_inp_guard_active = true

  const isPerformanceObserverError = (errOrMsg) => {
    if (!errOrMsg) return false
    const text =
      typeof errOrMsg === 'string'
        ? errOrMsg
        : [
            errOrMsg.name,
            errOrMsg.message,
            errOrMsg.stack,
            errOrMsg.reason,
            errOrMsg.detail,
          ]
            .filter(Boolean)
            .join(' ')

    const isStartTimeOnUndefined =
      (text.includes('Cannot read propert') || text.includes('reading')) &&
      (text.includes("'startTime'") ||
        text.includes('"startTime"') ||
        text.includes("'interactionId'") ||
        text.includes('"interactionId"'))

    const isVitalsReporter =
      text.includes('reportAllChanges') ||
      text.includes('supportedEntryTypes') ||
      (text.includes('INP') && text.includes('entries'))

    return isStartTimeOnUndefined || isVitalsReporter
  }

  // 1. Intercept requestIdleCallback to catch errors before the browser logs them
  if (typeof window.requestIdleCallback === 'function') {
    const origRIC = window.requestIdleCallback
    window.requestIdleCallback = function (cb, options) {
      if (typeof cb === 'function') {
        const safeCb = function (deadline) {
          try {
            return cb.call(this, deadline)
          } catch (err) {
            if (isPerformanceObserverError(err)) return
            throw err
          }
        }
        return origRIC.call(this, safeCb, options)
      }
      return origRIC.call(this, cb, options)
    }
  }

  // 2. Intercept setTimeout to catch errors inside scheduled timer tasks
  if (typeof window.setTimeout === 'function') {
    const origST = window.setTimeout
    window.setTimeout = function (handler, timeout, ...args) {
      if (typeof handler === 'function') {
        const safeHandler = function (...hArgs) {
          try {
            return handler.apply(this, hArgs)
          } catch (err) {
            if (isPerformanceObserverError(err)) return
            throw err
          }
        }
        return origST.call(this, safeHandler, timeout, ...args)
      }
      return origST.call(this, handler, timeout, ...args)
    }
  }

  // 3. Intercept requestAnimationFrame
  if (typeof window.requestAnimationFrame === 'function') {
    const origRAF = window.requestAnimationFrame
    window.requestAnimationFrame = function (cb) {
      if (typeof cb === 'function') {
        const safeCb = function (timestamp) {
          try {
            return cb.call(this, timestamp)
          } catch (err) {
            if (isPerformanceObserverError(err)) return
            throw err
          }
        }
        return origRAF.call(this, safeCb)
      }
      return origRAF.call(this, cb)
    }
  }

  // 4. Intercept PerformanceObserver
  if (typeof PerformanceObserver !== 'undefined') {
    const OriginalObserver = window.PerformanceObserver
    try {
      window.PerformanceObserver = class SafePerformanceObserver extends OriginalObserver {
        static get supportedEntryTypes() {
          return OriginalObserver.supportedEntryTypes || []
        }
        constructor(callback) {
          super((list, observer, ...args) => {
            try {
              callback(list, observer, ...args)
            } catch (err) {
              if (isPerformanceObserverError(err)) return
              throw err
            }
          })
        }
      }
    } catch {
      // Keep OriginalObserver if subclassing fails
    }
  }

  // 5. Guard PerformanceObserverEntryList so reading entries[0]?.startTime never yields undefined on empty entries
  if (typeof PerformanceObserverEntryList !== 'undefined') {
    const patchEntryGetter = (origFn) => {
      if (!origFn) return origFn
      return function (...args) {
        const entries = origFn.apply(this, args)
        if (Array.isArray(entries) && entries.length === 0) {
          return new Proxy(entries, {
            get(target, prop, receiver) {
              if (prop === '0' || prop === 0) {
                return (
                  target[0] || {
                    startTime: typeof performance !== 'undefined' ? performance.now() : 0,
                    duration: 0,
                    entryType: 'event',
                    name: 'safe-fallback',
                    interactionId: 0,
                  }
                )
              }
              return Reflect.get(target, prop, receiver)
            },
          })
        }
        return entries
      }
    }

    if (PerformanceObserverEntryList.prototype.getEntries) {
      PerformanceObserverEntryList.prototype.getEntries = patchEntryGetter(
        PerformanceObserverEntryList.prototype.getEntries
      )
    }
    if (PerformanceObserverEntryList.prototype.getEntriesByType) {
      PerformanceObserverEntryList.prototype.getEntriesByType = patchEntryGetter(
        PerformanceObserverEntryList.prototype.getEntriesByType
      )
    }
    if (PerformanceObserverEntryList.prototype.getEntriesByName) {
      PerformanceObserverEntryList.prototype.getEntriesByName = patchEntryGetter(
        PerformanceObserverEntryList.prototype.getEntriesByName
      )
    }
  }

  // 6. Suppress console.error reporting for PerformanceObserver / Web Vitals issues
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    const origConsoleError = console.error
    console.error = function (...args) {
      for (const arg of args) {
        if (isPerformanceObserverError(arg)) return
      }
      origConsoleError.apply(console, args)
    }
  }

  // 7. Global handlers to prevent any monitoring exceptions from crashing the app
  window.addEventListener(
    'error',
    (event) => {
      if (isPerformanceObserverError(event?.error || event?.message)) {
        event.preventDefault?.()
        event.stopImmediatePropagation?.()
      }
    },
    true
  )

  window.addEventListener('unhandledrejection', (event) => {
    if (isPerformanceObserverError(event?.reason)) {
      event.preventDefault?.()
    }
  })

  const origOnError = window.onerror
  window.onerror = function (message, source, lineno, colno, error) {
    if (isPerformanceObserverError(message || error)) {
      return true
    }
    if (origOnError) return origOnError.apply(this, arguments)
    return false
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
