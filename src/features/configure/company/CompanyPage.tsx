import { useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { PageHead } from '@/shared/ui/PageHead'
import { Tabs } from '@/shared/ui/Tabs'
import { RequireCap } from '@/shared/ui/RequireCap'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { useSession } from '@/domain/auth/SessionProvider'
import { useProfile } from '@/domain/company/company'
import { COTABS } from '@/data/org'
import { CompanyTab } from '@/features/configure/company/tabs/CompanyTab'
import { StaffTab } from '@/features/configure/company/tabs/StaffTab'
import { ClientsTab } from '@/features/configure/company/tabs/ClientsTab'
import { DepartmentsTab } from '@/features/configure/company/tabs/DepartmentsTab'
import { RolesTab } from '@/features/configure/company/tabs/RolesTab'
import { WorkflowTab } from '@/features/configure/company/tabs/WorkflowTab'
import { SlaTab } from '@/features/configure/company/tabs/SlaTab'
import { PayrollTab } from '@/features/configure/company/tabs/PayrollTab'

function Company() {
  const { tenant, can } = useSession()
  const profile = useProfile()

  const search = useSearch({ from: '/company' })

  const [tab, setTab] = useState<string>(() =>
    search.tab && COTABS.includes(search.tab) ? search.tab : COTABS[0],
  )

  return (
    <>
      <PageHead
        title="Company"
        sub={`Everything that defines how ${profile.name} runs.`}
      />

      <Tabs tabs={COTABS} value={tab} onChange={setTab}>
        {tab === 'Company' ? <CompanyTab plan={tenant.plan} /> : null}

        {tab === 'Staff' ? (
          <StaffTab tenantName={profile.name} onOpenRoles={() => setTab('Roles')} />
        ) : null}

        {tab === 'Clients' ? <ClientsTab /> : null}

        {tab === 'Departments' ? <DepartmentsTab onOpenStaff={() => setTab('Staff')} /> : null}

        {tab === 'Roles' ? (
          <RolesTab tenantName={profile.name} isAdmin={can('all')} onOpenStaff={() => setTab('Staff')} />
        ) : null}

        {tab === 'Workflow' ? <WorkflowTab /> : null}

        {tab === 'Turnaround & SLA' ? <SlaTab initialSub={search.sub} /> : null}

        {tab === 'Payroll' ? <PayrollTab /> : null}
      </Tabs>
    </>
  )
}

export default function CompanyRoute() {
  return (
    <RequireCap cap="people">
      <ErrorBoundary what="Company">
        <Company />
      </ErrorBoundary>
    </RequireCap>
  )
}
