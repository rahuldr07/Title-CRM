import { beforeAll, describe, expect, it } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { createDb, withTenantOn, type Db } from '../../server/db/connect'
import { one } from '../must'
import {
  clients,
  departments,
  leaveRequests,
  orderStages,
  orders,
  payRuns,
  payslips,
  people,
  products,
  roles,
  tenants,
} from '../../server/db/schema'

const ownerUrl = process.env.DATABASE_URL
const appUrl = process.env.APP_DATABASE_URL
const configured = Boolean(ownerUrl && appUrl && process.env.BETTER_AUTH_SECRET)

describe.skipIf(!configured)('the API', () => {
  let owner: Db
  let app: { fetch: (req: Request) => Response | Promise<Response> }
  let keystone: string
  let peach: string
  let cookie: string

  const call = (path: string, tenantId?: string) =>
    app.fetch(
      new Request(`http://localhost${path}`, {
        headers: {
          cookie,
          ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
        },
      }),
    )

  const ref = `test-isolation-${Date.now()}`

  beforeAll(async () => {
    process.env.VITEST = 'true'
    owner = createDb(ownerUrl!, 2).db
    app = (await import('../../server/index')).default

    const rows = await owner.select({ id: tenants.id, slug: tenants.slug }).from(tenants)
    keystone = rows.find((r) => r.slug === 'ka')!.id
    peach = rows.find((r) => r.slug === 'ps')!.id

    await owner.execute(sql`delete from order_stages where order_id in (select id from orders where ref like 'test-order-%')`)
    await owner.execute(sql`delete from order_events where order_id in (select id from orders where ref like 'test-order-%')`)
    await owner.execute(sql`delete from orders where ref like 'test-order-%'`)
    await owner.execute(sql`delete from pay_runs where period like 'test-narrowing%'`)
    await owner.execute(sql`delete from leave_requests where reason like 'test-narrowing%'`)
    await owner.execute(sql`delete from people where ref like 'test-isolation%'`)
    await owner.execute(sql`delete from "user" where email like 'isolation-%@example.test'`)

    const email = `isolation-${Date.now()}@example.test`
    const signUp = await app.fetch(
      new Request('http://localhost/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'correct-horse-battery', name: 'Isolation Test' }),
      }),
    )
    expect(signUp.status, await signUp.clone().text()).toBeLessThan(400)

    const setCookie = signUp.headers.get('set-cookie') ?? ''
    cookie = setCookie.split(',').map((c) => (c.split(';')[0] ?? '').trim()).join('; ')
    expect(cookie, 'no session cookie came back from sign-up').toBeTruthy()

    const { id: userId } = await one(
      owner.execute<{ id: string }>(sql`select id from "user" where email = ${email}`),
      'the user just signed up',
    )

    await withTenantOn(owner, keystone, async (tx) => {
      const adminRole = await one(tx.select().from(roles).where(eq(roles.key, 'admin')).limit(1), 'the admin role')
      await tx.insert(people).values({
        tenantId: keystone,
        userId,
        ref,
        name: 'Isolation Test',
        email,
        roleId: adminRole.id,
        capacity: 0,
      })
    })
  })

  describe('without a session', () => {
    it('refuses', async () => {
      const res = await app.fetch(new Request('http://localhost/api/me'))
      expect(res.status).toBe(401)
    })

    it('still answers the health check, because that is what it is for', async () => {
      const res = await app.fetch(new Request('http://localhost/api/health'))
      expect(res.status).toBe(200)
      await expect(res.json()).resolves.toEqual({ ok: true })
    })
  })

  describe('before a workspace has been chosen', () => {
    it('still answers which workspaces they are in', async () => {
      const res = await call('/api/memberships')
      expect(res.status).toBe(200)

      const body = (await res.json()) as { id: string; current: boolean }[]
      expect(body.map((m) => m.id)).toEqual([keystone])
      expect(body.every((m) => !m.current)).toBe(true)
    })

    it('refuses everything that does need one, rather than guessing', async () => {
      for (const path of ['/api/me', '/api/orders', '/api/counties']) {
        const res = await call(path)
        expect(res.status, `${path} answered without a workspace`).toBe(400)
      }
    })
  })

  describe('inside a workspace they belong to', () => {
    it('says who they are and what they may do', async () => {
      const res = await call('/api/me', keystone)
      expect(res.status).toBe(200)

      const body = (await res.json()) as { capabilities: string[]; tenant: { id: string } }
      expect(body.tenant.id).toBe(keystone)
      expect(body.capabilities).toContain('all')
      expect(body.capabilities).toContain('pricing')
    })

    it('lists the workspaces they are actually in, and only those', async () => {
      const res = await call('/api/memberships', keystone)
      expect(res.status).toBe(200)

      const body = (await res.json()) as { id: string; current: boolean }[]
      expect(body.map((m) => m.id)).toEqual([keystone])
      expect(body.find((m) => m.id === keystone)?.current).toBe(true)
    })

    it('serves the reference data', async () => {
      const res = await call('/api/counties', keystone)
      expect(res.status).toBe(200)
      expect(((await res.json()) as unknown[]).length).toBeGreaterThan(0)
    })
  })

  describe('naming a workspace they do not belong to', () => {
    it('is refused, header or no header', async () => {
      const res = await call('/api/me', peach)
      expect(res.status).toBe(403)
      await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining('No access') })
    })

    it('is refused on every route, not just the guarded ones', async () => {
      for (const path of ['/api/orders', '/api/counties', '/api/people', '/api/memberships']) {
        const res = await call(path, peach)
        expect(res.status, `${path} let another workspace through`).toBe(403)
      }
    })

    it('leaks nothing in the refusal', async () => {
      const res = await call('/api/me', peach)
      const text = await res.text()
      expect(text).not.toContain('Peach')
      expect(text).not.toContain(peach)
    })
  })

  describe('assigning a stage', () => {
    let searchStageId: string
    let qcStageId: string
    let assignee: string

    beforeAll(async () => {
      await withTenantOn(owner, keystone, async (tx) => {
        const client = await one(tx.select().from(clients).limit(1), 'a client')
        const product = await one(tx.select().from(products).limit(1), 'a product')
        const depts = await tx.select().from(departments)
        const search = depts.find((d) => d.name === 'Search')!
        const searchQc = depts.find((d) => d.name === 'Search QC')!

        const worker = await one(tx.select().from(people).where(eq(people.ref, 'pd')).limit(1), 'the seeded person pd')
        assignee = worker.id

        const order = await one(
          tx
            .insert(orders)
            .values({
              tenantId: keystone,
              ref: `test-order-${Date.now()}`,
              clientId: client.id,
              productId: product.id,
              state: 'PA',
              county: 'Cambria',
              property: '1 Test Street',
              dueAt: new Date(Date.now() + 86_400_000),
              fee: '100.00',
            })
            .returning(),
          'the order just made',
        )

        const stages = await tx
          .insert(orderStages)
          .values([
            { tenantId: keystone, orderId: order.id, departmentId: search.id },
            { tenantId: keystone, orderId: order.id, departmentId: searchQc.id },
          ])
          .returning()

        searchStageId = stages.find((s) => s.departmentId === search.id)!.id
        qcStageId = stages.find((s) => s.departmentId === searchQc.id)!.id
      })
    })

    const assign = (orderId: string, stageId: string, assigneeId: string | null) =>
      app.fetch(
        new Request(`http://localhost/api/orders/${orderId}/stages/${stageId}`, {
          method: 'POST',
          headers: { cookie, 'x-tenant-id': keystone, 'content-type': 'application/json' },
          body: JSON.stringify({ assigneeId }),
        }),
      )

    it('places somebody on the search, and records why', async () => {
      await withTenantOn(owner, keystone, async (tx) => {
        const admin = await one(tx.select().from(roles).where(eq(roles.key, 'admin')).limit(1), 'the admin role')
        await tx.update(people).set({ roleId: admin.id }).where(eq(people.ref, ref))
      })

      const res = await assign('any', searchStageId, assignee)
      expect(res.status, await res.clone().text()).toBe(200)

      const [row] = await withTenantOn(owner, keystone, (tx) =>
        tx.select().from(orderStages).where(eq(orderStages.id, searchStageId)),
      )
      expect(row?.assigneeId).toBe(assignee)
      expect(row?.decision, 'the placement recorded no reason').toBeTruthy()
      expect(row?.decision?.length).toBeGreaterThan(0)
    })

    it('refuses to let the same person check their own search', async () => {
      const res = await assign('any', qcStageId, assignee)
      expect(res.status).toBe(409)
      await expect(res.json()).resolves.toMatchObject({ error: 'Would be self-review' })

      const [row] = await withTenantOn(owner, keystone, (tx) =>
        tx.select().from(orderStages).where(eq(orderStages.id, qcStageId)),
      )
      expect(row?.assigneeId, 'the refused assignment was written anyway').toBeNull()
    })

    it('accepts a different person on the QC', async () => {
      const other = await one(
        withTenantOn(owner, keystone, (tx) => tx.select().from(people).where(eq(people.ref, 'ln')).limit(1)),
        'the seeded person ln',
      )
      const res = await assign('any', qcStageId, other.id)
      expect(res.status, await res.clone().text()).toBe(200)
    })
  })

  describe('capability guards', () => {
    it('refuses a route the role lacks', async () => {
      await withTenantOn(owner, keystone, async (tx) => {
        const staffRole = await one(tx.select().from(roles).where(eq(roles.key, 'staff')).limit(1), 'the staff role')
        await tx.update(people).set({ roleId: staffRole.id }).where(eq(people.ref, ref))
      })

      const res = await call('/api/invoices', keystone)
      expect(res.status).toBe(403)
      await expect(res.json()).resolves.toMatchObject({
        error: expect.stringContaining('pricing'),
      })
    })

    it('narrows the order register instead of refusing it', async () => {
      const res = await call('/api/orders', keystone)
      expect(res.status, await res.clone().text()).toBe(200)
    })
  })

  describe('narrowing to the person', () => {
    const colleagueRef = 'kv'
    const colleagueName = 'Kavitha V'

    let mine: { payslip: string; draft: string; leave: string; order: string; orderRef: string }
    let theirs: { payslip: string; leave: string; order: string; orderRef: string }

    const beRole = (key: 'admin' | 'staff') =>
      withTenantOn(owner, keystone, async (tx) => {
        const role = await one(tx.select().from(roles).where(eq(roles.key, key)).limit(1), 'the role')
        await tx.update(people).set({ roleId: role.id }).where(eq(people.ref, ref))
      })

    const ids = async (res: Response) =>
      ((await res.json()) as { id: string }[]).map((r) => r.id)

    beforeAll(async () => {
      await withTenantOn(owner, keystone, async (tx) => {
        const me = await one(tx.select().from(people).where(eq(people.ref, ref)).limit(1), 'the signed-in person')
        const them = await one(tx.select().from(people).where(eq(people.ref, colleagueRef)).limit(1), `the seed person ${colleagueRef}`)
        expect(them.name).toBe(colleagueName)

        const runs = await tx
          .insert(payRuns)
          .values([
            { tenantId: keystone, period: 'test-narrowing published', state: 'paid', published: true },
            { tenantId: keystone, period: 'test-narrowing draft', state: 'draft', published: false },
          ])
          .returning()
        const published = runs.find((r) => r.published)!
        const draft = runs.find((r) => !r.published)!

        const slips = await tx
          .insert(payslips)
          .values([
            { tenantId: keystone, payRunId: published.id, personId: me.id, gross: '50000.00', deductions: '5000.00', net: '45000.00' },
            { tenantId: keystone, payRunId: published.id, personId: them.id, gross: '60000.00', deductions: '6000.00', net: '54000.00' },
            { tenantId: keystone, payRunId: draft.id, personId: me.id, gross: '51000.00', deductions: '5100.00', net: '45900.00' },
          ])
          .returning()
        const slipFor = (personId: string, payRunId: string) =>
          slips.find((s) => s.personId === personId && s.payRunId === payRunId)!.id

        const leave = await tx
          .insert(leaveRequests)
          .values([
            { tenantId: keystone, personId: me.id, kind: 'pl', fromDate: '2026-07-06', toDate: '2026-07-07', days: '2.0', reason: 'test-narrowing mine' },
            { tenantId: keystone, personId: them.id, kind: 'cl', fromDate: '2026-07-08', toDate: '2026-07-08', days: '1.0', reason: 'test-narrowing theirs' },
          ])
          .returning()

        const client = await one(tx.select().from(clients).limit(1), 'a client')
        const product = await one(tx.select().from(products).limit(1), 'a product')
        const search = await one(tx.select().from(departments).where(eq(departments.name, 'Search')).limit(1), 'the Search department')

        const stamp = Date.now()
        const refs = { mine: `test-order-mine-${stamp}`, theirs: `test-order-theirs-${stamp}` }
        const both = await tx
          .insert(orders)
          .values(
            [refs.mine, refs.theirs].map((r) => ({
              tenantId: keystone,
              ref: r,
              clientId: client.id,
              productId: product.id,
              state: 'PA',
              county: 'Cambria',
              property: '2 Narrowing Lane',
              dueAt: new Date(stamp + 86_400_000),
              fee: '250.00',
            })),
          )
          .returning()
        const orderFor = (r: string) => both.find((o) => o.ref === r)!

        await tx.insert(orderStages).values([
          { tenantId: keystone, orderId: orderFor(refs.mine).id, departmentId: search.id, assigneeId: me.id },
          { tenantId: keystone, orderId: orderFor(refs.theirs).id, departmentId: search.id, assigneeId: them.id },
        ])

        mine = {
          payslip: slipFor(me.id, published.id),
          draft: slipFor(me.id, draft.id),
          leave: leave.find((l) => l.personId === me.id)!.id,
          order: orderFor(refs.mine).id,
          orderRef: refs.mine,
        }
        theirs = {
          payslip: slipFor(them.id, published.id),
          leave: leave.find((l) => l.personId === them.id)!.id,
          order: orderFor(refs.theirs).id,
          orderRef: refs.theirs,
        }
      })
    })

    describe('payslips', () => {
      it('gives a person their own and not their colleague’s', async () => {
        await beRole('staff')
        const res = await call('/api/hr/payslips', keystone)
        expect(res.status, await res.clone().text()).toBe(200)

        const body = (await res.json()) as { id: string; person: string }[]
        expect(body.map((r) => r.id)).toContain(mine.payslip)
        expect(
          body.map((r) => r.id),
          `${colleagueName}'s payslip was served to somebody else`,
        ).not.toContain(theirs.payslip)
        expect(body.every((r) => r.person === 'Isolation Test')).toBe(true)
      })

      it('and hands the same row to payroll, which is what makes that a gate', async () => {
        await beRole('admin')
        const seen = await ids(await call('/api/hr/payslips', keystone))
        expect(seen, 'the counter-example no longer reproduces').toContain(theirs.payslip)
        expect(seen).toContain(mine.payslip)
      })

      it('keeps an unpublished run off the screen of the person it is about', async () => {
        await beRole('staff')
        const seen = await ids(await call('/api/hr/payslips', keystone))
        expect(seen).toContain(mine.payslip)
        expect(seen, 'a draft run was shown to the person it is about').not.toContain(mine.draft)
      })

      it('while payroll sees the draft, because that is what a draft is for', async () => {
        await beRole('admin')
        const seen = await ids(await call('/api/hr/payslips', keystone))
        expect(seen, 'the counter-example no longer reproduces').toContain(mine.draft)
      })
    })

    describe('leave', () => {
      it('gives a person their own and not their colleague’s', async () => {
        await beRole('staff')
        const res = await call('/api/hr/leave', keystone)
        expect(res.status, await res.clone().text()).toBe(200)

        const body = (await res.json()) as { id: string; person: string }[]
        expect(body.map((r) => r.id)).toContain(mine.leave)
        expect(
          body.map((r) => r.id),
          `${colleagueName}'s leave was served to somebody who cannot decide it`,
        ).not.toContain(theirs.leave)
        expect(body.every((r) => r.person === 'Isolation Test')).toBe(true)
      })

      it('and shows an approver both, which is what makes that a gate', async () => {
        await beRole('admin')
        const seen = await ids(await call('/api/hr/leave', keystone))
        expect(seen, 'the counter-example no longer reproduces').toContain(theirs.leave)
        expect(seen).toContain(mine.leave)
      })
    })

    describe('the order register', () => {
      const refsIn = async (res: Response) =>
        ((await res.json()) as { ref: string }[]).map((r) => r.ref)

      it('lists the orders they are on, and not the ones they are not', async () => {
        await beRole('staff')
        const res = await call('/api/orders', keystone)
        expect(res.status, await res.clone().text()).toBe(200)

        const seen = await refsIn(res)
        expect(seen).toContain(mine.orderRef)
        expect(seen, `an order only ${colleagueName} is on was in someone else's register`).not.toContain(
          theirs.orderRef,
        )
      })

      it('and lists both for a lead, which is what makes that a gate', async () => {
        await beRole('admin')
        const seen = await refsIn(await call('/api/orders', keystone))
        expect(seen, 'the counter-example no longer reproduces').toContain(theirs.orderRef)
        expect(seen).toContain(mine.orderRef)
      })
    })

    describe('one order by id', () => {
      it('opens the one they are on', async () => {
        await beRole('staff')
        const res = await call(`/api/orders/${mine.order}`, keystone)
        expect(res.status, await res.clone().text()).toBe(200)
        expect(((await res.json()) as { order: { ref: string } }).order.ref).toBe(mine.orderRef)
      })

      it('answers 404 for one they are not, rather than to anybody holding the id', async () => {
        await beRole('staff')
        const res = await call(`/api/orders/${theirs.order}`, keystone)
        expect(res.status, `the detail route handed over ${colleagueName}'s order`).toBe(404)
      })

      it('and opens it for a lead, so the 404 was a refusal and not a missing row', async () => {
        await beRole('admin')
        const res = await call(`/api/orders/${theirs.order}`, keystone)
        expect(res.status, 'the counter-example no longer reproduces').toBe(200)
        expect(((await res.json()) as { order: { ref: string } }).order.ref).toBe(theirs.orderRef)
      })
    })
  })
})
