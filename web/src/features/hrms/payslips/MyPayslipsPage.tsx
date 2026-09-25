import { useMemo } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Btn } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { PageHead, SectionHead } from '@/shared/ui/PageHead'
import { focusSection } from '@/shared/ui/focus'
import { LoanCard } from './LoanCard'
import { useSession } from '@/domain/auth/SessionProvider'
import { PAYMONTHS } from '@/data/hrms'
import { useRuns } from '@/domain/payroll/payruns'
import { payslipOf, ytd } from '@/domain/payroll/payroll'
import { fyOfPayMonth } from '@/domain/payroll/fiscalYear'
import { inr } from '@/domain/company/money'
import { usePayslipDownloads } from './usePayslipDownloads'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { Note } from '@/shared/ui/Layout'

const COLS = '150px 140px 140px 140px 1fr'

export default function MyPayslips() {
  const { me } = useSession()
  const navigate = useGo()
  const download = usePayslipDownloads()

  const runs = useRuns()
  const published = useMemo(() => PAYMONTHS.filter((m) => runs[m]?.published).reverse(), [runs])
  const pending = useMemo(() => PAYMONTHS.filter((m) => !runs[m]?.published), [runs])

  const openPayslip = (month: string) =>
    navigate({ to: '/payslips/$personId', params: { personId: me.id }, search: { m: month } })

  if (!me.ctc) {
    return (
      <>
        <PageHead title="My payslips" />
        <Card padded style={{ maxWidth: 560 }}>
          <Note plain size="body" margin={0}>
            There is no salary on your record yet, so no payslip has been produced. Whoever runs
            payroll can set it.
          </Note>
        </Card>
      </>
    )
  }

  const newest = published[0]
  const latest = newest ? payslipOf(me, newest) : null
  const year = newest ? ytd(me, newest) : null

  return (
    <>
      <PageHead
        title="My payslips"
        sub={`${me.n} · ${published.length} published`}
        actions={newest ? <Btn onClick={() => openPayslip(newest)}>Open {newest}</Btn> : undefined}
      />

      {latest && year && newest ? (
        <Kpis>
          <Kpi
            title="Last net pay"
            value={inr(latest.net)}
            valueTone="ok"
            valueSize="var(--t-h1)"
            detail={newest}
            chevron
            hint="Open that payslip"
            onClick={() => openPayslip(newest)}
          />
          <Kpi
            title="Gross that month"
            value={inr(latest.gross)}
            valueSize="var(--t-h1)"
            detail="before deductions"
            chevron
            hint="Open that payslip"
            onClick={() => openPayslip(newest)}
          />
          <Kpi
            title="Deducted this year"
            value={inr(year.ded)}
            valueTone="warn"
            valueSize="var(--t-h1)"
            detail={`of which ${inr(year.tds)} tax`}
          />
          <Kpi
            title="Received this year"
            value={inr(year.net)}
            valueSize="var(--t-h1)"
            detail={`${year.months} month${year.months === 1 ? '' : 's'} of ${fyOfPayMonth(newest)}`}
            chevron
            hint="Month by month"
            onClick={() => focusSection('mpList')}
          />
        </Kpis>
      ) : null}

      <LoanCard personId={me.id} />

      <SectionHead id="mpList">Every payslip</SectionHead>

      {published.length ? (
        <FlexTable cols={COLS} min={760} head={['Month', 'Gross', 'Deductions', 'Net pay', '']}>
          {published.map((m) => {
            const s = payslipOf(me, m)
            return (
              <FlexRow key={m} onClick={() => openPayslip(m)}>
                <Cell>
                  <div className="v">{m}</div>
                  {s.a.lop ? (
                    <div className="s warn">
                      {s.a.lop} unpaid day{s.a.lop === 1 ? '' : 's'}
                    </div>
                  ) : null}
                </Cell>
                <Cell>
                  <div className="v mono">{inr(s.gross)}</div>
                </Cell>
                <Cell>
                  <div className="v mono warn">{inr(s.totalDed)}</div>
                </Cell>
                <Cell>
                  <div className="v mono ok" style={{ fontWeight: 650 }}>
                    {inr(s.net)}
                  </div>
                </Cell>
                <Cell>
                  <Btn
                    variant="ghost"
                    small
                    aria-label={`Download the ${m} payslip`}
                    onClick={() => download.payslip(me, m)}
                  >
                    Download
                  </Btn>
                </Cell>
              </FlexRow>
            )
          })}
        </FlexTable>
      ) : (
        <Card padded>
          <Note margin={0}>
            Nothing published yet.
          </Note>
        </Card>
      )}

      {pending.length ? (
        <Note top={10}>
          {pending.join(', ')} {pending.length === 1 ? 'is' : 'are'} not published yet.{' '}
          {pending.length === 1 ? 'It' : 'They'} will appear here once payroll is approved and
          released — you are not missing anything.
        </Note>
      ) : null}
    </>
  )
}
