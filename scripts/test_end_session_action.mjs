import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'
import os from 'os'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.join(os.tmpdir(), 'nocturn-chrome-end-session-test')
const BASE_URL = 'http://localhost:5173/timer'

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

async function run() {
  console.log('========================================================')
  console.log('NOCTURN TIMER "END SESSION" ACTION VERIFICATION')
  console.log('========================================================\n')

  if (fs.existsSync(USER_DATA_DIR)) {
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    userDataDir: USER_DATA_DIR,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--window-size=1280,900',
    ],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console Error] ${msg.text()}`)
    }
  })

  try {
    console.log('1. Setting up guest authentication...')
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
    await sleep(800)

    let curUrl = page.url()
    if (curUrl.includes('/auth') || curUrl.includes('/onboarding')) {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'))
        const skip = btns.find((b) => b.innerText.includes('Skip') || b.innerText.includes('Get Started'))
        if (skip) skip.click()
      })
      await sleep(600)
      curUrl = page.url()
      if (curUrl.includes('/auth')) {
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'))
          const guestBtn = btns.find((b) => b.innerText.includes('Continue as Guest') || b.innerText.includes('Offline'))
          if (guestBtn) guestBtn.click()
        })
        await sleep(1000)
      }
    }

    await page.evaluate(() => {
      try {
        const guestUser = {
          id: 'guest-local-user',
          email: 'guest@nocturn.local',
          isGuest: true,
          is_anonymous: true,
        }
        localStorage.setItem('nocturn_auth_user', JSON.stringify(guestUser))
        localStorage.setItem('nocturn_has_completed_onboarding', 'true')
      } catch {}
    })

    console.log('2. Loading /timer page...')
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 })
    await sleep(1000)

    // Check Initial Idle State
    console.log('\n2. Testing Pomodoro Idle State...')
    const idleEndBtn = await page.$('button[aria-label="End session"]')
    const isEndBtnDisabled = await page.evaluate((el) => el ? el.disabled : null, idleEndBtn)
    assert(isEndBtnDisabled === true, 'End Session button is disabled when timer is idle')

    const confirmModalVisibleIdle = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('h3')).some(h => h.textContent.includes('End Focus Session?'))
    })
    assert(!confirmModalVisibleIdle, 'No confirmation dialog shown when timer is idle')

    // Start Timer
    console.log('\n3. Starting Pomodoro Focus Session...')
    const playBtn = await page.$('button[aria-label="Start timer"]')
    assert(!!playBtn, 'Start timer button is present')
    await playBtn.click()
    await sleep(600)

    // Inspect active control row layout
    console.log('\n4. Verifying active countdown control row layout...')
    const activeControls = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('div.flex.items-center.justify-center button'))
      return btns.map(b => ({
        label: b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent.trim(),
        title: b.getAttribute('title'),
        disabled: b.disabled,
        classList: b.className
      }))
    })

    const labels = activeControls.map(c => c.label)
    console.log('   Rendered controls in row:', labels)

    const hasReset = labels.some(l => l.includes('Reset current timer') || l.includes('Reset'))
    const hasPause = labels.some(l => l.includes('Pause timer'))
    const hasEndSession = labels.some(l => l.includes('End session'))
    const hasSkip = labels.some(l => l.includes('Skip to next session') || l.includes('Skip'))

    assert(hasReset, 'Reset button is present in control row')
    assert(hasPause, 'Pause button is present in control row')
    assert(hasEndSession, 'End Session button is present in control row')
    assert(hasSkip, 'Skip button is present in control row')

    // Verify ordering: Reset -> Pause -> End Session -> Skip
    const resetIdx = labels.findIndex(l => l.includes('Reset'))
    const pauseIdx = labels.findIndex(l => l.includes('Pause'))
    const endIdx = labels.findIndex(l => l.includes('End session'))
    const skipIdx = labels.findIndex(l => l.includes('Skip'))

    assert(resetIdx < pauseIdx && pauseIdx < endIdx && endIdx < skipIdx,
      `Controls are in exact required layout [Reset (${resetIdx}) -> Pause (${pauseIdx}) -> End Session (${endIdx}) -> Skip (${skipIdx})]`)

    // Verify prominent pill button below the row
    const pillBtn = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('End Session') && b.querySelector('span'))
      return btn ? { text: btn.textContent.trim(), visible: true } : null
    })
    assert(!!pillBtn, 'Dedicated prominent [End Session] pill button is visible below the row')

    // Test Accidental Click Prevention (Click Cancel in Confirmation Dialog)
    console.log('\n5. Testing Accidental Click Prevention (Modal Cancel)...')
    const endBtnInRow = await page.$('div.flex.items-center.justify-center button[aria-label="End session"]')
    await endBtnInRow.click()
    await sleep(400)

    const modalContent = await page.evaluate(() => {
      const title = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('End Focus Session?'))
      const body = Array.from(document.querySelectorAll('p')).find(p => p.textContent.includes("won't count as a completed session"))
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel')
      const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'End Session' && b.className.includes('bg-rose-500'))
      return {
        hasTitle: !!title,
        hasBody: !!body,
        hasCancel: !!cancelBtn,
        hasConfirm: !!confirmBtn,
      }
    })

    assert(modalContent.hasTitle, 'Confirmation dialog shows title: "End Focus Session?"')
    assert(modalContent.hasBody, 'Confirmation dialog shows body: "Your current session will end and won\'t count as a completed session."')
    assert(modalContent.hasCancel, 'Confirmation dialog provides [Cancel] button')
    assert(modalContent.hasConfirm, 'Confirmation dialog provides destructive [End Session] button')

    // Click Cancel
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel')
      if (cancelBtn) cancelBtn.click()
    })
    await sleep(400)

    const modalClosedAfterCancel = await page.evaluate(() => {
      return !Array.from(document.querySelectorAll('h3')).some(h => h.textContent.includes('End Focus Session?'))
    })
    assert(modalClosedAfterCancel, 'Clicking Cancel closes the confirmation dialog')

    const timerStillRunningAfterCancel = await page.evaluate(() => {
      return !!document.querySelector('button[aria-label="Pause timer"]')
    })
    assert(timerStillRunningAfterCancel, 'Timer remains running after Cancel is clicked')

    // Test Confirming End Session
    console.log('\n6. Testing End Session Confirmation Execution...')
    // Click the pill button on page (outside fixed modal)
    await page.evaluate(() => {
      const pillBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent.includes('End Session') && b.querySelector('span') && !b.closest('.fixed')
      )
      if (pillBtn) pillBtn.click()
    })
    await sleep(400)

    // Confirm in modal
    await page.evaluate(() => {
      const modal = document.querySelector('.fixed.z-\\[110\\]')
      const confirmEndBtn = modal ? Array.from(modal.querySelectorAll('button')).find(
        b => b.textContent.trim() === 'End Session' && b.className.includes('bg-rose-500')
      ) : null
      if (confirmEndBtn) confirmEndBtn.click()
    })
    await sleep(600)

    const postEndState = await page.evaluate(() => {
      const isStartVisible = !!document.querySelector('button[aria-label="Start timer"]')
      const isPauseVisible = !!document.querySelector('button[aria-label="Pause timer"]')
      const modalOpen = Array.from(document.querySelectorAll('h3')).some(h => h.textContent.includes('End Focus Session?'))
      const dotsText = document.body.innerText.includes('Session 1 of 4')
      return { isStartVisible, isPauseVisible, modalOpen, dotsText }
    })

    assert(postEndState.isStartVisible, 'Timer returned to clean IDLE state (Start button visible)')
    assert(!postEndState.isPauseVisible, 'Timer is NOT running')
    assert(!postEndState.modalOpen, 'Confirmation modal is closed')
    assert(postEndState.dotsText, 'Session cycle did NOT advance (remains Session 1 of 4)')

    // 7. Testing 52/17 Preset
    console.log('\n7. Testing 52/17 Preset End Session...')
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('52') && b.textContent.includes('17'))
      if (btn) btn.click()
    })
    await sleep(400)

    const play52Btn = await page.$('button[aria-label="Start timer"]')
    assert(!!play52Btn, '52/17 Start button is present')
    await play52Btn.click()
    await sleep(500)

    const endBtn52 = await page.$('div.flex.items-center.justify-center button[aria-label="End session"]')
    assert(!!endBtn52, '52/17 running session has End Session button in control row')
    await endBtn52.click()
    await sleep(400)

    await page.evaluate(() => {
      const modal = document.querySelector('.fixed.z-\\[110\\]')
      const confirm52 = modal ? Array.from(modal.querySelectorAll('button')).find(b => b.textContent.trim() === 'End Session') : null
      if (confirm52) confirm52.click()
    })
    await sleep(600)

    const isIdle52 = await page.evaluate(() => !!document.querySelector('button[aria-label="Start timer"]'))
    assert(isIdle52, '52/17 session cleanly terminated back to idle')

    // 8. Testing 90m Ultradian Preset
    console.log('\n8. Testing 90m Ultradian Preset End Session...')
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('90m') || b.textContent.includes('Ultradian'))
      if (btn) btn.click()
    })
    await sleep(400)

    const play90Btn = await page.$('button[aria-label="Start timer"]')
    assert(!!play90Btn, '90m Ultradian Start button is present')
    await play90Btn.click()
    await sleep(500)

    const endBtn90 = await page.$('div.flex.items-center.justify-center button[aria-label="End session"]')
    assert(!!endBtn90, '90m Ultradian running session has End Session button')
    await endBtn90.click()
    await sleep(400)

    await page.evaluate(() => {
      const modal = document.querySelector('.fixed.z-\\[110\\]')
      const confirm90 = modal ? Array.from(modal.querySelectorAll('button')).find(b => b.textContent.trim() === 'End Session') : null
      if (confirm90) confirm90.click()
    })
    await sleep(600)

    const isIdle90 = await page.evaluate(() => !!document.querySelector('button[aria-label="Start timer"]'))
    assert(isIdle90, '90m Ultradian session cleanly terminated back to idle')

    // 9. Testing 15m Sprint Preset
    console.log('\n9. Testing 15m Sprint Preset End Session...')
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('15m') || b.textContent.includes('Sprint'))
      if (btn) btn.click()
    })
    await sleep(400)

    const play15Btn = await page.$('button[aria-label="Start timer"]')
    assert(!!play15Btn, '15m Sprint Start button is present')
    await play15Btn.click()
    await sleep(500)

    const endBtn15 = await page.$('div.flex.items-center.justify-center button[aria-label="End session"]')
    assert(!!endBtn15, '15m Sprint running session has End Session button')
    await endBtn15.click()
    await sleep(400)

    await page.evaluate(() => {
      const modal = document.querySelector('.fixed.z-\\[110\\]')
      const confirm15 = modal ? Array.from(modal.querySelectorAll('button')).find(b => b.textContent.trim() === 'End Session') : null
      if (confirm15) confirm15.click()
    })
    await sleep(600)

    const isIdle15 = await page.evaluate(() => !!document.querySelector('button[aria-label="Start timer"]'))
    assert(isIdle15, '15m Sprint session cleanly terminated back to idle')

    // 10. Testing Focus Stopwatch
    console.log('\n10. Testing Focus Stopwatch Controls...')
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Focus Stopwatch'))
      if (btn) btn.click()
    })
    await sleep(400)

    const swPlayBtn = await page.$('button[aria-label="Start focus stopwatch"]')
    assert(!!swPlayBtn, 'Focus Stopwatch Start button is present')
    await swPlayBtn.click()
    await sleep(600)

    const swControls = await page.evaluate(() => {
      const discard = !!document.querySelector('button[aria-label="Discard focus session"]')
      const pause = !!document.querySelector('button[aria-label="Pause focus session"]')
      const finish = !!document.querySelector('button[aria-label="Finish focus session"]')
      const finishPill = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Finish Focus'))
      return { discard, pause, finish, finishPill }
    })

    assert(swControls.discard, 'Focus Stopwatch has Discard session button')
    assert(swControls.pause, 'Focus Stopwatch has Pause button')
    assert(swControls.finish, 'Focus Stopwatch has Finish focus session button')
    assert(swControls.finishPill, 'Focus Stopwatch has prominent [Finish Focus] CTA button')

    // Discard Focus Stopwatch session
    const discardBtn = await page.$('button[aria-label="Discard focus session"]')
    await discardBtn.click()
    await sleep(500)

    const swPostDiscard = await page.evaluate(() => !!document.querySelector('button[aria-label="Start focus stopwatch"]'))
    assert(swPostDiscard, 'Focus Stopwatch cleanly resets to idle on Discard')

    // 11. Mobile Viewport & Responsiveness Check
    console.log('\n11. Testing Mobile Viewports & Overflow (320px, 360px, 390px, 430px)...')
    // Reset to Pomodoro
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Pomodoro'))
      if (btn) btn.click()
    })
    await sleep(400)

    const viewports = [
      { width: 320, height: 640 },
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
    ]

    for (const vp of viewports) {
      await page.setViewport(vp)
      await sleep(300)

      // Start timer if idle or resume if paused
      await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Start timer"]') || document.querySelector('button[aria-label="Resume timer"]')
        if (btn) btn.click()
      })
      await sleep(500)

      const overflow = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth
        const winWidth = window.innerWidth
        return { docWidth, winWidth, hasOverflow: docWidth > winWidth }
      })

      assert(!overflow.hasOverflow,
        `Viewport ${vp.width}x${vp.height}: No horizontal overflow (scrollWidth=${overflow.docWidth}px, innerWidth=${overflow.winWidth}px)`)

      // Verify controls are visible and not clipped
      const controlsInVp = await page.evaluate(() => {
        const pauseBtn = document.querySelector('button[aria-label="Pause timer"]')
        const row = pauseBtn ? pauseBtn.parentElement : null
        if (!row) return { visible: false, width: 0, fits: false }
        const r = row.getBoundingClientRect()
        return {
          visible: r.width > 0 && r.height > 0,
          width: r.width,
          left: r.left,
          right: r.right,
          fits: r.left >= 0 && r.right <= window.innerWidth
        }
      })

      assert(controlsInVp.visible && controlsInVp.fits,
        `Viewport ${vp.width}x${vp.height}: 4-button control row fits comfortably (row width=${Math.round(controlsInVp.width)}px <= ${vp.width}px)`)
    }

    // 12. Fullscreen Zen Mode Verification
    console.log('\n12. Testing Zen Mode [Reset] [Pause] [End Session] [Skip] Controls...')
    await page.setViewport({ width: 1280, height: 900 })
    await sleep(500)

    // Ensure timer is running
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Start timer"]') || document.querySelector('button[aria-label="Resume timer"]')
      if (btn) btn.click()
    })
    await sleep(500)

    const zenBtn = await page.$('button[aria-label="Enter Fullscreen Zen Mode"]')
    assert(!!zenBtn, 'Zen Mode button is present')
    if (zenBtn) await zenBtn.click()
    await sleep(600)

    const zenControls = await page.evaluate(() => {
      const overlay = document.querySelector('div.fixed.inset-0.z-50')
      if (!overlay) return { open: false }
      const btns = Array.from(overlay.querySelectorAll('button'))
      const reset = btns.some(b => b.getAttribute('aria-label') === 'Reset timer')
      const pause = btns.some(b => b.getAttribute('aria-label') === 'Pause')
      const end = btns.some(b => b.getAttribute('aria-label') === 'End session')
      const skip = btns.some(b => b.getAttribute('aria-label') === 'Skip session')
      return { open: true, reset, pause, end, skip }
    })

    assert(zenControls.open, 'Zen Mode overlay opened')
    assert(zenControls.reset, 'Zen Mode has Reset button')
    assert(zenControls.end, 'Zen Mode has End Session button')
    assert(zenControls.skip, 'Zen Mode has Skip button')

    // Click End Session in Zen Mode
    await page.evaluate(() => {
      const overlay = document.querySelector('div.fixed.inset-0.z-50')
      const btn = overlay ? overlay.querySelector('button[aria-label="End session"]') : null
      if (btn) btn.click()
    })
    await sleep(400)

    const zenModal = await page.evaluate(() => {
      const modal = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('End Focus Session?'))
      return !!modal
    })
    assert(zenModal, 'End Session confirmation modal renders cleanly on top of Zen Mode')

    // Confirm End Session in Zen Mode
    await page.evaluate(() => {
      const modal = document.querySelector('.fixed.z-\\[110\\]')
      const confirmBtn = modal ? Array.from(modal.querySelectorAll('button')).find(
        b => b.textContent.trim() === 'End Session' && b.className.includes('bg-rose-500')
      ) : null
      if (confirmBtn) confirmBtn.click()
    })
    await sleep(600)

    // Exit Zen Mode
    await page.keyboard.press('Escape')
    await sleep(500)

    console.log('\n========================================================')
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
    console.log('========================================================\n')

  } catch (err) {
    console.error('Test execution error:', err)
    failed++
  } finally {
    await browser.close()
  }

  process.exit(failed > 0 ? 1 : 0)
}

run()
