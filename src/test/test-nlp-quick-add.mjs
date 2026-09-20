import assert from 'node:assert'
import { parseNaturalTaskInput } from '../services/taskInputParser.js'

console.log('=== RUNNING NLP QUICK ADD TEST SUITE ===\n')

// Test 1: Full natural input with priority, day, and 12-hour time
const res1 = parseNaturalTaskInput('Finish electronics assignment tomorrow at 5pm !high')
assert.strictEqual(res1.cleanTitle, 'Finish electronics assignment')
assert.strictEqual(res1.priority, 'high')
assert.strictEqual(res1.day, 'tomorrow')
assert.strictEqual(res1.time, '17:00')
assert.strictEqual(res1.formattedTime, '5:00 PM')
console.log('✓ PASS: Full sentence with priority, day, and 12h time parsed correctly')

// Test 2: Morning time with minutes and !urgent priority
const res2 = parseNaturalTaskInput('Study probability today at 10:30am !urgent')
assert.strictEqual(res2.cleanTitle, 'Study probability')
assert.strictEqual(res2.priority, 'high')
assert.strictEqual(res2.day, 'today')
assert.strictEqual(res2.time, '10:30')
assert.strictEqual(res2.formattedTime, '10:30 AM')
console.log('✓ PASS: Morning time with minutes and !urgent parsed correctly')

// Test 3: Low priority without date or time
const res3 = parseNaturalTaskInput('Water houseplants !low')
assert.strictEqual(res3.cleanTitle, 'Water houseplants')
assert.strictEqual(res3.priority, 'low')
assert.strictEqual(res3.day, null)
assert.strictEqual(res3.time, null)
console.log('✓ PASS: Low priority without date or time parsed correctly')

// Test 4: 24-hour time format
const res4 = parseNaturalTaskInput('Team standup at 14:00 !med')
assert.strictEqual(res4.cleanTitle, 'Team standup')
assert.strictEqual(res4.priority, 'medium')
assert.strictEqual(res4.time, '14:00')
console.log('✓ PASS: 24h time format parsed correctly')

// Test 5: Plain text without triggers
const res5 = parseNaturalTaskInput('Just a normal task to complete')
assert.strictEqual(res5.cleanTitle, 'Just a normal task to complete')
assert.strictEqual(res5.priority, null)
assert.strictEqual(res5.day, null)
assert.strictEqual(res5.time, null)
console.log('✓ PASS: Plain text without triggers returns untouched title')

console.log('\n========================================')
console.log('SUMMARY: ALL NLP QUICK ADD TESTS PASSED! ✓')
console.log('========================================\n')
