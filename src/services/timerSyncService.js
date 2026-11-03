/**
 * timerSyncService.js
 *
 * Dedicated real-time synchronization service for Nocturn's timer.
 * Provides instant cross-device state synchronization via Supabase Realtime broadcast
 * with durable fallback to postgres_changes / timer_settings.
 *
 * Key principles:
 * 1. Timestamp-based synchronization (endAt / startedAt / getServerNowMs()).
 * 2. Monotonically increasing revision numbers + command IDs to discard stale updates and echoes.
 * 3. Bidirectional communication: Subscribes to `timer-sync:${userId}` broadcast channel.
 * 4. Optimistic local dispatch + instant broadcast + background durable upsert.
 */

import { supabase, isSupabaseConfigured, isGuestUserId } from '../lib/supabaseClient.js'
import { getServerNowMs } from '../lib/timer.js'

let _timerChannel = null
let _currentUserId = null
let _localRevision = 0
let _lastCommandId = null
let _onRemoteStateCallback = null

/**
 * Get current local timer state revision
 */
export function getLocalTimerRevision() {
  return _localRevision
}

/**
 * Set current local revision (e.g. from loaded storage)
 */
export function setLocalTimerRevision(rev) {
  if (Number.isFinite(rev) && rev > _localRevision) {
    _localRevision = rev
  }
}

/**
 * Initialize real-time timer synchronization for an authenticated user.
 */
export function initTimerSync(userId, onRemoteState) {
  if (!isSupabaseConfigured || !supabase || isGuestUserId(userId)) {
    return
  }

  _currentUserId = userId
  _onRemoteStateCallback = onRemoteState

  // If already subscribed to the user channel, keep it
  if (_timerChannel && _timerChannel.topic === `realtime:timer-sync-${userId}`) {
    return
  }

  // Cleanup old channel if switching users
  if (_timerChannel) {
    try {
      supabase.removeChannel(_timerChannel)
    } catch {
      // ignore
    }
    _timerChannel = null
  }

  const channelName = `timer-sync-${userId}`
  const channel = supabase.channel(channelName, {
    config: {
      broadcast: {
        self: false, // Do not echo back to sender
      },
    },
  })

  channel.on('broadcast', { event: 'TIMER_STATE_CHANGED' }, ({ payload }) => {
    handleIncomingTimerPayload(payload)
  })

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.debug('[timerSync] Connected to timer sync channel for user', userId)
    }
  })

  _timerChannel = channel
}

/**
 * Stop timer synchronization channel
 */
export function stopTimerSync() {
  if (_timerChannel && supabase) {
    try {
      supabase.removeChannel(_timerChannel)
    } catch {
      // ignore
    }
    _timerChannel = null
  }
  _currentUserId = null
  _onRemoteStateCallback = null
}

/**
 * Handles incoming timer state payload from Realtime broadcast or postgres_changes.
 */
export function handleIncomingTimerPayload(payload) {
  if (!payload || typeof payload !== 'object') return

  // Prevent echoing our own commands
  if (payload.commandId && payload.commandId === _lastCommandId) {
    return
  }

  // Revision check (monotonicity)
  const incomingRev = Number(payload.revision) || 0
  if (incomingRev <= _localRevision) {
    // Stale or duplicate update, ignore
    return
  }

  _localRevision = incomingRev

  // Notify active listener/provider
  if (_onRemoteStateCallback) {
    _onRemoteStateCallback(payload)
  }

  // Also dispatch window custom event for any other listening components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('nocturn:remote-timer-sync', {
        detail: payload,
      })
    )
  }
}

/**
 * Broadcasts a timer state transition to all other connected devices of the user.
 * Increments revision, stamps with commandId, sends via Realtime Broadcast.
 */
export async function broadcastTimerState(userId, statePayload) {
  if (!statePayload) return null

  _localRevision = Math.max(_localRevision + 1, (Number(statePayload.revision) || 0) + 1)
  const commandId = statePayload.commandId || crypto.randomUUID()
  _lastCommandId = commandId

  const fullPayload = {
    ...statePayload,
    revision: _localRevision,
    commandId,
    timestamp: getServerNowMs(),
  }

  // If connected via Realtime channel, broadcast immediately
  if (_timerChannel && userId && !isGuestUserId(userId)) {
    try {
      _timerChannel.send({
        type: 'broadcast',
        event: 'TIMER_STATE_CHANGED',
        payload: fullPayload,
      }).catch((err) => {
        console.warn('[timerSync] Broadcast send warning:', err)
      })
    } catch (err) {
      console.warn('[timerSync] Failed to send broadcast:', err)
    }
  }

  return fullPayload
}
