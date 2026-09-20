import assert from 'node:assert'
import {
  mapMsTodoToNocturnTask,
  mapNocturnToMsTodoTask,
  getMsTodoConnectionState,
  connectMicrosoftAccount,
  disconnectMicrosoftAccount,
} from '../services/microsoftTodoService.js'

console.log('=== RUNNING MICROSOFT TO DO INTEGRATION TEST SUITE ===\n')

// Test 1: Map Microsoft Graph task to Nocturn format
const msTask = {
  id: 'ms-task-123',
  title: 'Complete System Architecture Review',
  status: 'notStarted',
  importance: 'high',
  dueDateTime: { dateTime: '2026-09-25T00:00:00.0000000', timeZone: 'UTC' },
  body: { content: 'Check all microservice endpoints' },
  createdDateTime: '2026-09-20T10:00:00Z',
  lastModifiedDateTime: '2026-09-20T12:00:00Z',
}

const nocturnTask = mapMsTodoToNocturnTask(msTask, 'user-1')
assert.strictEqual(nocturnTask.title, 'Complete System Architecture Review')
assert.strictEqual(nocturnTask.dueDate, '2026-09-25')
assert.strictEqual(nocturnTask.priority, 'high')
assert.strictEqual(nocturnTask.completed, false)
assert.strictEqual(nocturnTask.source, 'microsoft_todo')
assert.strictEqual(nocturnTask.msTodoId, 'ms-task-123')
assert.strictEqual(nocturnTask.notes, 'Check all microservice endpoints')
console.log('✓ PASS: Microsoft Graph To Do -> Nocturn task mapping verified')

// Test 2: Map Nocturn task back to Microsoft Graph format
const exportMapped = mapNocturnToMsTodoTask(nocturnTask)
assert.strictEqual(exportMapped.title, 'Complete System Architecture Review')
assert.strictEqual(exportMapped.status, 'notStarted')
assert.strictEqual(exportMapped.importance, 'high')
assert.strictEqual(exportMapped.dueDateTime.dateTime, '2026-09-25T00:00:00.0000000')
assert.strictEqual(exportMapped.body.content, 'Check all microservice endpoints')
console.log('✓ PASS: Nocturn task -> Microsoft Graph To Do mapping verified')

// Test 3: Connection State Transitions
const conn1 = getMsTodoConnectionState()
assert.strictEqual(conn1.isConnected, false)

const connected = await connectMicrosoftAccount('alex@outlook.com', 'test_token_abc')
assert.strictEqual(connected.isConnected, true)
assert.strictEqual(connected.accountEmail, 'alex@outlook.com')

const disconnected = disconnectMicrosoftAccount()
assert.strictEqual(disconnected.isConnected, false)
assert.strictEqual(disconnected.accountEmail, null)
console.log('✓ PASS: Microsoft To Do connection lifecycle verified')

console.log('\n======================================================')
console.log('SUMMARY: ALL MICROSOFT TO DO INTEGRATION TESTS PASSED! ✓')
console.log('======================================================\n')
