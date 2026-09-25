import { useStageName } from '@/domain/company/naming'
import { Chip } from '@/shared/ui/Chip'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { hh } from '@/domain/assignment/sla'
import type { DeliveryLine } from './deliveryStats'
import { fmtDate } from '@/shared/lib/format'

const DEL_COLS = '40px 105px 150px 130px 110px 105px 110px 1fr'
const DEL_HEAD = ['#', 'Delivered', 'Order', 'Client', 'Promise', 'Took', 'Outcome', 'Where the time went']

export function DeliveryRows({ lines }: { lines: DeliveryLine[] }) {
  const stageName = useStageName()
  return (
    <FlexTable cols={DEL_COLS} min={940} head={DEL_HEAD}>
      {lines.map(({ x, over }, xi) => {
        const [top] = over
        return (
          <FlexRow cols={DEL_COLS} key={x.id}>
            <Cell v={xi + 1} mono tone="gr" />
            <Cell v={fmtDate(x.d)} mono />
            <Cell v={x.id} mono s={x.pr} />
            <Cell v={x.cl} />
            <Cell v={`${x.slaH}h`} mono />
            <Cell v={hh(x.hrs)} mono tone={x.late ? 'bad' : 'ok'} />
            <Cell>
              {x.late ? (
                <Chip kind="d">+{hh(x.hrs - x.slaH)}</Chip>
              ) : (
                <Chip kind="v">{hh(x.slaH - x.hrs)} spare</Chip>
              )}
            </Cell>
            <Cell>
              {top ? (
                <div className="v" style={{ fontSize: 'var(--t-small)' }}>
                  <b>{stageName(top.st)}</b> {hh(top.h)} against {hh(top.c)}
                  {over.length > 1 ? <span className="gr"> +{over.length - 1} more over</span> : null}
                </div>
              ) : (
                <div className="v gr" style={{ fontSize: 'var(--t-small)' }}>
                  every department inside its budget
                </div>
              )}
            </Cell>
          </FlexRow>
        )
      })}
    </FlexTable>
  )
}
