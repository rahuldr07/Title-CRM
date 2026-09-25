import { Assumption } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { DetailRow } from '@/shared/ui/DetailList'
import { companyCost, type PayTotals } from '@/domain/payroll/payroll'
import { inr } from '@/domain/company/money'
import { payCfgOf } from '@/domain/payroll/payruns'
import type { CsvRow } from '@/shared/lib/csv'
import { exportRefusal, STATUTORY_FILES, statutoryFile } from '@/features/hrms/payroll/payrollFiles'
import { useSession } from '@/domain/auth/SessionProvider'
import { Inline, Note } from '@/shared/ui/Layout'

export function CostTab({
  month,
  totals,
  exportCsv,
}: {
  month: string
  totals: PayTotals
  exportCsv: (name: string, rows: CsvRow[], noun: string) => void
}) {
  const { me } = useSession()
  const withheld = STATUTORY_FILES.flatMap(([label, , header]) => (exportRefusal(me, header) ? [label] : []))
  return (
    <div className="two">
      <Card padded>
        <Label>What this costs the company</Label>
        {(
          [
            ['Gross earnings', totals.gross],
            ['Provident fund — employer', totals.erpf],
            ['ESI — employer', totals.esiEr],
            ['Gratuity provisioned', totals.grat],
          ] as [string, number][]
        ).map(([label, v]) => (
          <Line key={label} label={label} value={inr(v)} />
        ))}
        <Inline align={false} justify="space-between" style={{ padding: '11px 0 0', fontSize: 'var(--t-lead)' }}>
          <b>Total cost</b>
          <b className="mono">{inr(companyCost(totals))}</b>
        </Inline>
        <Note top={12}>
          Net pay is what lands in accounts; this is what the month actually costs. The difference is
          the employer’s own contributions.
        </Note>
      </Card>

      <Card padded>
        <Label>Statutory to remit</Label>
        {(
          [
            ['Provident fund — employee + employer', totals.pf + totals.erpf, 'EPFO, by the 15th'],
            ['ESI — employee + employer', totals.esi + totals.esiEr, 'ESIC, by the 15th'],
            ['Professional tax', totals.pt, `${payCfgOf(month).ptState}, monthly`],
            ['TDS on salary', totals.tds, 'by the 7th of next month'],
          ] as [string, number, string][]
        ).map(([label, v, when]) => (
          <div className="rw" key={label} style={{ padding: '9px 0' }}>
            <span className="gr">·</span>
            <span>
              <b>{label}</b>
              <div className="sd gr">{when}</div>
            </span>
            <span className="mono">{inr(v)}</span>
          </div>
        ))}
        <Inline align={false} gap={8} wrap style={{ marginTop: 14 }}>
          {STATUTORY_FILES.map((f) => (
            <Btn
              key={f[0]}
              variant="ghost"
              small
              disabled={withheld.includes(f[0])}
              onClick={() => {
                const out = statutoryFile(me, f, totals.list)
                if (out.rows) exportCsv(f[1], out.rows, 'people')
              }}
            >
              {f[0]}
            </Btn>
          ))}
        </Inline>
        {withheld.length ? (
          <Note top={10}>
            {withheld.join(', ')} carry PAN, UAN or ESIC numbers, which are personal records: exporting
            them needs the “people” capability as well as “pricing”, and your role does not have it.
          </Note>
        ) : null}
        <Assumption title="These are the right figures in the right shape, not portal-ready files">
          Each downloads with the columns the corresponding portal asks for, from the same run the
          register came from. <b>The exact file layouts change, and each portal has its own
          validator</b> — have whoever files your returns run one through before you rely on it.
        </Assumption>
      </Card>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return <DetailRow label={label} value={<b className="mono">{value}</b>} />
}
