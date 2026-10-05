import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'
import os from 'os'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.join(os.tmpdir(), 'nocturn-qa-vocab-goal-clean')
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
  console.log('NOCTURN VOCABULARY ARCHITECTURE QA AUDIT IN CHROME')
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
    // 1. Initial Load & Guest User Setup
    // ----------------------------------------------------
    console.log('\n--- 1. Initial Load & Guest User Authentication ---')
    await page.goto(`${BASE_URL}/tasks?view=all`, { waitUntil: 'networkidle0' })
    await sleep(800)

    await page.evaluate(async () => {
      localStorage.clear()
      localStorage.setItem('nocturn_onboarding_completed', 'true')
      localStorage.setItem('nocturn_tour_completed', 'true')
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

    await page.goto(`${BASE_URL}/vocab`, { waitUntil: 'networkidle0' })
    await sleep(1500)

    const title = await page.title()
    assert(title.includes('Nocturn'), `App loaded with title: ${title}`)

    // ----------------------------------------------------
    // 2. Vocabulary Home Display
    // ----------------------------------------------------
    console.log('\n--- 2. Vocabulary Home Page Verification ---')
    const pageText = await page.evaluate(() => document.body.innerText)
    assert(pageText.includes('LEARN') && pageText.includes('WORDS'), 'Home displays LEARN X WORDS title')
    assert(pageText.toLowerCase().includes('configured:'), 'Home displays "Configured:" difficulty breakdown')
    assert(pageText.includes("Today's Progress:"), 'Home displays "Today\'s Progress:"')

    const hasStartBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      return btns.some(b => b.innerText.includes('Start Learning') || b.innerText.includes('Continue Learning'))
    })
    assert(hasStartBtn, 'Primary learning action button is visible')

    const hasConfigureBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      return btns.some(b => b.innerText.includes('Configure'))
    })
    assert(hasConfigureBtn, 'Configure button is visible')

    // ----------------------------------------------------
    // 3. Configure Study Session Dialog
    // ----------------------------------------------------
    console.log('\n--- 3. Configure Study Session Dialog (1 Easy, 3 Medium, 1 Hard) ---')
    // Click Configure
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const cfgBtn = btns.find(b => b.innerText.trim() === 'Configure')
      if (cfgBtn) cfgBtn.click()
    })
    await sleep(600)

    const modalVisible = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h2, h3, div'))
      return headings.some(h => h.innerText && h.innerText.includes('Configure Study Session'))
    })
    assert(modalVisible, 'Configure Study Session modal opened successfully')

    // Click "Save Configuration"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const saveBtn = btns.find(b => b.innerText.includes('Save Configuration'))
      if (saveBtn) saveBtn.click()
    })
    await sleep(800)

    // Verify Home reflects: Configured: 1 Easy · 3 Medium · 1 Hard, LEARN 5 WORDS
    const updatedHomeText = await page.evaluate(() => document.body.innerText)
    assert(updatedHomeText.includes('LEARN 5 WORDS'), 'Home displays LEARN 5 WORDS')
    assert(
      updatedHomeText.includes('1 Easy · 3 Medium · 1 Hard'),
      'Home displays Configured: 1 Easy · 3 Medium · 1 Hard'
    )
    assert(
      updatedHomeText.includes("0 / 5 Words"),
      'Home displays Today\'s Progress: 0 / 5 Words'
    )

    // Check that saving configuration DID NOT mark words as learned or modify vocab tables
    const dbCheck = await page.evaluate(async () => {
      const { db } = await import('/src/db/db.js')
      const vocabCount = await db.vocab.count()
      return { vocabCount }
    })
    assert(dbCheck.vocabCount === 0, `db.vocab count is 0 after saving config (actual: ${dbCheck.vocabCount})`)

    // ----------------------------------------------------
    // 4. Start Learning & Randomized Selection Engine
    // ----------------------------------------------------
    console.log('\n--- 4. Start Learning & Randomized Non-Alphabetical Selection ---')
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const startBtn = btns.find(b => b.innerText.includes('Start Learning'))
      if (startBtn) startBtn.click()
    })
    await sleep(1500)

    const currentUrl = page.url()
    assert(currentUrl.includes('/vocab/learn'), `Navigated to learning session: ${currentUrl}`)

    // Inspect the words generated for this session
    const sessionDetails = await page.evaluate(async () => {
      const { db } = await import('/src/db/db.js')
      const logs = await db.dailyVocabLogs.toArray()
      const latest = logs[logs.length - 1]
      return {
        hasLog: !!latest,
        words: latest ? latest.words : [],
        config: latest ? latest.config : null,
      }
    })

    assert(sessionDetails.hasLog, 'Daily vocab log was created on session start')
    assert(sessionDetails.words.length === 5, `Session contains exactly 5 words (actual: ${sessionDetails.words.length})`)

    const wordObjects = sessionDetails.words
    const easyCount = wordObjects.filter(w => (w.difficulty || '').toLowerCase() === 'easy').length
    const medCount = wordObjects.filter(w => (w.difficulty || '').toLowerCase() === 'medium').length
    const hardCount = wordObjects.filter(w => (w.difficulty || '').toLowerCase() === 'hard').length

    assert(easyCount === 1, `Contains exactly 1 Easy word (actual: ${easyCount})`)
    assert(medCount === 3, `Contains exactly 3 Medium words (actual: ${medCount})`)
    assert(hardCount === 1, `Contains exactly 1 Hard word (actual: ${hardCount})`)

    const wordNames = wordObjects.map(w => w.word)
    console.log(`  Generated Words: ${wordNames.join(', ')}`)

    // Check not alphabetical
    const sortedWords = [...wordNames].sort()
    const isStrictlyAlphabetical = JSON.stringify(wordNames) === JSON.stringify(sortedWords)
    console.log(`  Is session strictly alphabetical? ${isStrictlyAlphabetical}`)
    const allStartWithA = wordNames.every(w => w.toLowerCase().startsWith('a'))
    assert(!allStartWithA, 'Words are sampled across the dataset, not just first alphabetical rows')

    // Check unique words
    const uniqueWords = new Set(wordNames)
    assert(uniqueWords.size === 5, 'All 5 words in session are unique (no duplicates)')

    // ----------------------------------------------------
    // 5. Card Progression & Learning Completion
    // ----------------------------------------------------
    console.log('\n--- 5. Card Progression & Learning Flow ---')
    for (let i = 0; i < 5; i++) {
      const cardWord = await page.evaluate(() => {
        const h = document.querySelector('h1, h2, .font-serif, .font-bold')
        return h ? h.innerText : ''
      })
      console.log(`  Step ${i + 1}/5: Viewing word card "${cardWord}"`)

      const clicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'))
        const nextBtn = btns.find(b => b.innerText.includes('Next') || b.innerText.includes('Complete') || b.innerText.includes('Mark as Learned'))
        if (nextBtn) {
          nextBtn.click()
          return true
        }
        return false
      })
      assert(clicked, `Clicked action button on card ${i + 1}`)
      await sleep(600)
    }

    // Return to Vocab Home
    console.log('\n--- 6. Return to Vocab Home & Verify Progress ---')
    await page.goto(`${BASE_URL}/vocab`, { waitUntil: 'networkidle0' })
    await sleep(1000)

    const postLearnText = await page.evaluate(() => document.body.innerText)
    assert(
      postLearnText.includes("5 / 5 Words") || postLearnText.includes('Review Set') || postLearnText.includes('Complete'),
      'Home reflects today\'s completed progress'
    )

    // ----------------------------------------------------
    // 7. Custom Configuration (0 Easy, 4 Medium, 0 Hard)
    // ----------------------------------------------------
    console.log('\n--- 7. Custom Difficulty Configuration (0 Easy, 4 Medium, 0 Hard) ---')
    await page.evaluate(async () => {
      const { saveVocabSessionConfig } = await import('/src/services/vocabService.js')
      await saveVocabSessionConfig('guest-local-user', { easy: 0, medium: 4, hard: 0 })
      const { db } = await import('/src/db/db.js')
      await db.dailyVocabLogs.clear()
    })

    await page.goto(`${BASE_URL}/vocab`, { waitUntil: 'networkidle0' })
    await sleep(1200)

    const customText = await page.evaluate(() => document.body.innerText)
    assert(customText.includes('LEARN 4 WORDS'), 'Home displays LEARN 4 WORDS for custom config')
    assert(
      customText.includes('0 Easy · 4 Medium · 0 Hard'),
      'Home displays Configured: 0 Easy · 4 Medium · 0 Hard'
    )
    assert(
      customText.includes('Start Learning (4 Words)'),
      'Button displays Start Learning (4 Words)'
    )

    // Click Start Learning with custom config
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const startBtn = btns.find(b => b.innerText.includes('Start Learning (4 Words)'))
      if (startBtn) startBtn.click()
    })
    await sleep(1500)

    const customSession = await page.evaluate(async () => {
      const { db } = await import('/src/db/db.js')
      const logs = await db.dailyVocabLogs.toArray()
      const latest = logs[logs.length - 1]
      return latest ? latest.words : []
    })

    assert(customSession.length === 4, `Custom session generated exactly 4 words (actual: ${customSession.length})`)
    const customMedCount = customSession.filter(w => (w.difficulty || '').toLowerCase() === 'medium').length
    const customEasyCount = customSession.filter(w => (w.difficulty || '').toLowerCase() === 'easy').length
    const customHardCount = customSession.filter(w => (w.difficulty || '').toLowerCase() === 'hard').length

    assert(customMedCount === 4, `All 4 words are Medium difficulty (actual: ${customMedCount})`)
    assert(customEasyCount === 0, `0 Easy words selected (actual: ${customEasyCount})`)
    assert(customHardCount === 0, `0 Hard words selected (actual: ${customHardCount})`)

    // ----------------------------------------------------
    // 8. Zero Total Configuration (0 Easy, 0 Medium, 0 Hard)
    // ----------------------------------------------------
    console.log('\n--- 8. Zero Total Configuration Edge Case ---')
    await page.evaluate(async () => {
      const { saveVocabSessionConfig } = await import('/src/services/vocabService.js')
      await saveVocabSessionConfig('guest-local-user', { easy: 0, medium: 0, hard: 0 })
    })

    await page.goto(`${BASE_URL}/vocab`, { waitUntil: 'networkidle0' })
    await sleep(1000)

    const zeroText = await page.evaluate(() => document.body.innerText)
    assert(zeroText.includes('LEARN 0 WORDS'), 'Home displays LEARN 0 WORDS when all zero')

    const isStartDisabled = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const startBtn = btns.find(b => b.innerText.includes('Start Learning') || b.innerText.includes('Configure Words'))
      return startBtn ? startBtn.disabled : true
    })
    assert(isStartDisabled, 'Start Learning button is disabled when total is 0')

  } catch (err) {
    console.error(`Test execution failed with error:`, err)
    failed++
  } finally {
    await browser.close()
  }

  console.log('\n========================================================')
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('========================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

run()
