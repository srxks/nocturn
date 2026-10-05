import puppeteer from 'puppeteer-core'

const BASE_URL = 'http://localhost:5173'

async function check() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  await page.goto(`${BASE_URL}/tasks?view=all`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('nocturn_onboarding_completed', 'true')
    const guestUser = {
      id: 'guest-local-user',
      email: 'guest@nocturn.local',
      user_metadata: { full_name: 'Nocturn User' },
      is_anonymous: true,
    }
    localStorage.setItem('nocturn_auth_user', JSON.stringify(guestUser))
  })
  await page.goto(`${BASE_URL}/tasks?view=all`, { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 1000))

  const input = await page.$('input[placeholder*="Add a task"]')
  if (input) {
    await input.click()
    await input.type('Complete Physics Lab')
    await new Promise(r => setTimeout(r, 300))
    const btn = await page.$('button[aria-label="Submit new task"]')
    if (btn) await btn.click()
    await new Promise(r => setTimeout(r, 1000))
  }

  const snippet = await page.evaluate(() => {
    const span = Array.from(document.querySelectorAll('span')).find(s => s.textContent.trim() === 'Complete Physics Lab')
    if (!span) return 'Span not found'
    let parent = span.parentElement
    while (parent && parent.tagName !== 'BODY' && !parent.getAttribute('data-testid') && !parent.className.includes('border rounded')) {
      parent = parent.parentElement
    }
    return {
      spanTag: span.tagName,
      parentTag: parent?.tagName,
      parentClass: parent?.className,
      parentAttributes: parent ? Array.from(parent.attributes).map(a => `${a.name}="${a.value}"`) : [],
      parentHtml: parent ? parent.outerHTML.slice(0, 400) : null
    }
  })
  console.log('Snippet:', JSON.stringify(snippet, null, 2))

  await browser.close()
}

check().catch(console.error)
