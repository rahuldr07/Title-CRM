import { Hono } from 'hono'
import { eq, sql } from 'drizzle-orm'
import { db, withTenant } from '../db/client'
import { people, tenantSettings, tenants } from '../db/schema'
import type { Ctx, SessionCtx } from '../context'

export const sessionRoutes = new Hono<Ctx>()

export const preflightRoutes = new Hono<SessionCtx>()

sessionRoutes.get('/me', async (c) => {
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')

  const data = await withTenant(tenantId, async (tx) => {
    const [person] = await tx.select().from(people).where(eq(people.userId, userId)).limit(1)
    const [tenant] = await tx.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
    const [settings] = await tx
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId))
      .limit(1)
    return { person, tenant, settings }
  })

  return c.json({ ...data, capabilities: [...c.get('capabilities')] })
})

preflightRoutes.get('/memberships', async (c) => {
  const userId = c.get('userId')

  const rows = await db.execute<{
    tenant_id: string
    slug: string
    name: string
    plan: string
    state: string
    person_id: string
  }>(sql`select * from app_memberships(${userId})`)

  const list = Array.from(rows)

  const named = c.req.header('x-tenant-id')
  if (named && !list.some((r) => r.tenant_id === named)) {
    return c.json({ error: 'No access to this workspace' }, 403)
  }

  return c.json(
    list.map((r) => ({
      id: r.tenant_id,
      slug: r.slug,
      name: r.name,
      plan: r.plan,
      state: r.state,
      personId: r.person_id,
      current: r.tenant_id === (c.req.header('x-tenant-id') ?? c.get('activeTenantId')),
    })),
  )
})
