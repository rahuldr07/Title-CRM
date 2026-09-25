import { useStageName } from '@/domain/company/naming'
import { useMemo, useState } from 'react'
import { Avatar } from '@/shared/ui/Avatar'
import { Btn, Pill } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Controls'
import { Card } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Empty } from '@/shared/ui/Banner'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { PageHead } from '@/shared/ui/PageHead'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { LNKIND, LNSTATUS } from '@/data/loans'
import { PAYMONTHS } from '@/data/hrms'
import { whoName, useStaff, findPerson } from '@/domain/people/roster'
import { inr } from '@/domain/company/money'
import { csvName, downloadCSV } from '@/shared/lib/csv'
import { useGo } from '@/shared/hooks/useGo'
import { LOAN_POLICY, loanDeductionsFor, nextPayrollMonth, outstanding, recoveredInMonth, scheduleFor } from '@/domain/loans/loans'
import { useLoanConfirm } from './useLoanConfirm'
import { useLoans } from '@/domain/loans/loanStore'
import type { LoanStatus } from '@/data/types'
import { fmtDate, labelOf } from '@/shared/lib/format'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { Inline, Note } from '@/shared/ui/Layout'

const COLS = 'minmax(180px,1.6fr) 130px 100px 90px 100px 90px 110px 190px'
const PAGE = 10

const TABS: [LoanStatus | 'all', string][] = [
  ['all', 'All'],
  ['requested', 'Requested'],
  ['active', 'Active'],
  ['paused', 'Paused'],
  ['closed', 'Closed'],
  ['rejected', 'Rejected'],
]

