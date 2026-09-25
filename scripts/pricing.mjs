import { chromium } from 'playwright'

const BASE = process.env.PRICING_URL ?? 'http://localhost:5173'
const EMAIL = process.env.PRICING_EMAIL ?? 'ashok.s@keystoneabstract.com'
const PASSWORD = process.env.PRICING_PASSWORD ?? 'titlecrm-dev'
const ADMIN_EMAIL = process.env.PRICING_ADMIN_EMAIL ?? 'harry.whitfield@keystoneabstract.com'

const routes = [
  '/dash', '/orders', '/orders/new', '/orders/4192254-2', '/assign', '/intake',
  '/commitment', '/reports', '/reports?tab=Received&focus=clients', '/attend',
  '/leave', '/loans', '/counties', '/linkcheck', '/mywork', '/myperf', '/mypay',
  '/company', '/staff/us', '/staff/hw',
]

const DOLLARS = /\$\s?\d/
const RUPEES = /\u20B9\s?\d/

const launchOptions = {
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  timeout: 30_000,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
}

const browser = await chromium.launch(launchOptions)
const problems = []

const signIn = async (email) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(BASE + '/signin', { waitUntil: 'domcontentloaded', timeout: 15_000 })
  await page.waitForSelector('main input[type="email"]', { timeout: 15_000 })
  await page.locator('main input[type="email"]').fill(email)
  await page.locator('main input[type="password"]').fill(PASSWORD)
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/signin'), { timeout: 20_000 })
  console.log(`signed in as ${email}\n`)
  return page
}

const lookOn = (page, patterns) => async (where) => {
  const text = await page.locator('main').innerText().catch(() => '')
  const hit = text.split('\n').find((line) => patterns.some((p) => p.test(line)))
  if (hit) problems.push(`${where} shows "${hit.trim().slice(0, 80)}"`)
}

const walkTabs = async (page, route, look) => {
  const tabs = page.locator('main [role="tab"]')
  const n = await tabs.count()
  for (let i = 0; i < n; i++) {
    const label = (await tabs.nth(i).innerText()).trim().split('\n')[0]
    await tabs.nth(i).click()
    await page.waitForTimeout(150)
    await look(`${route} › ${label}`)
  }
  return n
}

try {
  const page = await signIn(EMAIL)
  const look = lookOn(page, [DOLLARS])

  for (const route of routes) {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 15_000 })
    await page.waitForSelector('main', { timeout: 15_000 })
    await page.waitForTimeout(300)
    await look(route)
    const n = await walkTabs(page, route, look)
    console.log(route.padEnd(40) + (n ? `${n} tabs` : ''))
  }
  await page.context().close()

  const admin = await signIn(ADMIN_EMAIL)
  await admin.goto(BASE + '/company?tab=Roles', { waitUntil: 'domcontentloaded', timeout: 15_000 })
  await admin.locator('main button[title="Edit Company admin"]').click()
  const dialog = admin.locator('[role="dialog"]')
  await dialog.locator('label', { hasText: 'See pricing and invoices' }).locator('input[type="checkbox"]').uncheck()
  await dialog.getByRole('button', { name: /^save role$/i }).click()
  await dialog.waitFor({ state: 'hidden', timeout: 5_000 })
  console.log('took “pricing” off the admin role, keeping “people”\n')

  const route = '/company (people without pricing)'
  const n = await walkTabs(admin, route, lookOn(admin, [DOLLARS, RUPEES]))
  console.log(route.padEnd(40) + `${n} tabs`)
  if (!n) problems.push(`${route} showed no tabs`)
  await admin.locator('main [role="tab"]', { hasText: /^Payroll$/ }).click()
  const payroll = await admin.locator('main').innerText()
  if (!payroll.includes('“pricing” capability'))
    problems.push(`${route} › Payroll did not say it needs “pricing”, so the role edit did not take`)
} catch (e) {
  problems.push(`run failed :: ${e.message.split('\n')[0]}`)
} finally {
  await browser.close().catch(() => {})
}

console.log(`\nproblems: ${problems.length}`)
problems.forEach((p) => console.log('  ' + p))
process.exit(problems.length ? 1 : 0)
