import { useStageName } from '@/domain/company/naming'
import { useMemo } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Btn } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Field } from '@/shared/ui/Form'
import { Select } from '@/shared/ui/Controls'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { Row, Rows } from '@/shared/ui/DetailList'
import { useUi } from '@/shared/ui/UiProvider'
import { PAYMONTHS } from '@/data/hrms'
import { useRuns } from '@/domain/payroll/payruns'
import type { Person } from '@/data/types'
import { payslipOf } from '@/domain/payroll/payroll'
import { inr } from '@/domain/company/money'
import { usePayslipDownloads } from '@/features/hrms/payslips/usePayslipDownloads'
import { sumPayslips } from '@/features/hrms/payslips/payslips'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { Note } from '@/shared/ui/Layout'

const PERSON_COLS = '170px 130px 130px 130px 110px 1fr'

export function OnePersonTab({
  who,
  people,
  onPick,
}: {
  who: Person | undefined
  people: Person[]
  onPick: (id: string) => void
}) {
  const navigate = useGo()
  const stageName = useStageName()
  const { openModal } = useUi()
  const download = usePayslipDownloads()

  const runs = useRuns()
  const months = useMemo(() => PAYMONTHS.filter((m) => runs[m]?.published), [runs])
  const rows = useMemo(
    () => (who ? months.map((m) => ({ m, s: payslipOf(who, m) })) : []),
    [who, months],
  )

  const sum = useMemo(() => sumPayslips(rows.map((r) => r.s)), [rows])
  const latest = rows.at(-1)

  const openPayslip = (mn: string) =>
    who && navigate({ to: '/payslips/$personId', params: { personId: who.id }, search: { m: mn } })

  const showUnpaid = () => {
    if (!who) return
    const withUnpaid = rows.filter((r) => r.s.unpaid > 0)
    openModal({
      title: `${who.n} — months with an unpaid day`,
      body: (
        <>
          {withUnpaid.length ? (
            <Rows>
              {withUnpaid.map((r) => (
                <Row
                  key={r.m}
                  icon={<span className="bad" style={{ fontSize: 'var(--t-lead)' }}>⚑</span>}
                  title={r.m}
                  detail={`${r.s.unpaid} unpaid of ${r.s.a.working} working days`}
                  right={<span className="mono bad">−{inr(r.s.lopAmt)}</span>}
                />
              ))}
            </Rows>
          ) : (
            <Note size="body" margin={0}>
              No month has an unpaid day — every payslip is a full month.
            </Note>
          )}
          <Note margin="14px 0 0">
            An unpaid day is the commonest reason someone queries a payslip. Having the month named
            makes that a thirty-second conversation.
          </Note>
        </>
      ),
    })
  }

  return (
    <>
      <Field label="Whose payslips" style={{ maxWidth: 340, marginBottom: 16 }}>
        <Select
          field
          id="pspSel"
          value={who?.id ?? ''}
          onChange={onPick}
          options={people.map((p) => [p.id, `${p.n} — ${stageName(p.dep[0] ?? '—')}`] as const)}
        />
      </Field>

      {!latest ? (
        <Card padded>
          <Note size="body" margin={0}>
            No month has been published yet, so there is nothing to send.
          </Note>
        </Card>
      ) : (
        <>
          <Kpis>
            <Kpi
              title="Gross so far"
              value={<span style={{ fontSize: 'var(--t-h1)' }}>{inr(sum.gross)}</span>}
              detail={`across ${rows.length} months`}
              icon="›"
              hint="The latest payslip"
              onClick={() => openPayslip(latest.m)}
            />
            <Kpi
              title="Deducted"
              value={
                <span className="warn" style={{ fontSize: 'var(--t-h1)' }}>
                  {inr(sum.ded)}
                </span>
              }
              detail={`including ${inr(sum.tds)} tax`}
              icon="›"
              hint="The latest payslip"
              onClick={() => openPayslip(latest.m)}
            />
            <Kpi
              title="Taken home"
              value={
                <span className="ok" style={{ fontSize: 'var(--t-h1)' }}>
                  {inr(sum.net)}
                </span>
              }
              detail="as credited"
              icon="›"
              hint="The latest payslip"
              onClick={() => openPayslip(latest.m)}
            />
            <Kpi
              title="Unpaid days"
              value={<span className={sum.unpaid ? 'warn' : 'ok'}>{sum.unpaid}</span>}
              tone={sum.unpaid ? 'warn' : undefined}
              detail="the reason a month looks light"
              icon="›"
              hint="Which months, and why"
              onClick={showUnpaid}
            />
          </Kpis>

          <FlexTable
            cols={PERSON_COLS}
            min={760}
            head={['Month', 'Gross', 'Deductions', 'Net', 'Unpaid', '']}
          >
            {rows.map((r) => (
              <FlexRow
                key={r.m}
                onClick={() => openPayslip(r.m)}
                aria-label={`Open the ${r.m} payslip`}
              >
                <Cell>
                  <div className="v">{r.m}</div>
                </Cell>
                <Cell>
                  <div className="v mono">{inr(r.s.gross)}</div>
                </Cell>
                <Cell>
                  <div className="v mono warn">{inr(r.s.totalDed)}</div>
                </Cell>
                <Cell>
                  <div className="v mono ok" style={{ fontWeight: 650 }}>
                    {inr(r.s.net)}
                  </div>
                </Cell>
                <Cell>
                  <div className={`v mono ${r.s.unpaid ? 'warn' : 'gr'}`}>
                    {r.s.unpaid || '—'}
                  </div>
                </Cell>
                <Cell>
                  <Btn
                    variant="ghost"
                    small
                    aria-label={`Download the ${r.m} payslip`}
                    onClick={() => {
                      if (who) download.payslip(who, r.m)
                    }}
                  >
                    Download
                  </Btn>
                </Cell>
              </FlexRow>
            ))}
            <FlexRow total>
              <Cell>
                <div className="v" style={{ fontWeight: 700 }}>
                  Total of these months
                </div>
              </Cell>
              <Cell>
                <div className="v mono" style={{ fontWeight: 700 }}>
                  {inr(sum.gross)}
                </div>
              </Cell>
              <Cell>
                <div className="v mono">{inr(sum.ded)}</div>
              </Cell>
              <Cell>
                <div className="v mono ok" style={{ fontWeight: 700 }}>
                  {inr(sum.net)}
                </div>
              </Cell>
              <Cell />
              <Cell />
            </FlexRow>
          </FlexTable>

          <Note top={10}>
            This is the view for the question people actually ask — <i>send me my last three
            payslips</i>. It used to mean switching month by month and downloading one at a time.
          </Note>
        </>
      )}
    </>
  )
}
