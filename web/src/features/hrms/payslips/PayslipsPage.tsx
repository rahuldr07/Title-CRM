import { useMemo } from 'react'
import { useSearch } from '@tanstack/react-router'
import { useGo } from '@/shared/hooks/useGo'
import { Btn } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { PageHead } from '@/shared/ui/PageHead'
import { Tabs } from '@/shared/ui/Tabs'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { RequireCap } from '@/shared/ui/RequireCap'
import { PAYMONTHS } from '@/data/hrms'
import { runStateOf, useRuns } from '@/domain/payroll/payruns'
import { paidStaff, payTotals } from '@/domain/payroll/payroll'
import { usePayslipDownloads } from './usePayslipDownloads'
import { latestPublished } from './payslips'
import { OnePersonTab } from '@/features/hrms/payslips/tabs/OnePersonTab'
import { ThisMonthTab } from '@/features/hrms/payslips/tabs/ThisMonthTab'
import { findPerson } from '@/domain/people/roster'
import { Note } from '@/shared/ui/Layout'

const TABS = ['This month', 'One person'] as const
type Tab = (typeof TABS)[number]

function Payslips() {
  const navigate = useGo()
  const runs = useRuns()
  const download = usePayslipDownloads()
  const search = useSearch({ from: '/payslips' })

  const people = useMemo(() => paidStaff(), [])

  const tab: Tab = TABS.includes(search.tab as Tab) ? (search.tab as Tab) : 'This month'
  const month = search.m && PAYMONTHS.includes(search.m) ? search.m : latestPublished(runs)
  const who = findPerson(people, search.p) ?? people[0]

  const setView = (next: { tab?: Tab; m?: string; p?: string }) =>
    navigate({
      to: '/payslips',
      search: (prev: Record<string, unknown>) => ({ ...prev, ...next }),
      replace: true,
    })

  const totals = useMemo(() => payTotals(month), [month])
  const run = runs[month]
  const publishedCount = useMemo(
    () => PAYMONTHS.filter((m) => runs[m]?.published).length,
    [runs],
  )

  if (!people.length) {
    return (
      <>
        <PageHead title="Payslips" sub="Nobody is on the payroll yet." />
        <Card padded>
          <Note size="body" margin={0}>
            No active person has a salary on record, so there is nothing to pay and no payslip to
            produce. Set a CTC on someone’s record and they appear here from the next run.
          </Note>
          <div style={{ marginTop: 14 }}>
            <Btn onClick={() => navigate({ to: '/company' })}>Open the roster</Btn>
          </div>
        </Card>
      </>
    )
  }

  const sub =
    tab === 'One person'
      ? who
        ? `${who.n} · ${publishedCount} published payslip${publishedCount === 1 ? '' : 's'} this year`
        : 'Nobody on the payroll yet'
      : `${month} · ${
          run?.published
            ? `${totals.list.length} published`
            : `payroll is ${runStateOf(run?.state ?? 'draft')[0].toLowerCase()}`
        }`

  return (
    <>
      <PageHead
        title="Payslips"
        sub={sub}
        actions={
          <>
            <Btn variant="ghost" onClick={() => navigate({ to: '/payroll' })}>
              The run
            </Btn>
            {tab === 'This month' && run?.published ? (
              <Btn variant="ghost" onClick={() => download.register(month, totals.list)}>
                Export all
              </Btn>
            ) : null}
          </>
        }
      />

      <Tabs tabs={[...TABS]} value={tab} onChange={(t) => setView({ tab: t })}>
        {tab === 'This month' ? (
          <ThisMonthTab month={month} setMonth={(m) => setView({ m })} totals={totals} />
        ) : (
          <OnePersonTab who={who} people={people} onPick={(p) => setView({ p })} />
        )}
      </Tabs>
    </>
  )
}

export default function PayslipsRoute() {
  return (
    <RequireCap cap="pricing">
      <ErrorBoundary what="Payslips">
        <Payslips />
      </ErrorBoundary>
    </RequireCap>
  )
}
