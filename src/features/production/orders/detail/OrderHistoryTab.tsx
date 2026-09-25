import { Card, CardHead } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Rows } from '@/shared/ui/DetailList'
import { fmtDT, TZ } from '@/shared/lib/format'
import type { HistoryRow } from './orderDetail'
import { Note } from '@/shared/ui/Layout'

export function OrderHistoryTab({ rows }: { rows: readonly HistoryRow[] }) {
  return (
    <>
      <Card>
        <CardHead title="Activity log" actions={<Chip kind="v">Append-only</Chip>} />
        <Rows bare>
          {rows.map(([at, what, by, detail], i) => (
            <div className="rw" key={i}>
              <span className="gr">·</span>
              <span>
                <b>{what}</b>
                <div className="sd">{detail}</div>
              </span>
              <span style={{ textAlign: 'right' }}>
                <div className="mono gr" style={{ fontSize: 'var(--t-label)' }}>
                  {fmtDT(at)} {TZ}
                </div>
                <div className="sd">{by}</div>
              </span>
            </div>
          ))}
        </Rows>
      </Card>
      <Note top={12}>
        Every status change, assignment, field edit, cost, note and QC rating is recorded with
        who and when. Until the server accepts writes, entries made here last for this session.
      </Note>
    </>
  )
}
