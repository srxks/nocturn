/**
 * networkStateService.js
 *
 * Centralized network and Supabase connection state tracking for Nocturn.
 *
 * Supports 4 distinct connection states:
 * 1. ONLINE: navigator.onLine = true & Supabase is reachable
 * 2. OFFLINE: navigator.onLine = false
 * 3. NETWORK_ERROR: navigator.onLine = true but network/transport failures (QUIC, connection closed/reset, failed to fetch)
 * 4. BACKEND_ERROR: Supabase responds with HTTP 4xx/5xx status
 *
 * Also tracks background syncing status for the global indicator.
 */

import { useState, useEffect } from "react"

export const ConnectionState = {
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
  NETWORK_ERROR: "NETWORK_ERROR",
  BACKEND_ERROR: "BACKEND_ERROR",
}

let currentState =
  typeof navigator !== "undefined" && navigator.onLine === false
    ? ConnectionState.OFFLINE
    : ConnectionState.ONLINE

let isSyncing = false
let consecutiveFailures = 0
let lastFailureReason = null
const listeners = new Set()

export function getNetworkState() {
  return {
    state: currentState,
    isSyncing,
    consecutiveFailures,
    lastFailureReason,
    isOnline: currentState === ConnectionState.ONLINE,
    isOffline: currentState === ConnectionState.OFFLINE,
    hasError:
      currentState === ConnectionState.NETWORK_ERROR ||
      currentState === ConnectionState.BACKEND_ERROR,
  }
}

function notifyListeners() {
  const snapshot = getNetworkState()
  listeners.forEach((fn) => {
    try {
      fn(snapshot)
    } catch (e) {
      console.warn("[networkStateService] listener error:", e)
    }
  })
}

export function subscribeNetworkState(listener) {
  listeners.add(listener)
  listener(getNetworkState())
  return () => listeners.delete(listener)
}

/**
 * Report a successful network / Supabase operation.
 * Resets failure counters and marks ONLINE.
 */
export function reportNetworkSuccess() {
  consecutiveFailures = 0
  lastFailureReason = null
  if (currentState !== ConnectionState.ONLINE) {
    currentState = ConnectionState.ONLINE
    notifyListeners()
  }
}

/**
 * Report a network transport error (QUIC, connection reset/closed, Failed to fetch).
 * Requires 2 consecutive failures to avoid flickering on a single transient glitch.
 */
export function reportNetworkError(err) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    currentState = ConnectionState.OFFLINE
    notifyListeners()
    return
  }

  consecutiveFailures++
  lastFailureReason = err?.message || String(err)

  if (consecutiveFailures >= 2) {
    if (currentState !== ConnectionState.NETWORK_ERROR) {
      currentState = ConnectionState.NETWORK_ERROR
      notifyListeners()
    }
  }
}

/**
 * Report a backend HTTP response error (4xx / 5xx).
 */
export function reportBackendError(err) {
  consecutiveFailures++
  lastFailureReason = err?.message || String(err)
  if (currentState !== ConnectionState.BACKEND_ERROR) {
    currentState = ConnectionState.BACKEND_ERROR
    notifyListeners()
  }
}

/**
 * Set syncing state when queue draining or sync operation is active.
 */
export function setSyncingState(syncing) {
  const bool = Boolean(syncing)
  if (isSyncing !== bool) {
    isSyncing = bool
    notifyListeners()
  }
}

/**
 * Helper to classify any thrown error or fetch failure appropriately.
 */
export function classifyAndReportError(err) {
  if (!err) return
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    currentState = ConnectionState.OFFLINE
    notifyListeners()
    return
  }

  const msg = (err?.message || err?.error_description || String(err)).toLowerCase()
  const status = err?.status || err?.statusCode || err?.code

  if (typeof status === "number" && status >= 400 && status < 600) {
    reportBackendError(err)
    return
  }

  if (
    msg.includes("failed to fetch") ||
    msg.includes("quic") ||
    msg.includes("connection_reset") ||
    msg.includes("connection_closed") ||
    msg.includes("networkerror") ||
    msg.includes("abort") ||
    msg.includes("functionsfetcherror") ||
    msg.includes("authretryablefetcherror") ||
    msg.includes("econnreset")
  ) {
    reportNetworkError(err)
    return
  }

  reportBackendError(err)
}

// Browser online/offline event bindings
if (typeof window !== "undefined") {
  window.addEventListener("offline", () => {
    currentState = ConnectionState.OFFLINE
    notifyListeners()
  })

  window.addEventListener("online", () => {
    consecutiveFailures = 0
    currentState = ConnectionState.ONLINE
    notifyListeners()
  })
}

/**
 * React hook to observe connection and sync state in components.
 */
export function useNetworkState() {
  const [networkState, setNetworkState] = useState(getNetworkState)

  useEffect(() => {
    return subscribeNetworkState(setNetworkState)
  }, [])

  return networkState
}
