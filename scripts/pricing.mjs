/**
 * Signs in as a lead and fails on any dollar figure a lead can reach.
 *
 *   npm run dev            # seed build: the demonstration sign-in accepts the address
 *   npm run check:pricing  # PRICING_URL=http://localhost:5173 by default
 *
 * Against the built front end with the API behind it (the CI browser job), the
 * same form signs in with the seeded password instead.
 *
 * Leads see every order but no pricing. That was enforced in one place, so the
 * order's Costs tab, the new-order price panel and surcharges, the commitment
 * preview and a report's value column all showed fees to a role that must not
 * see them. A check per money element does not survive the next screen that
 * adds one; a lead walking every route and every tab does.
 */
import { chromium } from 'playwright'

const BASE = process.env.PRICING_URL ?? 'http://localhost:5173'
const EMAIL = process.env.PRICING_EMAIL ?? 'ashok.s@keystoneabstract.com'
const PASSWORD = process.env.PRICING_PASSWORD ?? 'titlecrm-dev'

/* Every route a lead can open, and the drill-downs that carry money when a role
   that can see pricing opens them. */
const routes = [
  '/dash', '/orders', '/orders/new', '/orders/4192254-2', '/assign', '/intake',
  '/commitment', '/reports', '/reports?tab=Received&focus=clients', '/attend',
  '/leave', '/loans', '/counties', '/linkcheck', '/mywork', '/myperf', '/mypay',
]

/* A US dollar amount: "$34", "$ 1,240.00". Rupees are a person's own pay and may show. */
const DOLLARS = /\$\s?\d/

const launchOptions = {
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  timeout: 30_000,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
}

const browser = await chromium.launch(launchOptions)
const problems = []

try {
  const page = await browser.newPage()
  await page.goto(BASE + '/signin', { waitUntil: 'domcontentloaded', timeout: 15_000 })
  await page.waitForSelector('main input[type="email"]', { timeout: 15_000 })
  await page.locator('main input[type="email"]').fill(EMAIL)
  await page.locator('main input[type="password"]').fill(PASSWORD)
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/signin'), { timeout: 20_000 })
  console.log(`signed in as ${EMAIL}\n`)

  const look = async (where) => {
    const text = await page.locator('main').innerText().catch(() => '')
    const hit = text.split('\n').find((line) => DOLLARS.test(line))
    if (hit) problems.push(`${where} shows "${hit.trim().slice(0, 80)}"`)
  }

  for (const route of routes) {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 15_000 })
    await page.waitForSelector('main', { timeout: 15_000 })
    await page.waitForTimeout(300)
    await look(route)

    /* Money hides behind tabs as often as on the first view. */
    const tabs = page.locator('main [role="tab"]')
    const n = await tabs.count()
    for (let i = 0; i < n; i++) {
      const label = (await tabs.nth(i).innerText()).trim().split('\n')[0]
      await tabs.nth(i).click()
      await page.waitForTimeout(150)
      await look(`${route} › ${label}`)
    }
    console.log(route.padEnd(40) + (n ? `${n} tabs` : ''))
  }
} catch (e) {
  problems.push(`run failed :: ${e.message.split('\n')[0]}`)
} finally {
  await browser.close().catch(() => {})
}

console.log(`\nproblems: ${problems.length}`)
problems.forEach((p) => console.log('  ' + p))
process.exit(problems.length ? 1 : 0)
