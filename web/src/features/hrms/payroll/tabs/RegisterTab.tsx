import { useStageName } from '@/domain/company/naming'
import { Avatar } from '@/shared/ui/Avatar'
import { SectionHead } from '@/shared/ui/PageHead'
import type { PayTotals } from '@/domain/payroll/payroll'
import { inr } from '@/domain/company/money'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { Inline, Note } from '@/shared/ui/Layout'

const REGISTER_COLS = 'minmax(150px, 1.6fr) minmax(90px, 1.2fr) 40px repeat(8, minmax(64px, 1fr))'

export function RegisterTab({ totals, openPayslip }: { totals: PayTotals; openPayslip: (id: string) => void }) {
  const stageName = useStageName()
  return (
    <>
      <SectionHead>The register — {totals.list.length} people</SectionHead>
      <FlexTable
        cols={REGISTER_COLS}
        min={960}
        head={['Name', 'Department', 'LOP', 'Gross', 'PF', 'PT', 'ESI', 'TDS', 'Loans', 'Reimb.', 'Net pay']}
      >
        {totals.list.map((x) => (
          <FlexRow key={x.p.id} onClick={() => openPayslip(x.p.id)}>
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
              <div className={`v mono ${x.lopDays ? 'warn' : 'gr'}`}>{x.lopDays || '—'}</div>
            </Cell>
            <Cell>
              <div className="v mono">{inr(x.gross)}</div>
              {x.lopDays ? <div className="s warn">−{inr(x.lopAmt)}</div> : null}
            </Cell>
            <Cell>
              <div className="v mono">{inr(x.epf)}</div>
            </Cell>
            <Cell>
              <div className="v mono">{inr(x.pt)}</div>
            </Cell>
            <Cell>
              <div className={`v mono ${x.esi ? '' : 'gr'}`}>{x.esi ? inr(x.esi) : '—'}</div>
            </Cell>
            <Cell>
              <div className={`v mono ${x.tds ? '' : 'gr'}`}>{x.tds ? inr(x.tds) : '—'}</div>
            </Cell>
            <Cell>
              {x.loanDeds.length ? (
                <div className="v mono">{inr(x.loanDeds.reduce((a, d) => a + d.amount, 0))}</div>
              ) : (
                <div className="v mono gr">—</div>
              )}
            </Cell>
            <Cell>
              <div className={`v mono ${x.claims ? '' : 'gr'}`}>{x.claims ? `+${inr(x.claims)}` : '—'}</div>
            </Cell>
            <Cell>
              <div className="v mono ok" style={{ fontWeight: 650 }}>
                {inr(x.net)}
              </div>
            </Cell>
          </FlexRow>
        ))}
        <FlexRow total>
          <Cell>
            <div className="v" style={{ fontWeight: 700 }}>
              Total
            </div>
          </Cell>
          <Cell />
          <Cell>
            <div className="v mono">{totals.list.reduce((a, x) => a + x.lopDays, 0)}</div>
          </Cell>
          <Cell>
            <div className="v mono" style={{ fontWeight: 700 }}>
              {inr(totals.gross)}
            </div>
          </Cell>
          <Cell>
            <div className="v mono">{inr(totals.pf)}</div>
          </Cell>
          <Cell>
            <div className="v mono">{inr(totals.pt)}</div>
          </Cell>
          <Cell>
            <div className="v mono">{inr(totals.esi)}</div>
          </Cell>
          <Cell>
            <div className="v mono">{inr(totals.tds)}</div>
          </Cell>
          <Cell>
            <div className="v mono">{inr(totals.loans)}</div>
          </Cell>
          <Cell>
            <div className="v mono">+{inr(totals.claims)}</div>
          </Cell>
          <Cell>
            <div className="v mono ok" style={{ fontWeight: 700 }}>
              {inr(totals.net)}
            </div>
          </Cell>
        </FlexRow>
      </FlexTable>
      <Note top={10}>
        Every figure comes from the person’s CTC and this month’s attendance. Change either and the
        register moves — there is no separately stored salary to fall out of step.
      </Note>
    </>
  )
}
