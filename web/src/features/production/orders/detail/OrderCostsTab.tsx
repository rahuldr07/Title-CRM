import { Btn } from '@/shared/ui/Button'
import { Card, CardHead } from '@/shared/ui/Card'
import { Empty } from '@/shared/ui/Banner'
import { fmtDate, money, r2 } from '@/shared/lib/format'
import type { OrderCost } from './orderDetail'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { Inline } from '@/shared/ui/Layout'

const COSTCOLS = '110px 1fr 150px 110px'

interface Props {
  costs: readonly OrderCost[]
  fee: number
  costTotal: number
  onAdd: () => void
}

export function OrderCostsTab({ costs, fee, costTotal, onAdd }: Props) {
  return (
    <Card>
      <CardHead
        title="Pass-through costs"
        actions={
          <Btn small onClick={onAdd}>
            ＋ Add cost
          </Btn>
        }
      />
      <FlexTable cols={COSTCOLS} min={520} head={['Date', 'Type', 'Paid by', 'Amount']} wrap="none">
        {costs.length ? (
          costs.map((c) => (
            <FlexRow key={c.id}>
              <Cell>
                <div className="v mono">{fmtDate(c.at)}</div>
              </Cell>
              <Cell>
                <div className="v">{c.what}</div>
              </Cell>
              <Cell>
                <div className="v">{c.by}</div>
              </Cell>
              <Cell>
                <div className="v mono">{money(c.amt)}</div>
              </Cell>
            </FlexRow>
          ))
        ) : (
          <Empty icon="$">Nothing has been paid out on this order yet.</Empty>
        )}
      </FlexTable>
      <Inline className="cb" wrap gap={12} align={false} style={{ borderTop: '1px solid var(--hair)' }}>
        <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
          Search fee {money(fee)} + costs {money(costTotal)} =
        </span>
        <b className="mono">{money(r2(fee + costTotal))}</b>
        <span className="gr" style={{ fontSize: 'var(--t-small)', marginLeft: 'auto' }}>
          Costs are reimbursed at cost — no margin applied.
        </span>
      </Inline>
    </Card>
  )
}
