import { chromium } from 'playwright'

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173'

const routes = [
  '/dash', '/orders', '/assign', '/attend', '/payroll', '/counties', '/linkcheck',
  '/reports', '/company', '/leads', '/billing', '/mywork', '/intake',
  '/commitment', '/leave', '/payslips', '/hiring', '/petty', '/integ', '/onboard',
  '/signin', '/myperf', '/mypay', '/orders/new',
  '/',
  '/payslips/pd',
  '/staff/pd', '/clients/MGR', '/leads/l1', '/leads/new',
  '/staff/nobody', '/clients/NOPE', '/leads/nope',
]

const launchOptions = {
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    ...(process.env.SMOKE_SINGLE_PROCESS === 'true' ? ['--single-process'] : []),
  ],
  timeout: 30_000,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
}

const EMAIL = process.env.SMOKE_EMAIL ?? 'harry.whitfield@keystoneabstract.com'
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'titlecrm-dev'

async function signIn() {
  const browser = await chromium.launch(launchOptions)
  try {
    const page = await browser.newPage()
    await page.goto(BASE + '/signin', { waitUntil: 'domcontentloaded', timeout: 15_000 })
    await page.waitForSelector('main input', { timeout: 10_000 })
    await page.locator('main input[type="email"]').fill(EMAIL)
    await page.locator('main input[type="password"]').fill(PASSWORD)
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await page.waitForURL((u) => !u.pathname.startsWith('/signin'), { timeout: 15_000 })
    return await page.context().storageState()
  } finally {
    await browser.close().catch(() => {})
  }
}

let storageState
try {
  storageState = await signIn()
  console.log(`signed in as ${EMAIL}\n`)
} catch (e) {
  console.error(
    `could not sign in as ${EMAIL} — ${e.message.split('\n')[0]}\n` +
      'This check drives the real sign-in form, so it needs the API running and ' +
      'the database seeded. See the comment at the top of this file.',
  )
  process.exit(1)
}

let rendered = 0
const problems = []

for (const route of routes) {
  const browser = await chromium.launch(launchOptions)
  try {
    const context = await browser.newContext({ storageState })
    const page = await context.newPage()
    page.on('pageerror', (e) => problems.push(`${route} threw :: ${e.message}`))
    page.on('console', (m) => {
      const text = m.text()
      if (m.type() === 'error' && !/favicon|Failed to load resource|net::ERR/.test(text)) {
        problems.push(`${route} logged :: ${text}`)
      }
    })

    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 15_000 })
    await page.waitForSelector('main', { timeout: 10_000 })
    await page.waitForTimeout(200)

    const text = (await page.locator('main').innerText().catch(() => '')).trim()
    const heading = text.split('\n').filter(Boolean)[0] ?? '(empty)'

    const bounced = /^email$/i.test(heading) && /password/i.test(text)

    if (bounced) problems.push(`${route} bounced to the sign-in form`)
    else if (text) rendered++
    else problems.push(`${route} rendered an empty main`)
    console.log(route.padEnd(14) + heading.slice(0, 58))
  } catch (e) {
    problems.push(`${route} failed :: ${e.message.split('\n')[0]}`)
    console.log(route.padEnd(14) + 'FAILED')
  } finally {
    await browser.close().catch(() => {})
  }
}

console.log(`\nrendered: ${rendered}/${routes.length}`)
console.log(`problems: ${problems.length}`)
problems.forEach((p) => console.log('  ' + p))

process.exit(problems.length ? 1 : 0)
