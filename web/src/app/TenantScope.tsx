import type { ReactNode } from 'react'
import { useSession } from '@/domain/auth/SessionProvider'
import { Btn } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Empty } from '@/shared/ui/Banner'
import { PageHead } from '@/shared/ui/PageHead'
import { SEEDED_TENANT_ID, useWorkspaces } from '@/domain/company/company'

export function TenantScope({ children }: { children: ReactNode }) {
  const { tenant, authority, switchTenant } = useSession()
  const seeded = useWorkspaces().find((t) => t.id === SEEDED_TENANT_ID)

  if (authority === 'server' || !seeded || tenant.id === seeded.id) return <>{children}</>

  return (
    <>
      <PageHead title={tenant.name} sub={`${tenant.plan} · ${tenant.state}`} />
      <Card>
        <Empty
          icon="◫"
          action={
            <Btn small onClick={() => switchTenant(seeded.id)}>
              Switch to {seeded.name}
            </Btn>
          }
        >
          Nothing is seeded for {tenant.name}. The demonstration data belongs to {seeded.name}, and showing
          it here would present one company's orders, people and invoices as another's. Connect the database
          and this workspace fills from its own rows.
        </Empty>
      </Card>
    </>
  )
}
