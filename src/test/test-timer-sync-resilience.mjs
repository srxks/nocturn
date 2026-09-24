/**
 * test-timer-sync-resilience.mjs
 *
 * Automated verification that background cloud sync does NOT reset,
 * clobber, or alter the countdown of a running or paused focus timer.
 */

import puppeteer from 'puppeteer-core'
import path from 'path'
import { fileURLToPath } from 'url'
import assert from 'assert'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.resolve(__dirname, '../../.chrome-session')
const BASE_URL = 'http://localhost:5173'

async function runTimerSyncResilienceTest() {
  console.log('====================================================')
  console.log('NOCTURN TIMER SYNC RESILIENCE VERIFICATION')
  console.log('====================================================\n')

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    userDataDir: USER_DATA_DIR,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--host-resolver-rules=MAP odajpktecgrbpwjtmszk.supabase.co 104.18.38.10',
      '--disable-quic',
    ],
    defaultViewport: { width: 1280, height: 800 },
  })

  try {
    const page = await browser.newPage()

    page.on('console', (msg) => {
      console.log('   [PAGE LOG]:', msg.type(), msg.text())
    })
    page.on('pageerror', (err) => {
      console.error('   [PAGE ERROR]:', err)
    })

    console.log('1. Navigating to root & timer...')
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1000))
    await page.goto(`${BASE_URL}/timer`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1500))

    // Ensure we are on /timer
    const url = page.url()
    console.log('   Current URL:', url)

    // Ensure tabular-nums is loaded
    await page.waitForSelector('span.tabular-nums', { timeout: 10000 })

    // Check timer countdown element
    const initialCountdown = await page.evaluate(() => {
      const ringText = document.querySelector('span.tabular-nums')
      return ringText ? ringText.textContent.trim() : null
    })
    console.log('2. Initial countdown on screen:', initialCountdown)

    // Check play/pause button
    const isAlreadyRunning = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Pause timer"]')
      return Boolean(btn)
    })

    if (!isAlreadyRunning) {
      console.log('3. Starting focus timer...')
      await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Start timer"]')
        if (btn) btn.click()
      })
    } else {
      console.log('3. Timer is already running.')
    }

    // Wait 3 seconds for countdown to progress
    console.log('4. Letting timer tick for 3 seconds...')
    await new Promise((r) => setTimeout(r, 3000))

    const countdownBeforeSync = await page.evaluate(() => {
      const ringText = document.querySelector('span.tabular-nums')
      return ringText ? ringText.textContent.trim() : null
    })
    console.log('   Countdown before sync:', countdownBeforeSync)

    // Parse minutes and seconds
    const [minsBefore, secsBefore] = countdownBeforeSync.split(':').map(Number)
    const totalSecsBefore = minsBefore * 60 + secsBefore

    // Trigger coordinated sync directly in page context
    console.log('5. Triggering coordinated background cloud sync while timer is running...')
    const syncResult = await page.evaluate(async () => {
      try {
        const { runCoordinatedSync } = await import('/src/services/syncCoordinator.js')
        const { syncWithCloud } = await import('/src/services/syncService.js')
        const { supabase } = await import('/src/lib/supabaseClient.js')
        const { db } = await import('/src/db/db.js')

        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.id) return { success: false, reason: 'no-user' }

        const result = await runCoordinatedSync(user.id, syncWithCloud, { force: true, source: 'test-sync-resilience' })
        const active = await db.activeSessions.get('active')
        const timerSettings = await db.timerSettings.get('default')

        return {
          success: result?.success ?? false,
          activeSession: active ? { id: active.id, status: active.status } : null,
          timerStateStatus: timerSettings?.timerState?.status || null,
        }
      } catch (err) {
        return { error: err.message }
      }
    })
    console.log('   Sync execution result:', syncResult)

    // Track countdown every second for the next 5 seconds
    console.log('6. Monitoring countdown for 5 seconds post-sync...')
    const samples = []
    for (let i = 1; i <= 5; i++) {
      await new Promise((r) => setTimeout(r, 1000))
      const time = await page.evaluate(() => {
        const ringText = document.querySelector('span.tabular-nums')
        return ringText ? ringText.textContent.trim() : null
      })
      samples.push(time)
      console.log(`   T+${i}s post-sync countdown:`, time)
    }

    // Verify countdown never jumped back or reset
    const finalCountdown = samples[samples.length - 1]
    const [minsFinal, secsFinal] = finalCountdown.split(':').map(Number)
    const totalSecsFinal = minsFinal * 60 + secsFinal

    console.log('\n7. Evaluating assertions...')
    assert.ok(totalSecsFinal < totalSecsBefore, `Timer must continue decreasing! Before: ${totalSecsBefore}s, After: ${totalSecsFinal}s`)
    assert.strictEqual(totalSecsBefore - totalSecsFinal >= 4, true, `Timer must have ticked at least 4 seconds during 5s observation (diff: ${totalSecsBefore - totalSecsFinal}s)`)

    // Verify active session in Dexie
    const postSyncDexieState = await page.evaluate(async () => {
      const { db } = await import('/src/db/db.js')
      const active = await db.activeSessions.get('active')
      return active
    })
    assert.ok(postSyncDexieState, 'Dexie activeSessions must still have active record')
    assert.strictEqual(postSyncDexieState.status, 'active', 'Dexie active session must still have status: "active"')

    console.log('\n====================================================')
    console.log('✓ PASS Case 1: In-flight Timer was completely resilient to background sync!')
    console.log(`  Before sync: ${countdownBeforeSync}`)
    console.log(`  Post-sync samples: ${samples.join(' -> ')}`)
    console.log('  Countdown continued smoothly with zero reset!')
    console.log('====================================================\n')

    // ─── Test Case 2: Fresh Start -> Sync -> Pause -> Sync -> Resume -> Sync ──
    console.log('--- Test Case 2: Fresh Start, Pause & Resume Sync Resilience ---')
    console.log('2.1 Resetting timer...')
    const resetBtn = await page.waitForSelector('button[aria-label="Reset current timer"]', { timeout: 5000 })
    await resetBtn.click()
    await new Promise((r) => setTimeout(r, 1000))

    const resetCountdown = await page.evaluate(() => {
      const ringText = document.querySelector('span.tabular-nums')
      return ringText ? ringText.textContent.trim() : null
    })
    console.log('    Timer reset to:', resetCountdown)

    console.log('2.2 Starting fresh timer...')
    const startFreshBtn = await page.waitForSelector('button[aria-label="Start timer"]', { timeout: 5000 })
    await startFreshBtn.click()

    console.log('2.3 Letting timer tick for 3 seconds...')
    await new Promise((r) => setTimeout(r, 3000))

    const freshTicking = await page.evaluate(() => {
      const ringText = document.querySelector('span.tabular-nums')
      return ringText ? ringText.textContent.trim() : null
    })
    console.log('    Fresh timer countdown after 3s:', freshTicking)
    assert.notStrictEqual(freshTicking, resetCountdown, 'Fresh timer must have started ticking down')

    console.log('2.4 Triggering background sync on freshly running timer...')
    await page.evaluate(async () => {
      const { runCoordinatedSync } = await import('/src/services/syncCoordinator.js')
      const { syncWithCloud } = await import('/src/services/syncService.js')
      const { supabase } = await import('/src/lib/supabaseClient.js')
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        await runCoordinatedSync(user.id, syncWithCloud, { force: true, source: 'test-fresh-sync' })
      }
    })

    await new Promise((r) => setTimeout(r, 2000))
    const freshPostSync = await page.evaluate(() => {
      const ringText = document.querySelector('span.tabular-nums')
      return ringText ? ringText.textContent.trim() : null
    })
    console.log('    Fresh timer countdown after sync:', freshPostSync)
    assert.notStrictEqual(freshPostSync, resetCountdown, 'Fresh timer must NOT reset back to initial duration on sync!')

    console.log('2.5 Pausing timer...')
    const pauseBtn = await page.waitForSelector('button[aria-label="Pause timer"]', { timeout: 5000 })
    await pauseBtn.click()
    await new Promise((r) => setTimeout(r, 1000))

    const pausedCountdown = await page.evaluate(() => {
      const ringText = document.querySelector('span.tabular-nums')
      return ringText ? ringText.textContent.trim() : null
    })
    console.log('    Timer paused at:', pausedCountdown)

    console.log('2.6 Triggering background sync while PAUSED...')
    await page.evaluate(async () => {
      const { runCoordinatedSync } = await import('/src/services/syncCoordinator.js')
      const { syncWithCloud } = await import('/src/services/syncService.js')
      const { supabase } = await import('/src/lib/supabaseClient.js')
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        await runCoordinatedSync(user.id, syncWithCloud, { force: true, source: 'test-paused-sync' })
      }
    })

    await new Promise((r) => setTimeout(r, 2000))
    const pausedPostSync = await page.evaluate(() => {
      const ringText = document.querySelector('span.tabular-nums')
      return ringText ? ringText.textContent.trim() : null
    })
    console.log('    Timer countdown after sync while paused:', pausedPostSync)
    assert.strictEqual(pausedPostSync, pausedCountdown, 'Paused timer must maintain exact paused remaining time through sync!')

    console.log('2.7 Resuming timer...')
    const resumeBtn = await page.waitForSelector('button[aria-label="Start timer"]', { timeout: 5000 })
    await resumeBtn.click()

    console.log('2.8 Observing resumed countdown for 3 seconds...')
    await new Promise((r) => setTimeout(r, 3000))
    const resumedCountdown = await page.evaluate(() => {
      const ringText = document.querySelector('span.tabular-nums')
      return ringText ? ringText.textContent.trim() : null
    })
    console.log('    Resumed countdown after 3s:', resumedCountdown)

    const [pm, ps] = pausedCountdown.split(':').map(Number)
    const [rm, rs] = resumedCountdown.split(':').map(Number)
    assert.ok(rm * 60 + rs < pm * 60 + ps, 'Resumed timer must continue decreasing')

    console.log('\n====================================================')
    console.log('✓ ALL TESTS PASSED: COMPLETE TIMER SYNC RESILIENCE CONFIRMED!')
    console.log('====================================================\n')
  } finally {
    await browser.close()
  }
}

runTimerSyncResilienceTest().catch((err) => {
  console.error('\n❌ FAIL: Timer sync resilience test failed:', err)
  process.exit(1)
})
