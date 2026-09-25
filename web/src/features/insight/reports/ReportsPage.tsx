import { useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { Btn } from '@/shared/ui/Button'
import { PageHead } from '@/shared/ui/PageHead'
import { Tabs } from '@/shared/ui/Tabs'
import { RequireCap } from '@/shared/ui/RequireCap'
import { LoadFailed } from '@/shared/ui/ErrorBoundary'
import { useUi } from '@/shared/ui/UiProvider'
import { useDeliveries } from '@/shared/hooks/useDeliveries'
import { useQcLog } from '@/shared/hooks/useQcLog'
import { csvName, downloadCSV } from '@/shared/lib/csv'
import { Received } from './day/Received'
import { Assigned } from './day/Assigned'
import { Turnaround } from './turnaround/Turnaround'
import { ByStaff } from './work/ByStaff'
import { ByDepartment } from './work/ByDepartment'
import { Quality } from './quality/Quality'
import { MoneyTab } from './money/MoneyTab'
import { useSession } from '@/domain/auth/SessionProvider'
import { useReportExporter } from './reportExport'
import { Note } from '@/shared/ui/Layout'

const TABS = ['Received', 'Assigned', 'Turnaround', 'By staff', 'By department', 'Quality', 'Money'] as const
type Tab = (typeof TABS)[number]

function Reports() {
  const { tab: tabParam, sw, dw, focus } = useSearch({ from: '/reports' })
  const isTab = (t?: string): t is Tab => !!t && (TABS as readonly string[]).includes(t)

  const { can } = useSession()
  const tabs = TABS.filter((t) => t !== 'Money' || can('pricing'))
  const [tab, setTab] = useState<Tab>(isTab(tabParam) && tabs.includes(tabParam) ? tabParam : 'Received')
  const [dept, setDept] = useState<string | undefined>(dw === 'all' ? undefined : dw)
  const [person, setPerson] = useState<string | undefined>(sw === 'all' ? undefined : sw)
  const { toast } = useUi()

  const openDept = (d: string) => {
    setDept(d)
    setPerson(undefined)
    setTab('By department')
  }

  const openStaff = (id: string) => {
    setPerson(id)
    setTab('By staff')
  }

  const pickTab = (t: Tab) => {
    if (t !== 'By department') setDept(undefined)
    if (t !== 'By staff') setPerson(undefined)
    setTab(t)
  }

  const needsHistory = tab === 'Turnaround' || tab === 'Quality'
  const history = useDeliveries()
  const qc = useQcLog()

  const exporter = useReportExporter()
  const exportTab = () => {
    if (!exporter) return
    const { name, rows } = exporter()
    const out = downloadCSV(csvName(name), rows)
    toast(`${out.name} — ${out.rows.length - 1} rows`)
  }

  if (needsHistory && (history.isError || qc.isError)) {
    return (
      <>
        <PageHead title="Reports" sub="Everything about the day in one place." />
        <LoadFailed
          what={history.isError ? 'The delivery history' : 'The QC log'}
          error={history.error ?? qc.error}
          onRetry={() => {
            void history.refetch()
            void qc.refetch()
          }}
        />
      </>
    )
  }

  const loading = needsHistory && (history.isPending || qc.isPending)

  return (
    <>
      <PageHead
        title="Reports"
        sub="Everything about the day in one place — what came in, who it went to, how fast, and how good."
        actions={
          <Btn variant="ghost" onClick={exportTab} disabled={loading || !exporter}>
            Export
          </Btn>
        }
      />

      <Tabs tabs={tabs} value={tab} onChange={pickTab}>
        {tab === 'Received' ? <Received initialFocus={tabParam === 'Received' ? focus : undefined} /> : null}
        {tab === 'Assigned' ? <Assigned onOpenStaff={() => pickTab('By staff')} /> : null}
        {tab === 'By staff' ? (
          <ByStaff key={person ?? 'all'} initial={person} onOpenDept={openDept} />
        ) : null}
        {tab === 'By department' ? (
          <ByDepartment
            key={dept ?? 'all'}
            initial={dept}
            initialFocus={tabParam === 'By department' ? focus : undefined}
            onOpenStaff={openStaff}
          />
        ) : null}

        {tab === 'Turnaround' ? (
          loading ? (
            <Note size="body">
              Loading the delivery history…
            </Note>
          ) : (
            <Turnaround deliveries={history.data ?? []} />
          )
        ) : null}

        {tab === 'Money' && can('pricing') ? <MoneyTab /> : null}

        {tab === 'Quality' ? (
          loading ? (
            <Note size="body">
              Loading the delivery history and QC log…
            </Note>
          ) : (
            <Quality deliveries={history.data ?? []} log={qc.data ?? []} />
          )
        ) : null}
      </Tabs>
    </>
  )
}

export default function ReportsRoute() {
  return (
    <RequireCap cap="all">
      <Reports />
    </RequireCap>
  )
}
