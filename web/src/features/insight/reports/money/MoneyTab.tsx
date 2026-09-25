import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { SectionHead } from '@/shared/ui/PageHead'
import { invoicesNow } from '@/domain/invoices/invoices'
import { money } from '@/shared/lib/format'
import { companyCost, payTotals } from '@/domain/payroll/payroll'
import { inr } from '@/domain/company/money'
import { PAYMONTHS } from '@/data/hrms'
import { useClients } from '@/domain/company/clients'
import { usePayments } from '@/domain/invoices/payments'
import { useReportExport } from '@/features/insight/reports/reportExport'
import { moneyByClient, moneyByMonth, moneyCsv, moneyTotal } from './money'
import { Note } from '@/shared/ui/Layout'

const MONTH_COLS = '120px 90px 90px 1fr 1fr 1fr 1fr 1fr'
const CLIENT_COLS = '1.2fr 90px 90px 1fr 1fr 1fr 1fr'

export function MoneyTab() {
  const clients = useClients()
  usePayments()
  const inv = invoicesNow(clients)
  const months = moneyByMonth(inv)
  const byClient = moneyByClient(inv)
  const all = moneyTotal(inv)
  useReportExport(() => moneyCsv(months))

  const rate = all.billed ? Math.round((all.paid / all.billed) * 100) : 0
  const payrollCost = (m: string) => (PAYMONTHS.includes(m) ? inr(companyCost(payTotals(m))) : '—')

  return (
    <>
      <Kpis>
        <Kpi title="Billed" value={money(all.billed)} detail={`${all.invoices} invoices · ${all.orders.toLocaleString()} orders`} />
        <Kpi title="Paid" value={<span className="ok">{money(all.paid)}</span>} detail={`${rate}% of what was billed`} />
        <Kpi title="Still owed" value={<span className={all.owed ? 'warn' : 'ok'}>{money(all.owed)}</span>} detail="billed and not yet paid" />
        <Kpi
          title="Overdue"
          value={<span className={all.overdue ? 'bad' : 'ok'}>{money(all.overdue)}</span>}
          tone={all.overdue ? 'alert' : undefined}
          detail="past the client’s terms"
        />
      </Kpis>

      <SectionHead>By month</SectionHead>
      <FlexTable
        cols={MONTH_COLS}
        min={900}
        head={['Month', 'Invoices', 'Orders', 'Billed', 'Paid against it', 'Still owed', 'Overdue', 'Payroll cost']}
      >
        {months.map((x) => (
          <FlexRow cols={MONTH_COLS} key={x.m}>
            <Cell v={x.m} />
            <Cell v={x.invoices} mono />
            <Cell v={x.orders.toLocaleString()} mono />
            <Cell v={money(x.billed)} mono />
            <Cell v={money(x.paid)} mono tone={x.paid ? 'ok' : undefined} />
            <Cell v={x.owed ? money(x.owed) : '—'} mono tone={x.owed ? 'warn' : undefined} />
            <Cell v={x.overdue ? money(x.overdue) : '—'} mono tone={x.overdue ? 'bad' : undefined} />
            <Cell v={payrollCost(x.m)} mono />
          </FlexRow>
        ))}
      </FlexTable>
      <Note plain top={10}>
        “Paid against it” is what has been paid on that month’s invoices, whenever it arrived — the register
        records how much of an invoice is paid, not the day the money came in. Payroll cost is in rupees and
        billing in dollars, so there is no margin here until an exchange rate is set.
      </Note>

      <SectionHead>By client</SectionHead>
      <FlexTable cols={CLIENT_COLS} min={820} head={['Client', 'Invoices', 'Orders', 'Billed', 'Paid', 'Still owed', 'Overdue']}>
        {byClient.map((x) => (
          <FlexRow cols={CLIENT_COLS} key={x.cl}>
            <Cell v={x.cl} />
            <Cell v={x.invoices} mono />
            <Cell v={x.orders.toLocaleString()} mono />
            <Cell v={money(x.billed)} mono />
            <Cell v={money(x.paid)} mono tone={x.paid ? 'ok' : undefined} />
            <Cell v={x.owed ? money(x.owed) : '—'} mono tone={x.owed ? 'warn' : undefined} />
            <Cell v={x.overdue ? money(x.overdue) : '—'} mono tone={x.overdue ? 'bad' : undefined} />
          </FlexRow>
        ))}
      </FlexTable>
    </>
  )
}
