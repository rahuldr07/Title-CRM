import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import postgres from 'postgres'
import * as schema from './schema'

export type Db = ReturnType<typeof drizzle<typeof schema>>

export function createDb(url: string, max = 10) {
  const queryClient = postgres(url, {
    max,
    onnotice: () => {},
  })
  return { db: drizzle(queryClient, { schema }), queryClient }
}

export async function withTenantOn<T>(
  db: Db,
  tenantId: string,
  fn: (tx: Db) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`)
    return fn(tx as unknown as Db)
  })
}

export async function assertRlsApplies(db: Db): Promise<void> {
  const rows = await db.execute<{
    role: string
    superuser: boolean
    bypassrls: boolean
    owned: number
  }>(sql`
    select
      current_user::text as role,
      r.rolsuper       as superuser,
      r.rolbypassrls   as bypassrls,
      (select count(*)::int from pg_tables
         where schemaname = 'public' and tableowner = current_user) as owned
    from pg_roles r
    where r.rolname = current_user
  `)

  const row = Array.from(rows)[0]
  if (!row) return

  const why =
    row.superuser ? 'is a superuser'
    : row.bypassrls ? 'holds BYPASSRLS'
    : row.owned > 0 ? `owns ${row.owned} table(s) in schema public`
    : null

  if (why) {
    throw new Error(
      `Refusing to start: the database role "${row.role}" ${why}, so it bypasses ` +
        'row-level security and tenant isolation would not be enforced. Point ' +
        'APP_DATABASE_URL at the app_user role created by server/db/rls.sql.',
    )
  }
}