function Loans() {
  const staff = useStaff()
  const stageName = useStageName()
  const go = useGo()
  const { me, can } = useSession()
  const { toast } = useUi()
  const { loans, payments } = useLoans()

  const [tab, setTab] = useState<LoanStatus | 'all'>('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const canAll = can('pricing')
  const scope = useMemo(
    () => (canAll ? loans : loans.filter((l) => l.who === me.id)),
    [canAll, loans, me.id],
  )

  const query = q.trim().toLowerCase()
  const filtered = useMemo(() => {
    const byTab = tab === 'all' ? scope : scope.filter((l) => l.st === tab)
    return query ? byTab.filter((l) => whoName(l.who).toLowerCase().includes(query)) : byTab
  }, [scope, tab, query])

  const sorted = useMemo(() => [...filtered].sort((a, b) => b.reqAt.getTime() - a.reqAt.getTime()), [filtered])
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE))
  const shown = sorted.slice((page - 1) * PAGE, page * PAGE)

  const scopeIds = useMemo(() => new Set(scope.map((l) => l.id)), [scope])
  const scopedPayments = useMemo(() => payments.filter((p) => scopeIds.has(p.loanId)), [payments, scopeIds])
  const recoveredMonth = [...PAYMONTHS].reverse().find((m) => scopedPayments.some((p) => p.mn === m)) ?? null
  const recoveredAmt = recoveredMonth ? recoveredInMonth(scopedPayments, recoveredMonth) : 0

  const openCount = scope.filter((l) => l.st === 'active' || l.st === 'paused').length
  const outstandingTotal = scope
    .filter((l) => l.st === 'active' || l.st === 'paused')
    .reduce((a, l) => a + outstanding(l), 0)
  const activeCount = scope.filter((l) => l.st === 'active').length
  const requestedCount = scope.filter((l) => l.st === 'requested').length

  const previewMonth = nextPayrollMonth()
  const activeOwners = useMemo(
    () => [...new Set(loans.filter((l) => l.st === 'active').map((l) => l.who))],
    [loans],
  )
  const previewRows = useMemo(
    () => activeOwners.flatMap((pid) => loanDeductionsFor(pid, previewMonth, loans, payments)),
    [activeOwners, previewMonth, loans, payments],
  )

  const exportLoans = () => {
    const out = downloadCSV(csvName('loans-advances'), [
      ['Person', 'Type', 'Principal', 'EMI', 'Balance', 'Status', 'Requested'],
      ...sorted.map((l) => [
        whoName(l.who),
        labelOf(LNKIND, l.kind)[0],
        l.amt,
        l.emi,
        outstanding(l),
        labelOf(LNSTATUS, l.st)[0],
        fmtDate(l.reqAt),
      ]),
    ])
    toast(`${out.name} — ${out.rows.length - 1} rows`)
  }

  const confirm = useLoanConfirm()

  return (
    <>
      <PageHead
        title="Loans & advances"
        sub="Recovery happens inside the payroll run — approve here, deduct automatically, close at zero."
        actions={
          <>
            {canAll ? (
              <Btn variant="ghost" onClick={exportLoans}>
                ↓ Export CSV
              </Btn>
            ) : null}
            <Btn onClick={() => go({ to: '/loans/new' })}>+ New request</Btn>
          </>
        }
      />

      <Kpis>
        <Kpi title="Outstanding" value={inr(outstandingTotal)} valueSize={23} detail={`${openCount} open`} />
        <Kpi title="Active" value={activeCount} />
        <Kpi title="Requested" value={requestedCount} tone={requestedCount ? 'warn' : undefined} />
        <Kpi
          title={recoveredMonth ? `Recovered · ${recoveredMonth.split(' ')[0]}` : 'Recovered'}
          value={inr(recoveredAmt)}
          valueSize={23}
          valueTone="ok"
        />
      </Kpis>

      <div className="brkout" style={{ marginTop: 16 }}>
        <div>
          <div className="fbar">
            {TABS.map(([key, label]) => (
              <Pill
                key={key}
                on={tab === key}
                count={key === 'all' ? scope.length : scope.filter((l) => l.st === key).length}
                onClick={() => {
                  setTab(key)
                  setPage(1)
                }}
              >
                {label}
              </Pill>
            ))}
            <Input
              style={{ marginLeft: 'auto', maxWidth: 220 }}
              placeholder="Search by person"
              label="Search by person"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {shown.length ? (
            <>
              <Card top={12}>
                <FlexTable
                  cols={COLS}
                  min={990}
                  head={['Person', 'Type', 'Principal', 'EMI', 'Balance', 'Next', 'Status', '']}
                  wrap="none"
                >
                  {shown.map((l) => {
                    const person = findPerson(staff, l.who)
                    const due = scheduleFor(l, payments).find((r) => r.status === 'due')
                    const goTo = () => go({ to: '/loans/$loanId', params: { loanId: l.id } })
                    return (
                      <FlexRow key={l.id} onClick={goTo}>
                        <Cell>
                          <Inline gap={8}>
                            <Avatar name={person?.n ?? whoName(l.who)} />
                            <div>
                              <div className="v">{person?.n ?? whoName(l.who)}</div>
                              {person?.dep.length ? <div className="s">{stageName(person.dep[0] ?? '')}</div> : null}
                            </div>
                          </Inline>
                        </Cell>
                        <Cell>
                          <div className="v" style={{ fontSize: 'var(--t-small)' }}>
                            {labelOf(LNKIND, l.kind)[0]}
                          </div>
                        </Cell>
                        <Cell>
                          <div className="v mono">{inr(l.amt)}</div>
                        </Cell>
                        <Cell>
                          <div className="v mono">{inr(l.emi)}</div>
                        </Cell>
                        <Cell>
                          <div className="v mono">{inr(outstanding(l))}</div>
                        </Cell>
                        <Cell>
                          <div className="v" style={{ fontSize: 'var(--t-small)' }}>
                            {due ? due.due : '—'}
                          </div>
                        </Cell>
                        <Cell>
                          <Chip kind={labelOf(LNSTATUS, l.st)[1]}>{labelOf(LNSTATUS, l.st)[0]}</Chip>
                        </Cell>
                        <Cell onClick={(e) => e.stopPropagation()}>
                          {canAll && l.st === 'requested' && l.who !== me.id ? (
                            <span style={{ display: 'flex', gap: 6 }}>
                              <Btn variant="ghost" small onClick={() => confirm('reject', l)}>
                                Reject
                              </Btn>
                              <Btn small onClick={() => confirm('approve', l)}>
                                Approve
                              </Btn>
                            </span>
                          ) : canAll && l.st === 'active' ? (
                            <Btn variant="ghost" small onClick={() => confirm('pause', l)}>
                              Pause
                            </Btn>
                          ) : canAll && l.st === 'paused' ? (
                            <Btn small onClick={() => confirm('resume', l)}>
                              Resume
                            </Btn>
                          ) : null}
                        </Cell>
                      </FlexRow>
                    )
                  })}
                </FlexTable>
              </Card>
              <Inline justify="space-between" style={{ marginTop: 10 }}>
                <Note margin={0}>
                  Showing {shown.length} of {sorted.length}
                </Note>
                {pageCount > 1 ? (
                  <Inline gap={6} align={false}>
                    <Btn variant="ghost" small disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </Btn>
                    <Btn
                      variant="ghost"
                      small
                      disabled={page >= pageCount}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Btn>
                  </Inline>
                ) : null}
              </Inline>
            </>
          ) : (
            <Card padded top={12}>
              <Empty
                icon="₹"
                action={<Btn small onClick={() => go({ to: '/loans/new' })}>+ New request</Btn>}
              >
                {q || tab !== 'all' ? 'Nothing matches this filter.' : 'No loans or advances yet.'}
              </Empty>
            </Card>
          )}
        </div>
      </div>

      {canAll ? (
        <Inline className="brkout" align="start" wrap gap={16} style={{ marginTop: 16 }}>
          <Card padded style={{ flex: '1 1 280px' }}>
            <div className="lb">Payroll — {previewMonth} preview</div>
            <Note top={4}>
              Deduction line-items this module will inject
            </Note>
            {previewRows.length ? (
              <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                {previewRows.map((d) => (
                  <Inline key={d.loan.id} align={false} justify="space-between" style={{ fontSize: 'var(--t-small)' }}>
                    <span>
                      {whoName(d.loan.who)} · {d.loan.kind === 'loan' ? 'EMI' : 'advance recovery'}
                    </span>
                    <span className="mono">{inr(d.amount)}</span>
                  </Inline>
                ))}
              </div>
            ) : (
              <Note top={10}>
                Nothing due next run.
              </Note>
            )}
            <p style={{ fontSize: 'var(--t-small)', marginTop: 12 }} className="bnr v" >
              Injected automatically once the run advances — payslips print “Loan EMI ₹x · balance after
              ₹y”.
            </p>
          </Card>

          <Card padded style={{ flex: '1 1 280px' }}>
            <div className="lb">Policy limits</div>
            <div style={{ display: 'grid', gap: 8, marginTop: 10, fontSize: 'var(--t-small)' }}>
              <Inline align={false} justify="space-between">
                <span>Advance</span>
                <b>≤ {LOAN_POLICY.advancePctOfNet}% of monthly net</b>
              </Inline>
              <Inline align={false} justify="space-between">
                <span>Loan</span>
                <b>≤ {LOAN_POLICY.loanMultipleOfGross}× monthly gross</b>
              </Inline>
              <Inline align={false} justify="space-between">
                <span>Concurrent</span>
                <b>1 loan + 1 advance</b>
              </Inline>
            </div>
            <div className="bnr r" style={{ marginTop: 12 }}>
              <span className="bi">⚑</span>
              <div style={{ fontSize: 'var(--t-small)' }}>
                A request is decided by whoever holds pricing — never the person who asked for it.
              </div>
            </div>
          </Card>
        </Inline>
      ) : null}
    </>
  )
}

export default function LoansRoute() {
  return (
    <ErrorBoundary what="Loans & advances">
      <Loans />
    </ErrorBoundary>
  )
}
