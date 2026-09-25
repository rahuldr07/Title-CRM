import { useStageName } from '@/domain/company/naming'
import { useMemo, useRef, useState } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Avatar } from '@/shared/ui/Avatar'
import { Btn, Pill } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { Row, Rows } from '@/shared/ui/DetailList'
import { focusElement } from '@/shared/ui/focus'
import { useUi } from '@/shared/ui/UiProvider'
import { PAYMONTHS } from '@/data/hrms'
import { runStateOf, useRuns } from '@/domain/payroll/payruns'
import type { PayTotals } from '@/domain/payroll/payroll'
import { inr } from '@/domain/company/money'
import { usePayslipDownloads } from '@/features/hrms/payslips/usePayslipDownloads'
import { filterPayslips } from '@/features/hrms/payslips/payslips'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { fmtUsDate } from '@/shared/lib/format'
import { Inline, Note } from '@/shared/ui/Layout'
import { Input } from '@/shared/ui/Controls'

const MONTH_COLS = '200px 140px 130px 130px 130px 1fr'

export function ThisMonthTab({
  month,
  setMonth,
  totals,
}: {
  month: string
  setMonth: (m: string) => void
  totals: PayTotals
}) {
  const navigate = useGo()
  const stageName = useStageName()
  const runs = useRuns()
  const { openModal, closeModal } = useUi()
  const download = usePayslipDownloads()
  const [only, setOnly] = useState<'all' | 'lop'>('all')
  const [query, setQuery] = useState('')
  const list = useRef<HTMLDivElement>(null)

  const run = runs[month]

  const openPayslip = (personId: string) =>
    navigate({ to: '/payslips/$personId', params: { personId }, search: { m: month } })

  const rows = useMemo(() => filterPayslips(totals.list, only, query), [totals.list, only, query])

  const focusList = () => focusElement(list.current)

  const showCredited = () =>
    openModal({
      title: `What was credited — ${month}`,
      body: (
        <>
          <Rows>
            <Row
              icon={<span className="gr" style={{ fontSize: 'var(--t-lead)' }}>·</span>}
              title="Gross earnings"
              detail="before anything is taken off"
              right={<span className="mono">{inr(totals.gross)}</span>}
            />
            <Row
              icon={<span className="bad" style={{ fontSize: 'var(--t-lead)' }}>⚑</span>}
              title="Less deductions"
              detail="PF, PT, ESI and tax"
              right={<span className="mono bad">−{inr(totals.ded)}</span>}
            />
          </Rows>
          <Inline align={false} justify="space-between" style={{ padding: '13px 2px 0', fontSize: 'var(--t-lead)', borderTop: '1px solid var(--hair)', marginTop: 10 }}>
            <b>Credited to {totals.list.length} accounts</b>
            <b className="mono ok">{inr(totals.net)}</b>
          </Inline>
          <Note margin="14px 0 0">
            The same figures the payroll register was approved on. A payslip is not recomputed when
            it is opened.
          </Note>
        </>
      ),
      footer: (
        <>
          <Btn
            variant="ghost"
            onClick={() => {
              closeModal()
              navigate({ to: '/payroll' })
            }}
          >
            The run
          </Btn>
          <Btn onClick={closeModal}>Close</Btn>
        </>
      ),
    })

  return (
    <>
      <div className="fbar" role="group" aria-label="Month">
        {PAYMONTHS.map((m) => {
          const r = runs[m]
          return (
            <Pill key={m} on={month === m} onClick={() => setMonth(m)}>
              {m} <Chip kind={r?.published ? 'v' : 'n'}>{r?.published ? 'Published' : 'Not out'}</Chip>
            </Pill>
          )
        })}
      </div>

      {!run?.published ? (
        <Card padded>
          <Note margin={0}>
            {month} is <b>{runStateOf(run?.state ?? 'draft')[0].toLowerCase()}</b>. Payslips are
            produced when the run is published — until then there is nothing to show, and showing a
            draft to anyone would be worse than showing nothing.
          </Note>
          <div style={{ marginTop: 14 }}>
            <Btn onClick={() => navigate({ to: '/payroll' })}>Open the run</Btn>
          </div>
        </Card>
      ) : (
        <>
          <Kpis>
            <Kpi
              title="Payslips out"
              value={totals.list.length}
              detail="visible to each person"
              icon="›"
              hint="Show everyone, filters cleared"
              onClick={() => {
                setOnly('all')
                setQuery('')
                focusList()
              }}
            />
            <Kpi
              title="Total net"
              value={
                <span className="ok" style={{ fontSize: 'var(--t-h1)' }}>
                  {inr(totals.net)}
                </span>
              }
              detail="as credited"
              icon="›"
              hint="Gross less deductions"
              onClick={showCredited}
            />
            <Kpi
              title="With a deduction for unpaid days"
              value={<span className={totals.lop.length ? 'warn' : 'ok'}>{totals.lop.length}</span>}
              tone={totals.lop.length ? 'warn' : undefined}
              detail="the ones people query"
              icon="›"
              hint="Filter the list to just these"
              onClick={() => {
                setOnly('lop')
                focusList()
              }}
            />
            <Kpi
              title="Approved by"
              value={<span style={{ fontSize: 'var(--t-h3)' }}>{(run.by ?? '—').split(' ')[0]}</span>}
              detail={run.at ? fmtUsDate(run.at) : ''}
              icon="›"
              hint="Open the run it was approved on"
              onClick={() => navigate({ to: '/payroll' })}
            />
          </Kpis>

          <div className="fbar" role="group" aria-label="Which payslips">
            <Pill on={only === 'all'} onClick={() => setOnly('all')}>
              Everyone
            </Pill>
            <Pill on={only === 'lop'} onClick={() => setOnly('lop')}>
              With a deduction — {totals.lop.length}
            </Pill>
            <div className="sp">
              <Input
                type="search"
                placeholder="Find a person or department"
                label="Find a payslip"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <FlexTable
            cols={MONTH_COLS}
            min={860}
            head={['Name', 'Department', 'Gross', 'Deductions', 'Net', '']}
            bodyRef={list}
          >
            {!rows.length ? (
              <div className="rw" style={{ padding: 18 }}>
                <span />
                <span className="gr" style={{ fontSize: 'var(--t-body)' }}>
                  Nobody matches that.
                </span>
                <span />
              </div>
            ) : (
              rows.map((x) => (
                <FlexRow
                  key={x.p.id}
                  onClick={() => openPayslip(x.p.id)}
                  aria-label={`Open ${x.p.n}’s payslip for ${month}`}
                >
                  <Cell>
                    <Inline gap={8}>
                      <Avatar name={x.p.n} />
                      <div className="v">{x.p.n}</div>
                    </Inline>
                  </Cell>
                  <Cell>
                    <div className="v gr" style={{ fontSize: 'var(--t-small)' }}>
                      {stageName(x.p.dep[0] ?? '—')}
                    </div>
                  </Cell>
                  <Cell>
                    <div className="v mono">{inr(x.gross)}</div>
                    {x.unpaid ? <div className="s warn">{x.unpaid} unpaid</div> : null}
                  </Cell>
                  <Cell>
                    <div className="v mono warn">{inr(x.totalDed)}</div>
                  </Cell>
                  <Cell>
                    <div className="v mono ok" style={{ fontWeight: 650 }}>
                      {inr(x.net)}
                    </div>
                  </Cell>
                  <Cell>
                    <Btn
                      variant="ghost"
                      small
                      aria-label={`Download ${x.p.n}’s ${month} payslip`}
                      onClick={() => download.payslip(x.p, month)}
                    >
                      Download
                    </Btn>
                  </Cell>
                </FlexRow>
              ))
            )}
          </FlexTable>

          <Note top={10}>
            Each person sees only their own, under My payslips. This list exists so whoever runs
            payroll can answer a question without asking them to forward it.
          </Note>
        </>
      )}
    </>
  )
}
