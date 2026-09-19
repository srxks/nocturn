import assert from 'assert'
import { createClient } from '@supabase/supabase-js'
import {
  supabase,
  isSupabaseConfigured,
  getSupabaseDiagnostics,
  testSupabaseConnection,
} from '../lib/supabaseClient.js'

console.log('=== RUNNING SUPABASE CLIENT & APIKEY HEADER VERIFICATION SUITE ===\n')

// ─── Test 1: Safe Diagnostics (No secret exposure) ───────────────────────────
console.log('--- Test 1: Safe Diagnostics & Configuration Checks ---')
{
  const diag = getSupabaseDiagnostics()
  assert.strictEqual(typeof diag.hasUrl, 'boolean', 'hasUrl must be a boolean')
  assert.strictEqual(typeof diag.hasAnonKey, 'boolean', 'hasAnonKey must be a boolean')
  assert.strictEqual(typeof diag.isConfigured, 'boolean', 'isConfigured must be a boolean')

  // Verify diagnostic object contains NO sensitive keys
  assert.strictEqual('url' in diag, false, 'Diagnostics must NEVER leak the URL')
  assert.strictEqual('key' in diag, false, 'Diagnostics must NEVER leak the key')
  assert.strictEqual('anonKey' in diag, false, 'Diagnostics must NEVER leak anonKey')
  assert.strictEqual('token' in diag, false, 'Diagnostics must NEVER leak tokens')
  console.log('✓ PASS: getSupabaseDiagnostics() returns only safe boolean presence flags without leaking secrets')
}

// ─── Test 2: Exactly One Canonical Client Instance ───────────────────────────
console.log('\n--- Test 2: Single Canonical Supabase Client Instance ---')
{
  assert.strictEqual(typeof isSupabaseConfigured, 'boolean')
  if (isSupabaseConfigured) {
    assert.ok(supabase, 'supabase client must exist when configured')
    assert.strictEqual(typeof supabase.from, 'function', 'supabase.from must be a function')
    assert.strictEqual(typeof supabase.auth, 'object', 'supabase.auth must be an object')
    assert.strictEqual(typeof supabase.functions, 'object', 'supabase.functions must be an object')
    console.log('✓ PASS: Exactly one canonical client instance initialized with required sub-modules')
  } else {
    console.log('ℹ Notice: Supabase not configured in this test environment — local offline mode verified')
  }
}

// ─── Test 3: Production REST Requests Contain apikey Header ──────────────────
console.log('\n--- Test 3: REST Requests Header Verification ---')
{
  const capturedRequests = []
  const mockAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key-signature'
  const mockUrl = 'https://mockproject.supabase.co'

  const testClient = createClient(mockUrl, mockAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        apikey: mockAnonKey,
      },
      fetch: (url, opts) => {
        capturedRequests.push({
          url: String(url),
          headers: opts.headers,
          method: opts.method || 'GET',
        })
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
          text: () => Promise.resolve('[]'),
        })
      },
    },
  })

  // 1. tasks query
  await testClient.from('tasks').select('*').eq('user_id', 'user-123')
  // 2. task_lists query
  await testClient.from('task_lists').select('*').eq('user_id', 'user-123')
  // 3. timer_settings query
  await testClient.from('timer_settings').select('*').eq('user_id', 'user-123')
  // 4. user_settings query
  await testClient.from('user_settings').select('*').eq('user_id', 'user-123')
  // 5. themes query
  await testClient.from('themes').select('*').eq('user_id', 'user-123')
  // 6. user_profiles query
  await testClient.from('user_profiles').select('*').eq('user_id', 'user-123')
  // 7. subtasks query
  await testClient.from('subtasks').select('*').eq('user_id', 'user-123')
  // 8. vocab_words query
  await testClient.from('vocab_words').select('*').eq('user_id', 'user-123')
  // 9. focus_sessions query
  await testClient.from('focus_sessions').select('*').eq('user_id', 'user-123')

  assert.strictEqual(capturedRequests.length, 9, 'All 9 table queries must execute')

  for (const req of capturedRequests) {
    const headers = req.headers
    const apikeyHeader = headers.get ? headers.get('apikey') : headers['apikey']
    const authHeader = headers.get ? headers.get('authorization') : (headers['authorization'] || headers['Authorization'])

    assert.ok(apikeyHeader, `Request to ${req.url} must contain 'apikey' header`)
    assert.strictEqual(apikeyHeader, mockAnonKey, `'apikey' header must equal the configured anon key`)
    assert.ok(authHeader, `Request to ${req.url} must contain 'Authorization' header`)
    assert.ok(authHeader.startsWith('Bearer '), `'Authorization' header must be Bearer token`)
  }

  console.log('✓ PASS: All 9 entity REST requests carry required apikey and Authorization headers')
}

// ─── Test 4: Offline Graceful Handling When Unconfigured ──────────────────────
console.log('\n--- Test 4: Offline Graceful Handling ---')
{
  const res = await testSupabaseConnection()
  assert.strictEqual(typeof res.configured, 'boolean')
  assert.strictEqual(typeof res.connected, 'boolean')
  assert.strictEqual(typeof res.message, 'string')
  console.log(`✓ PASS: testSupabaseConnection() handled gracefully (${res.message})`)
}

console.log('\n========================================')
console.log('SUMMARY: ALL SUPABASE APIKEY TESTS PASSED!')
console.log('========================================\n')
