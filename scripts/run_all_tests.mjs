import { execSync } from 'child_process'

console.log('=== NOCTURN COMPREHENSIVE AUTOMATED TEST HARNESS ===\n')

const testSteps = [
  { name: 'ESLint Code Quality & Syntax Check', cmd: 'npx eslint src/' },
  { name: 'Vite Production Build & PWA Generation', cmd: 'npm run build' },
  { name: 'Route Navigation & Runtime Console Audit', cmd: 'node scratch/audit_all_routes.js' },
  { name: 'Cross-Device Real-Time Timer & DB Sync Verification', cmd: 'node scratch/verify_all_timer_controls_sync.js' },
]

let allPassed = true

for (const step of testSteps) {
  process.stdout.write(`[RUNNING] ${step.name}... `)
  try {
    const startTime = Date.now()
    execSync(step.cmd, { stdio: 'pipe' })
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\x1b[32mPASSED\x1b[0m (${duration}s)`)
  } catch (err) {
    allPassed = false
    console.log(`\x1b[31mFAILED\x1b[0m`)
    console.error(err.stdout ? err.stdout.toString() : err.message)
    break
  }
}

if (!allPassed) {
  console.error('\nTest suite failed.')
  process.exit(1)
} else {
  console.log('\n\x1b[32mALL TESTS PASSED SUCCESSFULLY!\x1b[0m')
  process.exit(0)
}
