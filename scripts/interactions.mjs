import { chromium } from 'playwright'

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173'

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

const failures = []
const check = (passed, what) => {
  console.log((passed ? '  ok    ' : '  FAIL  ') + what)
  if (!passed) failures.push(what)
}

const browser = await chromium.launch(launchOptions)
const page = await browser.newPage()
page.on('pageerror', (e) => failures.push('threw: ' + e.message))

await page.goto(BASE + '/signin', { waitUntil: 'domcontentloaded', timeout: 15_000 })
await page.waitForSelector('main input', { timeout: 10_000 })
await page.locator('main input[type="email"]').fill(EMAIL)
await page.locator('main input[type="password"]').fill(PASSWORD)
await page.getByRole('button', { name: /^sign in$/i }).click()
try {
  await page.waitForURL((u) => !u.pathname.startsWith('/signin'), { timeout: 15_000 })
} catch {
  console.error(
    `could not sign in as ${EMAIL}. This check drives the real sign-in form, so ` +
      'it needs the API running and the database seeded.',
  )
  await browser.close().catch(() => {})
  process.exit(1)
}
console.log(`signed in as ${EMAIL}`)

const open = async (path, settle = 600) => {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 15_000 })
  await page.waitForSelector('main', { timeout: 10_000 })
  await page.waitForTimeout(settle)
}
const text = async () => (await page.locator('main').innerText()).toLowerCase()
const tab = async (name) => {
  await page.getByRole('tab', { name }).click()
  await page.waitForTimeout(350)
}

try {
  console.log('\nregister rows reach their detail screen')
  await open('/company')
  await tab('Staff')
  await page.locator('.rw, .trow[role="button"]').first().click()
  await page.waitForTimeout(600)
  check(/\/staff\//.test(page.url()), 'a roster row opens the person')

  console.log('\nperson detail')
  await open('/staff/pd')
  check((await text()).includes('prasad'), 'names the person')
  await tab('Work')
  check(/stages today|inside budget/.test(await text()), 'the work tab renders')
  await tab('Quality')
  check(/ratings|defects/.test(await text()), 'the quality tab renders')
  await tab('Access')
  check(/works the orders|see orders/.test(await text()), 'the access tab spells out the role')

  console.log('\nclient detail')
  await open('/clients/MGR', 1500)
  check((await text()).includes('outstanding'), 'shows the outstanding balance')
  check((await text()).includes('invoiced'), 'shows what has been invoiced against it')
  check((await text()).includes('payment terms'), 'and the terms it is billed on')
  await tab('Turnaround')
  check(/incl\. weekends|24h/.test(await text()), 'turnaround is stated per product')
  await tab('Invoices')
  check(/inv-\d{4}|part paid/.test(await text()), 'the invoice register renders')
  await tab('Order prefixes')
  check((await text()).includes('incoming mail'), 'prefixes say what they route')

  console.log('\nlead detail — the status moves, and winning it drops the flag')
  await open('/leads/l1')
  const status = page.locator('main select[aria-label="Status"]')
  const clearFlag = page.getByRole('button', { name: 'Clear flag' })
  check((await clearFlag.count()) === 1, 'this one starts flagged')

  await status.selectOption('interested')
  await page.waitForTimeout(400)
  check((await status.inputValue()) === 'interested', 'the status sticks')
  check((await clearFlag.count()) === 1, 'an ordinary move leaves the flag alone')

  await status.selectOption('won')
  await page.waitForTimeout(400)
  check((await clearFlag.count()) === 0, 'winning it drops the flag')

  console.log('\nnew lead — validation')
  await open('/leads/new')
  const add = page.getByRole('button', { name: 'Add lead' })
  await add.click()
  await page.waitForTimeout(300)
  check((await text()).includes('a company name is required'), 'an empty save is refused, with a reason')
  check(page.url().includes('/leads/new'), 'and stays on the form')

  const field = (id) => page.locator(`#nl-${id}`)

  await field('co').fill('Testworth Title Co')
  await field('cn').fill('Jo Tester')
  await field('ce').fill('not-an-email')
  await add.click()
  await page.waitForTimeout(300)
  check((await text()).includes('does not look right'), 'a malformed email is caught')

  await field('ce').fill('jo@testworth.com')
  await add.click()
  await page.waitForTimeout(300)
  check((await text()).includes('write a first note'), 'and a lead cannot be saved without a first note')

  await field('note').fill('Spoke to Jo, quoted standard turnaround.')
  await add.click()
  await page.waitForTimeout(800)
  check(/\/leads\/l\d+/.test(page.url()), 'a valid lead saves and opens')
  check((await text()).includes('testworth'), 'and the new lead shows')
  check(/notes\s+1\b/.test(await text()), 'carrying the note it was created with, so it is not stale on day one')

  console.log('\nmissing records')
  for (const [path, what] of [
    ['/staff/nobody', 'person'],
    ['/clients/NOPE', 'client'],
    ['/leads/nope', 'lead'],
  ]) {
    await open(path, 300)
    check((await text()).includes('not here'), `a missing ${what} says so rather than blanking`)
  }
} finally {
  await browser.close().catch(() => {})
}

console.log(failures.length ? `\n${failures.length} failed:\n  ` + failures.join('\n  ') : '\nall checks passed')
process.exit(failures.length ? 1 : 0)
