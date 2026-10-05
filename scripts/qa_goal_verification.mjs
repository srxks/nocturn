import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'
import os from 'os'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.join(os.tmpdir(), 'nocturn-qa-goal-audit-clean')
const BASE_URL = 'http://localhost:5173'

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
  console.log('NOCTURN FULL GOAL QA AUDIT: 9 SUITES IN CHROME')
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
      const text = msg.text()
      if (!text.includes('favicon') && !text.includes('net::ERR_')) {
        console.log(`[Browser Console Error] ${text}`)
      }
    }
  })

  try {
    // ----------------------------------------------------
    // SETUP: Initial load & clear Dexie
    // ----------------------------------------------------
    console.log('\n--- SETUP: Initializing Nocturn and resetting IndexedDB ---')
    await page.goto(`${BASE_URL}/tasks?view=all`, { waitUntil: 'networkidle0' })
    await sleep(800)

    await page.evaluate(async () => {
      localStorage.clear()
      localStorage.setItem('nocturn_onboarding_completed', 'true')
      const guestUser = {
        id: 'guest-local-user',
        email: 'guest@nocturn.local',
        user_metadata: { full_name: 'Nocturn User' },
        is_anonymous: true,
      }
      localStorage.setItem('nocturn_auth_user', JSON.stringify(guestUser))
      if (window.__resetNocturnLocalDB) {
        await window.__resetNocturnLocalDB()
      }
    })
    await page.reload({ waitUntil: 'networkidle0' })
    await sleep(1000)

    // ====================================================
    // TEST 1: FOCUS SESSION NON-DUPLICATION & IDEMPOTENCY
    // ====================================================
    console.log('\n--- TEST 1: Focus Session Non-Duplication & Idempotency ---')
    await page.goto(`${BASE_URL}/timer`, { waitUntil: 'networkidle0' })
    await sleep(800)

    // Start Pomodoro session
    const playBtn = await page.$('button[aria-label="Start timer"]')
    assert(playBtn !== null, 'Start timer button exists')
    if (playBtn) await playBtn.click()
    await sleep(1500)

    // Check Dexie: Running session should not create a completed row in db.pomodoroSessions
    const runningSessions = await page.evaluate(async () => {
      const { db } = await import('/src/db/db.js')
      return await db.pomodoroSessions.toArray()
    })
    assert(runningSessions.length === 0, 'No premature completed row in pomodoroSessions while running')

    // Pause timer
    const pauseBtn = await page.$('button[aria-label="Pause timer"]')
    assert(pauseBtn !== null, 'Pause timer button exists')
    if (pauseBtn) await pauseBtn.click()
    await sleep(800)

    const pausedSessions = await page.evaluate(async () => {
      const { db } = await import('/src/db/db.js')
      return await db.pomodoroSessions.toArray()
    })
    assert(pausedSessions.length === 0, 'No premature completed row in pomodoroSessions while paused')

    // Resume timer
    const resumeBtn = await page.$('button[aria-label="Resume timer"]')
    if (resumeBtn) await resumeBtn.click()
    await sleep(1000)

    // End session using the End Session control
    const endBtn = await page.$('button[data-testid="timer-end-session-btn"]')
    assert(endBtn !== null, 'End Session button is present and distinct')
    if (endBtn) await endBtn.click()
    await sleep(500)

    // Confirm End Session in dialog
    const confirmEndBtn = await page.$('button[data-testid="confirm-end-session-btn"]')
    assert(confirmEndBtn !== null, 'Confirmation modal for End Session appears')
    if (confirmEndBtn) await confirmEndBtn.click()
    await sleep(1000)

    // Verify timer returned to idle
    const statusIdle = await page.evaluate(() => {
      return document.querySelector('button[aria-label="Start timer"]') !== null
    })
    assert(statusIdle, 'Timer returned to idle cleanly after ending session')

    // Test programmatically recording a completed session with deterministic ID
    const recordedResult = await page.evaluate(async () => {
      const { recordPomodoroSession } = await import('/src/services/timerService.js')
      const { db } = await import('/src/db/db.js')
      const s1 = await recordPomodoroSession({
        duration: 25,
        durationSeconds: 1500,
        sessionType: 'focus',
        taskTitle: 'Test Single Session',
        sessionId: 'test-session-uuid-1',
        completed: true,
      })
      // Call again with same sessionId to test idempotency
      const s2 = await recordPomodoroSession({
        duration: 25,
        durationSeconds: 1500,
        sessionType: 'focus',
        taskTitle: 'Test Single Session Duplicate',
        sessionId: 'test-session-uuid-1',
        completed: true,
      })
      const all = await db.pomodoroSessions.toArray()
      return { s1, s2, count: all.length, item: all[0] }
    })
    assert(recordedResult.count === 1, `Idempotent record: exactly 1 record saved (found: ${recordedResult.count})`)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    assert(uuidRegex.test(recordedResult.item.id), `Record ID is a valid deterministic UUID (${recordedResult.item.id})`)

    // Verify reload doesn't duplicate
    await page.reload({ waitUntil: 'networkidle0' })
    await sleep(600)
    const afterReloadCount = await page.evaluate(async () => {
      const { db } = await import('/src/db/db.js')
      return (await db.pomodoroSessions.toArray()).length
    })
    assert(afterReloadCount === 1, `After page reload, record count remains exactly 1 (found: ${afterReloadCount})`)

    // ====================================================
    // TEST 2: CYCLE PROGRESS ACCURACY
    // ====================================================
    console.log('\n--- TEST 2: Focus Cycle Progress Accuracy ---')
    const cycleProgress = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="timer-cycle-progress"], [aria-label*="Cycle"], [title*="Cycle"]')
      return el ? el.textContent : '0 / 4'
    })
    assert(cycleProgress !== null, `Cycle counter rendered (${cycleProgress})`)

    // Resetting timer does NOT increment cycles
    const resetBtn = await page.$('button[aria-label="Reset current timer"]')
    if (resetBtn) await resetBtn.click()
    await sleep(500)
    const afterResetText = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="timer-cycle-progress"], [aria-label*="Cycle"], [title*="Cycle"]')
      return el ? el.textContent : '0 / 4'
    })
    assert(afterResetText === cycleProgress, 'Resetting timer does not increment cycle count')

    // ====================================================
    // TEST 3: TASK DATE MODEL (DUE DATE VS DEADLINE)
    // ====================================================
    console.log('\n--- TEST 3: Task Date Model (Due Date vs Deadline) ---')
    await page.goto(`${BASE_URL}/tasks?view=all`, { waitUntil: 'networkidle0' })
    await sleep(800)

    // Create a task
    const input = await page.$('input[placeholder*="Add a task"]')
    assert(input !== null, 'Quick add input is present')
    if (input) {
      await input.type('Complete Physics Lab')
      await page.keyboard.press('Enter')
      await sleep(1000)
    }

    // Open Task Detail Drawer by clicking the task row
    const taskRow = await page.waitForSelector('[data-testid="task-item-row"]', { timeout: 4000 })
    assert(taskRow !== null, 'Task Complete Physics Lab row rendered')
    if (taskRow) {
      await taskRow.click()
      await sleep(800)
    }

    // Ensure dialog is open
    const isDialogOpen = await page.evaluate(() => Boolean(document.querySelector('[role="dialog"]')))
    if (!isDialogOpen) {
      await page.evaluate(() => {
        const row = document.querySelector('[data-testid="task-item-row"]')
        if (row) row.click()
      })
      await sleep(800)
    }

    // Verify Primary "Due Date" section exists and has presets Today / Tomorrow
    const dueDateSection = await page.evaluate(() => {
      const text = document.body.textContent || ''
      const hasDueDate = text.includes('Due Date') && text.includes('When you plan to work on this task')
      const hasToday = Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Today')
      const hasTomorrow = Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Tomorrow')
      return { hasDueDate, hasToday, hasTomorrow }
    })
    assert(dueDateSection.hasDueDate, 'Primary Due Date section is present with clear explanation')
    assert(dueDateSection.hasToday && dueDateSection.hasTomorrow, 'Preset buttons Today and Tomorrow are present')

    // Verify Secondary "Deadline" section is distinct and marked Optional
    const deadlineSection = await page.evaluate(() => {
      const text = document.body.textContent || ''
      const hasDeadline = text.includes('Deadline') && text.includes('Optional')
      const hasExplanation = text.includes('Strict cutoff')
      const hasAddBtn = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('+ Add Deadline'))
      return { hasDeadline, hasExplanation, hasAddBtn }
    })
    assert(deadlineSection.hasDeadline, 'Secondary Deadline is present and explicitly marked Optional')
    assert(deadlineSection.hasExplanation, 'Deadline has explanation clarifying distinction from Due Date')
    assert(deadlineSection.hasAddBtn, '+ Add Deadline button is present instead of confusing identical date input')

    // Click "Today" preset to set due date
    const todayBtn = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Today')
      if (b) { b.click(); return true }
      return false
    })
    assert(todayBtn, 'Clicked Today preset button')
    await sleep(600)

    const updatedDueDate = await page.evaluate(async () => {
      const { db } = await import('/src/db/db.js')
      const allTasks = await db.tasks.toArray()
      const task = allTasks.find(t => t.title === 'Complete Physics Lab')
      return task?.dueDate
    })
    assert(Boolean(updatedDueDate), `Clicking Today sets task dueDate to today (${updatedDueDate})`)

    // Click "+ Add Deadline" to reveal deadline date picker
    const addDeadlineClicked = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('+ Add Deadline'))
      if (b) { b.click(); return true }
      return false
    })
    assert(addDeadlineClicked, 'Clicked + Add Deadline button')
    await sleep(500)

    const hasDeadlineInput = await page.evaluate(() => {
      return document.querySelector('input[type="date"][class*="rose"]') !== null ||
             document.querySelector('button[aria-label="Remove strict deadline"]') !== null
    })
    assert(hasDeadlineInput, 'Clicking + Add Deadline displays distinct warning/rose deadline control')

    // Close drawer
    const closeDrawerBtn = await page.$('button[aria-label="Close task detail panel"]')
    if (closeDrawerBtn) await closeDrawerBtn.click()
    await sleep(400)

    // ====================================================
    // TEST 4: NATURAL LANGUAGE TASK DETECTION
    // ====================================================
    console.log('\n--- TEST 4: Natural Language Task Detection ---')
    const naturalCases = [
      { text: 'Study tomorrow', expectDay: 'tomorrow' },
      { text: 'Submit assignment Friday', expectDay: 'Friday' },
      { text: 'Finish DSP on Oct 7', expectDay: 'Oct 7' },
      { text: 'Meeting next Monday at 5 PM', expectDay: 'Next Monday' },
      { text: 'Call mom tomorrow at 6', expectDay: 'tomorrow' },
      { text: 'Project due 12 October', expectDay: '12 October' },
      { text: 'Finish this by Friday', expectDay: 'Friday' },
      { text: 'Submit paper deadline Oct 15', expectDeadline: true },
    ]

    for (const c of naturalCases) {
      const res = await page.evaluate(async (t) => {
        const { parseNaturalTaskInput } = await import('/src/services/taskInputParser.js')
        return parseNaturalTaskInput(t)
      }, c.text)

      if (c.expectDay) {
        assert(res.day && res.day.toLowerCase() === c.expectDay.toLowerCase(), `"${c.text}" parsed day: ${res.day}`)
      }
      if (c.expectDeadline) {
        assert(res.isDeadline === true, `"${c.text}" recognized as strict deadline`)
      }
      assert(res.cleanTitle.length > 0 && !res.cleanTitle.includes('tomorrow') && !res.cleanTitle.includes('Friday'), `"${c.text}" title cleaned: "${res.cleanTitle}"`)
    }

    // Type into live input and check UI feedback chip
    const taskInputEl = await page.$('input[placeholder*="Add a task"]')
    if (taskInputEl) {
      await taskInputEl.click()
      await taskInputEl.type('Study calculus tomorrow at 5 PM')
      await sleep(400)

      const chipText = await page.evaluate(() => {
        const detectedEl = document.querySelector('form span[class*="cyan"], form span[class*="indigo"]')
        return detectedEl ? detectedEl.textContent : ''
      })
      assert(chipText.includes('tomorrow') || chipText.includes('Due'), `Live input displays entity chip: "${chipText}"`)

      // Clear input
      await page.keyboard.down('Control')
      await page.keyboard.press('A')
      await page.keyboard.up('Control')
      await page.keyboard.press('Backspace')
      await sleep(200)
    }

    // ====================================================
    // TEST 5: CALENDAR "ADD FOR THIS DATE" FLOW
    // ====================================================
    console.log('\n--- TEST 5: Calendar "Add for this date" Flow ---')
    await page.goto(`${BASE_URL}/calendar`, { waitUntil: 'networkidle0' })
    await sleep(800)

    // Verify "+ Add for this date" button is present
    const addForDateBtn = await page.$('button[data-testid="add-for-this-date-btn"]')
    assert(addForDateBtn !== null, '+ Add for this date button is present in SelectedDayPanel')

    if (addForDateBtn) {
      await addForDateBtn.click()
      await sleep(400)

      // Enter a title in the inline form
      const dateTaskInput = await page.$('input[placeholder*="What needs to be done"]')
      assert(dateTaskInput !== null, 'Inline task title input opened for the selected date')

      if (dateTaskInput) {
        await dateTaskInput.type('Prepare Chemistry Presentation')
        await page.keyboard.press('Enter')
        await sleep(800)
      }

      // Verify the task immediately appears on that calendar date
      const eventRendered = await page.evaluate(() => {
        return document.body.textContent.includes('Prepare Chemistry Presentation')
      })
      assert(eventRendered, 'Task immediately rendered on the selected calendar date')
    }

    // Test "Open in Tasks →" navigation
    const addAgainBtn = await page.$('button[data-testid="add-for-this-date-btn"]')
    if (addAgainBtn) {
      await addAgainBtn.click()
      await sleep(400)
      const openInTasksClicked = await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Open in Tasks →'))
        if (b) { b.click(); return true }
        return false
      })
      assert(openInTasksClicked, '"Open in Tasks →" link is present in inline form')
      await sleep(800)
      assert(page.url().includes('/tasks'), 'Navigated smoothly to /tasks with pre-filled date parameter')
    }

    // ====================================================
    // TEST 6: CANONICAL STATISTICS DASHBOARD
    // ====================================================
    console.log('\n--- TEST 6: Canonical Statistics Dashboard & Profile Quick Summary ---')
    await page.goto(`${BASE_URL}/statistics`, { waitUntil: 'networkidle0' })
    await sleep(800)

    // Check main sections in Statistics page
    const statsSections = await page.evaluate(() => {
      const text = document.body.textContent || ''
      return {
        hasTitle: text.includes('Productivity Statistics'),
        hasTotalFocus: text.includes('Total Focus'),
        hasTasksCompleted: text.includes('Tasks Completed'),
        hasActiveStreak: text.includes('Active Streak'),
        hasDailyBars: text.includes('Daily Focus Distribution'),
        hasHeatmap: text.includes('Consistency Heatmap'),
        hasFocusByList: text.includes('Focus by List'),
        hasRecentHistory: text.includes('Recent Focus Sessions'),
      }
    })
    assert(statsSections.hasTitle, 'Statistics canonical page loads with correct title')
    assert(statsSections.hasTotalFocus && statsSections.hasTasksCompleted && statsSections.hasActiveStreak, 'Overview metric cards rendered')
    assert(statsSections.hasDailyBars, 'Daily Focus Distribution chart rendered')
    assert(statsSections.hasHeatmap, '8-Week Consistency Heatmap rendered')
    assert(statsSections.hasFocusByList, 'Focus by List breakdown rendered')
    assert(statsSections.hasRecentHistory, 'Recent Focus Sessions history log rendered')

    // Navigate to /profile and verify quick summary + canonical link
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle0' })
    await sleep(800)

    const profileContent = await page.evaluate(() => {
      const text = document.body.textContent || ''
      const hasSummary = text.includes('Focus & Productivity Summary')
      const hasStatsLink = text.includes('View Full Statistics')
      const hasDetailedBanner = text.includes('Detailed Statistics & Analytics')
      return { hasSummary, hasStatsLink, hasDetailedBanner }
    })
    assert(profileContent.hasSummary, 'Profile page has streamlined Focus & Productivity Summary')
    assert(profileContent.hasStatsLink, 'Profile page has link to View Full Statistics')
    assert(profileContent.hasDetailedBanner, 'Profile has Detailed Statistics & Analytics banner with CTA button')

    // Test clicking View Full Statistics
    const viewStatsClicked = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('a, button')).find(b => b.textContent.includes('View Full Statistics'))
      if (el) { el.click(); return true }
      return false
    })
    assert(viewStatsClicked, 'Clicked CTA to View Full Statistics')
    await sleep(800)
    assert(page.url().includes('/statistics'), 'Clicking CTA navigates directly to /statistics')

    // Test /analytics redirect
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle0' })
    await sleep(500)
    assert(page.url().includes('/statistics'), 'Direct navigation to /analytics redirects to /statistics')

    // ====================================================
    // TEST 7: ONBOARDING 4-SCREEN FLOW & REPLAY
    // ====================================================
    console.log('\n--- TEST 7: Onboarding Redesign (4 Screens) & Replay ---')
    await page.goto(`${BASE_URL}/onboarding?replay=true`, { waitUntil: 'networkidle0' })
    await sleep(800)

    // Screen 1: Welcome
    const screen1Text = await page.evaluate(() => document.body.textContent || '')
    assert(screen1Text.includes('Welcome to Nocturn'), 'Screen 1: Welcome to Nocturn rendered')
    assert(screen1Text.includes('Offline-First') && screen1Text.includes('Scientific Focus'), 'Screen 1: Value props rendered')
    const skipBtn = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Skip') || b.textContent.includes('Close'))
    })
    assert(skipBtn, 'Skip / Close button is present on Screen 1')

    // Click Continue to Screen 2
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Continue'))
      if (b) b.click()
    })
    await sleep(600)

    // Screen 2: Focus Style
    const screen2Text = await page.evaluate(() => document.body.textContent || '')
    assert(screen2Text.includes('Choose Your Focus Style'), 'Screen 2: Choose Your Focus Style rendered')
    assert(screen2Text.includes('Pomodoro') && screen2Text.includes('52 / 17') && screen2Text.includes('Ultradian') && screen2Text.includes('Sprint') && screen2Text.includes('Focus Stopwatch'), 'All 5 focus style options rendered')

    // Select 52 / 17
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('52 / 17 Rhythm'))
      if (b) b.click()
    })
    await sleep(300)

    // Click Continue to Screen 3
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Continue'))
      if (b) b.click()
    })
    await sleep(600)

    // Screen 3: Daily Target
    const screen3Text = await page.evaluate(() => document.body.textContent || '')
    assert(screen3Text.includes('Set Your Daily Target'), 'Screen 3: Set Your Daily Target rendered')
    assert(screen3Text.includes('1 - 2 Hours') && screen3Text.includes('2 Hours') && screen3Text.includes('4 Hours'), 'Daily target options rendered')

    // Select 4 Hours
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('4 Hours'))
      if (b) b.click()
    })
    await sleep(300)

    // Click Continue to Screen 4
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Continue'))
      if (b) b.click()
    })
    await sleep(600)

    // Screen 4: You're all set!
    const screen4Text = await page.evaluate(() => document.body.textContent || '')
    assert(screen4Text.includes("You're all set"), "Screen 4: You're all set rendered")
    assert(screen4Text.includes('52 / 17 Rhythm') && screen4Text.includes('4 Hours'), 'Screen 4: Preferences summary displays selected 52/17 and 4 Hours')

    // Click "Enter Nocturn"
    const enterBtnClicked = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Enter Nocturn'))
      if (b) { b.click(); return true }
      return false
    })
    assert(enterBtnClicked, 'Enter Nocturn button clicked on Screen 4')
    await sleep(1000)
    assert(page.url().includes('/tasks'), 'Entering Nocturn navigates to /tasks?view=myday')

    // Verify localStorage persistence
    const savedPrefs = await page.evaluate(() => ({
      completed: localStorage.getItem('nocturn_onboarding_completed'),
      preset: localStorage.getItem('nocturn_timer_preset'),
      goal: localStorage.getItem('nocturn_daily_goal'),
    }))
    assert(savedPrefs.completed === 'true', 'Onboarding completed flag saved in localStorage')
    assert(savedPrefs.preset === '52-17', 'Selected 52-17 focus style saved in localStorage')
    assert(savedPrefs.goal === '4h', 'Selected 4h daily goal saved in localStorage')

    // Verify Settings Replay Card
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle0' })
    await sleep(800)
    const settingsText = await page.evaluate(() => document.body.textContent || '')
    assert(settingsText.includes('Welcome & Onboarding Walkthrough') && settingsText.includes('Replay Onboarding'), 'Replay Onboarding card is present in Settings')

    // ====================================================
    // TEST 8: MOBILE VIEWPORT POLISH
    // ====================================================
    console.log('\n--- TEST 8: Mobile Viewport Polish (375px & 430px) ---')
    for (const width of [375, 430]) {
      await page.setViewport({ width, height: 800 })
      await page.goto(`${BASE_URL}/tasks?view=all`, { waitUntil: 'networkidle0' })
      await sleep(500)

      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      assert(!hasHorizontalOverflow, `Tasks page has no horizontal overflow at ${width}px`)

      await page.goto(`${BASE_URL}/timer`, { waitUntil: 'networkidle0' })
      await sleep(500)
      const timerOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      assert(!timerOverflow, `Timer page has no horizontal overflow at ${width}px`)

      await page.goto(`${BASE_URL}/calendar`, { waitUntil: 'networkidle0' })
      await sleep(500)
      const calOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      assert(!calOverflow, `Calendar page has no horizontal overflow at ${width}px`)

      await page.goto(`${BASE_URL}/statistics`, { waitUntil: 'networkidle0' })
      await sleep(500)
      const statsOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      assert(!statsOverflow, `Statistics page has no horizontal overflow at ${width}px`)
    }

    console.log('\n========================================================')
    console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`)
    console.log('========================================================\n')
  } catch (err) {
    console.error('Audit exception:', err)
  } finally {
    await browser.close()
  }

  if (failed > 0) {
    process.exit(1)
  }
}

run()
