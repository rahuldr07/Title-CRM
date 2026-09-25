import { Hono } from 'hono'
import { asc, desc, eq } from 'drizzle-orm'
import { withTenant } from '../db/client'
import {
  attendance,
  candidates,
  leaveRequests,
  loans,
  openings,
  payRuns,
  payslips,
  people,
  pettyCash,
} from '../db/schema'
import { needs, type Ctx } from '../context'
import { readDecision, readLoanRequest } from './validate'

export const hrmsRoutes = new Hono<Ctx>()

hrmsRoutes.get('/attendance', needs('all'), async (c) => {
  const period = c.req.query('period')
  const rows = await withTenant(c.get('tenantId'), (tx) => {
    const q = tx
      .select({
        id: attendance.id,
        personId: attendance.personId,
        person: people.name,
        period: attendance.period,
        workingDays: attendance.workingDays,
        present: attendance.present,
        paidLeave: attendance.paidLeave,
        unpaid: attendance.unpaid,
        payableDays: attendance.payableDays,
      })
      .from(attendance)
      .innerJoin(people, eq(people.id, attendance.personId))
      .orderBy(asc(people.name))
    return period ? q.where(eq(attendance.period, period)) : q
  })
  return c.json(rows)
})

hrmsRoutes.get('/leave', async (c) => {
  const mine = !c.get('capabilities').has('people')
  const personId = c.get('personId')

  const rows = await withTenant(c.get('tenantId'), (tx) => {
    const q = tx
      .select({
        id: leaveRequests.id,
        personId: leaveRequests.personId,
        person: people.name,
        kind: leaveRequests.kind,
        fromDate: leaveRequests.fromDate,
        toDate: leaveRequests.toDate,
        days: leaveRequests.days,
        status: leaveRequests.status,
        reason: leaveRequests.reason,
        decidedAt: leaveRequests.decidedAt,
      })
      .from(leaveRequests)
      .innerJoin(people, eq(people.id, leaveRequests.personId))
      .orderBy(desc(leaveRequests.fromDate))
    return mine ? q.where(eq(leaveRequests.personId, personId)) : q
  })
  return c.json(rows)
})

hrmsRoutes.post('/leave/:id/decision', needs('people'), async (c) => {
  const id = c.req.param('id')
  const read = readDecision(await c.req.json().catch(() => null))
  if (!read.ok) return c.json({ error: read.error }, 400)

  const result = await withTenant(c.get('tenantId'), async (tx) => {
    const [row] = await tx.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1)
    if (!row) return { error: 'Not found' as const }

    if (row.personId === c.get('personId')) {
      return { error: 'You cannot decide your own leave' as const }
    }

    await tx
      .update(leaveRequests)
      .set({ status: read.value, decidedById: c.get('personId'), decidedAt: new Date() })
      .where(eq(leaveRequests.id, id))
    return { ok: true as const }
  })

  if ('error' in result) return c.json(result, result.error === 'Not found' ? 404 : 409)
  return c.json(result)
})

hrmsRoutes.get('/payruns', needs('pricing'), async (c) => {
  const rows = await withTenant(c.get('tenantId'), (tx) =>
    tx.select().from(payRuns).orderBy(desc(payRuns.period)),
  )
  return c.json(rows)
})

hrmsRoutes.get('/payslips', async (c) => {
  const mine = !c.get('capabilities').has('pricing')
  const personId = c.get('personId')

  const rows = await withTenant(c.get('tenantId'), (tx) => {
    const q = tx
      .select({
        id: payslips.id,
        payRunId: payslips.payRunId,
        personId: payslips.personId,
        person: people.name,
        period: payRuns.period,
        published: payRuns.published,
        gross: payslips.gross,
        deductions: payslips.deductions,
        net: payslips.net,
        lines: payslips.lines,
      })
      .from(payslips)
      .innerJoin(people, eq(people.id, payslips.personId))
      .innerJoin(payRuns, eq(payRuns.id, payslips.payRunId))
      .orderBy(desc(payRuns.period))
    return mine ? q.where(eq(payslips.personId, personId)) : q
  })

  return c.json(mine ? rows.filter((r) => r.published) : rows)
})

hrmsRoutes.get('/petty-cash', needs('pricing'), async (c) => {
  const rows = await withTenant(c.get('tenantId'), (tx) =>
    tx
      .select({
        id: pettyCash.id,
        at: pettyCash.at,
        kind: pettyCash.kind,
        description: pettyCash.description,
        amount: pettyCash.amount,
        reference: pettyCash.reference,
        hasReceipt: pettyCash.hasReceipt,
        recordedBy: people.name,
      })
      .from(pettyCash)
      .leftJoin(people, eq(people.id, pettyCash.recordedById))
      .orderBy(desc(pettyCash.at)),
  )
  return c.json(rows)
})

