import puppeteer from 'puppeteer-core'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.resolve(__dirname, '../../.chrome-session')
const BASE_URL = 'http://localhost:5173'

const VIEWPORTS = [
  { name: 'iPhone SE 320x568', width: 320, height: 568, isMobile: true },
  { name: 'iPhone 8 375x667', width: 375, height: 667, isMobile: true },
  { name: 'iPhone 14 390x844', width: 390, height: 844, isMobile: true },
  { name: 'iPad Portrait 768x1024', width: 768, height: 1024, isMobile: true },
  { name: 'iPad Landscape 1024x768', width: 1024, height: 768, isMobile: false },
  { name: 'Laptop 1280x800', width: 1280, height: 800, isMobile: false },
  { name: 'Desktop 1440x900', width: 1440, height: 900, isMobile: false },
  { name: 'FHD 1920x1080', width: 1920, height: 1080, isMobile: false },
  { name: 'QHD 2560x1440', width: 2560, height: 1440, isMobile: false },
]

const ROUTES = [
  { path: '/tasks?view=myday', label: 'My Day' },
  { path: '/tasks?view=inbox', label: 'Inbox' },
  { path: '/tasks?view=upcoming', label: 'Upcoming Tasks' },
  { path: '/tasks?view=all', label: 'All Tasks' },
  { path: '/calendar', label: 'Calendar' },
  { path: '/plan', label: 'Plan My Day' },
  { path: '/timer', label: 'Timer' },
  { path: '/timer-settings', label: 'Timer Settings' },
  { path: '/statistics', label: 'Statistics' },
  { path: '/vocab', label: 'Vocabulary' },
  { path: '/profile', label: 'Profile' },
  { path: '/settings', label: 'Settings' },
]

async function runResponsiveQA() {
  console.log('====================================================')
  console.log('NOCTURN MULTI-VIEWPORT RESPONSIVE AUDIT')
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
  })

  const page = await browser.newPage()

  let totalTests = 0
  let passedTests = 0
  let failedTests = 0

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Auditing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`)
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile })

    for (const route of ROUTES) {
      totalTests++
      try {
        await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 10000 })
        await page.waitForSelector('main, #root', { timeout: 3000 }).catch(() => {})
        await new Promise((r) => setTimeout(r, 100))

        // Check for horizontal overflow
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement
          const scrollW = doc.scrollWidth
          const clientW = window.innerWidth
          return {
            hasOverflow: scrollW > clientW + 2, // Allow 2px tolerance
            scrollW,
            clientW,
          }
        })

        if (overflow.hasOverflow) {
          console.error(`  ✗ FAIL [Overflow]: ${route.label} (scrollWidth: ${overflow.scrollW}px, innerWidth: ${overflow.clientW}px)`)
          failedTests++
        } else {
          passedTests++
        }

        // Verify navigation element presence
        const navState = await page.evaluate((isMob) => {
          const sidebar = document.querySelector('aside[aria-label="Desktop Navigation"]')
          const bottomNav = document.querySelector('nav[aria-label="Mobile Navigation"]')
          return {
            sidebarVisible: sidebar ? window.getComputedStyle(sidebar).display !== 'none' : false,
            bottomNavVisible: bottomNav ? window.getComputedStyle(bottomNav).display !== 'none' : false,
          }
        }, vp.isMobile)

        if (vp.width >= 1024 && !navState.sidebarVisible) {
          console.warn(`  ⚠ WARN: Desktop sidebar not visible on ${route.label} at ${vp.width}px`)
        } else if (vp.width < 1024 && !navState.bottomNavVisible) {
          console.warn(`  ⚠ WARN: Mobile bottom nav not visible on ${route.label} at ${vp.width}px`)
        }

      } catch (err) {
        console.error(`  ✗ FAIL [Error]: ${route.label} - ${err.message}`)
        failedTests++
      }
    }
    console.log(`  ✓ Viewport ${vp.name} completed successfully.`)
  }

  await browser.close()

  console.log('\n====================================================')
  console.log(`RESPONSIVE AUDIT SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (${totalTests} TOTAL)`)
  console.log('====================================================\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runResponsiveQA().catch((err) => {
  console.error('Fatal responsive test runner error:', err)
  process.exit(1)
})
