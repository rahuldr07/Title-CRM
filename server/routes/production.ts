import { Hono } from 'hono'
import { and, asc, desc, eq, exists, sql } from 'drizzle-orm'
import { db, withTenant } from '../db/client'
import {
  clients,
  departments,
  orderEvents,
  orderStages,
  orders,
  people,
  products,
} from '../db/schema'
import { needs, type Ctx } from '../context'
import { readAssignee } from './validate'

export const productionRoutes = new Hono<Ctx>()

const priced = <T extends { fee: string }>(row: T, caps: Set<string>): T | Omit<T, 'fee'> => {
  if (caps.has('pricing')) return row
  const { fee: _fee, ...rest } = row
  return rest
}

const onTheOrder = (personId: string) =>
  exists(
    db
      .select({ one: sql`1` })
      .from(orderStages)
      .where(and(eq(orderStages.orderId, orders.id), eq(orderStages.assigneeId, personId))),
  )

const MAX_ROWS = 500

productionRoutes.get('/orders', async (c) => {
  const caps = c.get('capabilities')
  const personId = c.get('personId')
  const limit = Math.min(Number(c.req.query('limit')) || MAX_ROWS, MAX_ROWS)
  const offset = Math.max(Number(c.req.query('offset')) || 0, 0)

  const rows = await withTenant(c.get('tenantId'), async (tx) =>
    tx
      .select({
        id: orders.id,
        ref: orders.ref,
        status: orders.status,
        state: orders.state,
        county: orders.county,
        property: orders.property,
        dueAt: orders.dueAt,
        receivedAt: orders.receivedAt,
        deliveredAt: orders.deliveredAt,
        fee: orders.fee,
        holdReason: orders.holdReason,
        client: clients.code,
        product: products.code,
      })
      .from(orders)
      .innerJoin(clients, eq(clients.id, orders.clientId))
      .innerJoin(products, eq(products.id, orders.productId))
      .where(caps.has('all') ? undefined : onTheOrder(personId))
      .orderBy(desc(orders.dueAt))
      .limit(limit)
      .offset(offset),
  )

  return c.json(rows.map((o) => priced(o, caps)))
})

productionRoutes.get('/orders/:id', async (c) => {
  const id = c.req.param('id')
  const caps = c.get('capabilities')
  const personId = c.get('personId')

  const data = await withTenant(c.get('tenantId'), async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), caps.has('all') ? undefined : onTheOrder(personId)))
      .limit(1)
    if (!order) return null

    const stages = await tx
      .select({
        id: orderStages.id,
        department: departments.name,
        pairs: departments.pairs,
        assigneeId: orderStages.assigneeId,
        assignee: people.name,
        startedAt: orderStages.startedAt,
        finishedAt: orderStages.finishedAt,
        decision: orderStages.decision,
      })
      .from(orderStages)
      .innerJoin(departments, eq(departments.id, orderStages.departmentId))
      .leftJoin(people, eq(people.id, orderStages.assigneeId))
      .where(eq(orderStages.orderId, id))
      .orderBy(asc(departments.position))

    const events = await tx
      .select({
        id: orderEvents.id,
        kind: orderEvents.kind,
        body: orderEvents.body,
        at: orderEvents.at,
        actor: people.name,
      })
      .from(orderEvents)
      .leftJoin(people, eq(people.id, orderEvents.actorId))
      .where(eq(orderEvents.orderId, id))
      .orderBy(desc(orderEvents.at))

    return { order: priced(order, caps), stages, events }
  })

  return data ? c.json(data) : c.json({ error: 'Not found' }, 404)
})

productionRoutes.post('/orders/:id/stages/:stageId', needs('assign'), async (c) => {
  const { stageId } = c.req.param()
  const read = readAssignee(await c.req.json().catch(() => null))
  if (!read.ok) return c.json({ error: read.error }, 400)
  const body = read.value

  const result = await withTenant(c.get('tenantId'), async (tx) => {
    const [stage] = await tx.select().from(orderStages).where(eq(orderStages.id, stageId)).limit(1)
    if (!stage) return { error: 'Not found' as const }

    if (body.assigneeId) {
      const [person] = await tx
        .select({ id: people.id })
        .from(people)
        .where(and(eq(people.id, body.assigneeId), eq(people.active, true)))
        .limit(1)
      if (!person) return { error: 'No such person in this workspace' as const }
    }

    const [dept] = await tx
      .select()
      .from(departments)
      .where(eq(departments.id, stage.departmentId))
      .limit(1)

    if (body.assigneeId && dept?.pairs) {
      const [paired] = await tx
        .select({ assigneeId: orderStages.assigneeId })
        .from(orderStages)
        .innerJoin(departments, eq(departments.id, orderStages.departmentId))
        .where(and(eq(orderStages.orderId, stage.orderId), eq(departments.name, dept.pairs)))
        .limit(1)

      if (paired?.assigneeId && paired.assigneeId === body.assigneeId) {
        return { error: 'Would be self-review' as const }
      }
    }

    const decision = [
      {
        rule: 'manual',
        note: body.assigneeId
          ? `Assigned by hand${dept?.name ? ` on ${dept.name}` : ''}`
          : `Cleared by hand${dept?.name ? ` on ${dept.name}` : ''}`,
      },
      ...(dept?.pairs ? [{ rule: 'r4', note: `Checked against the ${dept.pairs} assignee` }] : []),
    ]

    await tx
      .update(orderStages)
      .set({ assigneeId: body.assigneeId, decision })
      .where(eq(orderStages.id, stageId))

    await tx.insert(orderEvents).values({
      tenantId: c.get('tenantId'),
      orderId: stage.orderId,
      actorId: c.get('personId'),
      kind: body.assigneeId ? 'assigned' : 'unassigned',
      body: dept?.name ?? '',
    })

    return { ok: true as const }
  })

  if ('error' in result) return c.json(result, result.error === 'Not found' ? 404 : 409)
  return c.json(result)
})
