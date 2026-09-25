import { useStageName } from '@/domain/company/naming'
import { useState } from 'react'
import { useParams, useSearch } from '@tanstack/react-router'
import { Btn } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { KeyValues, Timeline, type TimelineEntry } from '@/shared/ui/DetailList'
import { NotFoundRecord } from '@/shared/ui/NotFoundRecord'
import { PageHead } from '@/shared/ui/PageHead'
import { Tabs } from '@/shared/ui/Tabs'
import { useSession } from '@/domain/auth/SessionProvider'
import { LNKIND, LNSTATUS } from '@/data/loans'
import { whoName, useStaff, findPerson } from '@/domain/people/roster'
import { inr } from '@/domain/company/money'
import { fmtDT, labelOf, TZ } from '@/shared/lib/format'

const at = (d: Date) => `${fmtDT(d)} ${TZ}`
import { useGo } from '@/shared/hooks/useGo'
import { activityFor, outstanding, scheduleFor } from '@/domain/loans/loans'
import { useLoanConfirm } from '@/features/hrms/loans/useLoanConfirm'
import { useLoans } from '@/domain/loans/loanStore'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { Note } from '@/shared/ui/Layout'

const TABS = ['Overview', 'Schedule', 'Activity'] as const
type Tab = (typeof TABS)[number]

const isTab = (v: unknown): v is Tab => TABS.includes(v as Tab)

export default function LoanDetail() {
  const { loanId } = useParams({ from: '/loans/$loanId' })
  const { tab: tabParam } = useSearch({ from: '/loans/$loanId' })
  const go = useGo()
  const stageName = useStageName()
  const { me, can } = useSession()
  const { loans, payments, events } = useLoans()
  const everyone = useStaff()
  const confirm = useLoanConfirm()

  const [tab, setTab] = useState<Tab>(isTab(tabParam) ? tabParam : 'Overview')

  const loan = loans.find((l) => l.id === loanId)
  const canAll = can('pricing')
  const visible = loan && (loan.who === me.id || canAll)

  if (!loan || !visible) {
    return <NotFoundRecord what="loan or advance" backTo="/loans" backLabel="Loans & advances" />
  }

  const person = findPerson(everyone, loan.who)
  const schedule = scheduleFor(loan, payments)
  const activity = activityFor(loan.id, events, payments)

  const ACTION_LABEL: Record<string, string> = {
    requested: 'Requested',
    approved: 'Approved',
    rejected: 'Rejected',
    paused: 'Paused',
    resumed: 'Resumed',
    closed: 'Closed',
  }

  const timeline: TimelineEntry[] = activity.map((a, i) => ({
    id: `${a.kind}-${i}`,
    when: at(a.at),
    who: a.kind === 'event' ? whoName(a.event!.by) : `Payroll — ${a.payment!.mn}`,
    what:
      a.kind === 'event'
        ? `${ACTION_LABEL[a.event!.action]}${a.event!.note ? ` — ${a.event!.note}` : ''}`
        : `${inr(a.payment!.amt)} recovered`,
  }))

  const actions =
    canAll && loan.st === 'requested' && loan.who !== me.id ? (
      <>
        <Btn variant="ghost" onClick={() => confirm('reject', loan)}>
          Reject
        </Btn>
        <Btn onClick={() => confirm('approve', loan)}>Approve</Btn>
      </>
    ) : canAll && loan.st === 'active' ? (
      <Btn variant="ghost" onClick={() => confirm('pause', loan)}>
        Pause
      </Btn>
    ) : canAll && loan.st === 'paused' ? (
      <Btn onClick={() => confirm('resume', loan)}>Resume</Btn>
    ) : undefined

  return (
    <>
      <PageHead
        parent={{ to: '/loans', label: 'Loans & advances' }}
        title={`${person?.n ?? whoName(loan.who)} — ${labelOf(LNKIND, loan.kind)[0]}`}
        sub={<Chip kind={labelOf(LNSTATUS, loan.st)[1]}>{labelOf(LNSTATUS, loan.st)[0]}</Chip>}
        actions={actions}
      />

      <Tabs
        tabs={[...TABS]}
        value={tab}
        onChange={(t) => {
          setTab(t)
          go({ to: '/loans/$loanId', params: { loanId: loan.id }, search: { tab: t }, replace: true })
        }}
      >
        {tab === 'Overview' ? (
          <Card padded style={{ marginTop: 14, maxWidth: 640 }}>
            <KeyValues
              rows={[
                ['Person', person?.n ?? whoName(loan.who)],
                ['Department', person?.dep.map(stageName).join(', ') ?? '—'],
                ['Type', labelOf(LNKIND, loan.kind)[0]],
                ['Principal', inr(loan.amt)],
                ['EMI', inr(loan.emi)],
                ['Paid so far', inr(loan.paid)],
                ['Balance', inr(outstanding(loan))],
                ['Requested', at(loan.reqAt)],
                ...(loan.decidedBy
                  ? ([['Decided by', `${whoName(loan.decidedBy)} · ${loan.decidedAt ? at(loan.decidedAt) : '—'}`]] as [
                      string,
                      string,
                    ][])
                  : []),
                ...(loan.takenOn ? ([['Disbursed', at(loan.takenOn)]] as [string, string][]) : []),
                ['Purpose', loan.note],
              ]}
            />
          </Card>
        ) : null}

        {tab === 'Schedule' ? (
          <Card top={14}>
            {schedule.length ? (
              <FlexTable
                cols="60px 1fr 140px 120px"
                min={500}
                head={['#', 'Due', 'Amount', 'Status']}
                wrap="none"
              >
                {schedule.map((r) => (
                  <FlexRow key={r.seq}>
                    <Cell>
                      <div className="v mono">{r.seq}</div>
                    </Cell>
                    <Cell>
                      <div className="v">{r.due}</div>
                    </Cell>
                    <Cell>
                      <div className="v mono">{inr(r.amount)}</div>
                    </Cell>
                    <Cell>
                      <Chip kind={r.status === 'paid' ? 'v' : r.status === 'due' ? 'r' : 'n'}>
                        {r.status === 'paid' ? 'Paid' : r.status === 'due' ? 'Due next' : 'Upcoming'}
                      </Chip>
                    </Cell>
                  </FlexRow>
                ))}
              </FlexTable>
            ) : (
              <p className="gr" style={{ fontSize: 'var(--t-small)', padding: 16, margin: 0 }}>
                No schedule until this request is approved.
              </p>
            )}
          </Card>
        ) : null}

        {tab === 'Activity' ? (
          <Card padded top={14}>
            {timeline.length ? (
              <Timeline entries={timeline} />
            ) : (
              <Note margin={0}>
                Nothing recorded yet.
              </Note>
            )}
          </Card>
        ) : null}
      </Tabs>
    </>
  )
}