hrmsRoutes.get('/loans', async (c) => {
  const mine = !c.get('capabilities').has('pricing')
  const personId = c.get('personId')

  const rows = await withTenant(c.get('tenantId'), (tx) => {
    const q = tx
      .select({
        id: loans.id,
        personId: loans.personId,
        person: people.name,
        kind: loans.kind,
        amount: loans.amount,
        emi: loans.emi,
        paid: loans.paid,
        status: loans.status,
        note: loans.note,
        requestedAt: loans.requestedAt,
        decidedAt: loans.decidedAt,
        takenOn: loans.takenOn,
      })
      .from(loans)
      .innerJoin(people, eq(people.id, loans.personId))
      .orderBy(desc(loans.requestedAt))
    return mine ? q.where(eq(loans.personId, personId)) : q
  })
  return c.json(rows)
})

hrmsRoutes.post('/loans', async (c) => {
  const read = readLoanRequest(await c.req.json().catch(() => null))
  if (!read.ok) return c.json({ error: read.error }, 400)

  const [row] = await withTenant(c.get('tenantId'), (tx) =>
    tx
      .insert(loans)
      .values({
        tenantId: c.get('tenantId'),
        personId: c.get('personId'),
        kind: read.value.kind,
        amount: String(read.value.amount),
        emi: String(read.value.emi),
        note: read.value.note,
      })
      .returning(),
  )
  return c.json(row, 201)
})

hrmsRoutes.post('/loans/:id/decision', needs('pricing'), async (c) => {
  const id = c.req.param('id')
  const read = readDecision(await c.req.json().catch(() => null))
  if (!read.ok) return c.json({ error: read.error }, 400)

  const result = await withTenant(c.get('tenantId'), async (tx) => {
    const [row] = await tx.select().from(loans).where(eq(loans.id, id)).limit(1)
    if (!row) return { error: 'Not found' as const }
    if (row.status !== 'requested') {
      return { error: `Cannot decide a loan that is ${row.status}` as const }
    }
    if (row.personId === c.get('personId')) {
      return { error: 'You cannot decide your own request' as const }
    }

    await tx
      .update(loans)
      .set({
        status: read.value === 'approved' ? 'active' : 'rejected',
        decidedById: c.get('personId'),
        decidedAt: new Date(),
        ...(read.value === 'approved' ? { takenOn: new Date().toISOString().slice(0, 10) } : {}),
      })
      .where(eq(loans.id, id))
    return { ok: true as const }
  })

  if ('error' in result) return c.json(result, result.error === 'Not found' ? 404 : 409)
  return c.json(result)
})

hrmsRoutes.post('/loans/:id/pause', needs('pricing'), async (c) => {
  const id = c.req.param('id')
  const result = await withTenant(c.get('tenantId'), async (tx) => {
    const [row] = await tx.select().from(loans).where(eq(loans.id, id)).limit(1)
    if (!row) return { error: 'Not found' as const }
    if (row.status !== 'active') return { error: `Cannot pause a loan that is ${row.status}` as const }
    await tx.update(loans).set({ status: 'paused' }).where(eq(loans.id, id))
    return { ok: true as const }
  })
  if ('error' in result) return c.json(result, result.error === 'Not found' ? 404 : 409)
  return c.json(result)
})

hrmsRoutes.post('/loans/:id/resume', needs('pricing'), async (c) => {
  const id = c.req.param('id')
  const result = await withTenant(c.get('tenantId'), async (tx) => {
    const [row] = await tx.select().from(loans).where(eq(loans.id, id)).limit(1)
    if (!row) return { error: 'Not found' as const }
    if (row.status !== 'paused') return { error: `Cannot resume a loan that is ${row.status}` as const }
    await tx.update(loans).set({ status: 'active' }).where(eq(loans.id, id))
    return { ok: true as const }
  })
  if ('error' in result) return c.json(result, result.error === 'Not found' ? 404 : 409)
  return c.json(result)
})

hrmsRoutes.get('/openings', needs('people'), async (c) => {
  const rows = await withTenant(c.get('tenantId'), async (tx) => {
    const jobs = await tx.select().from(openings).orderBy(desc(openings.openedAt))
    const applicants = await tx.select().from(candidates)
    return jobs.map((j) => ({
      ...j,
      candidates: applicants.filter((a) => a.openingId === j.id),
    }))
  })
  return c.json(rows)
})
