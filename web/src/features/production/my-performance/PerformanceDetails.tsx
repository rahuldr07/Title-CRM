import { Row, Rows } from '@/shared/ui/DetailList'
import type { QcEntry } from '@/data/quality'
import { fmtDate } from '@/shared/lib/format'
import { Note } from '@/shared/ui/Layout'

export function HabitsDetail({ habits }: { habits: [reason: string, count: number][] }) {
  return (
    <>
      {habits.length ? (
        <Rows>
          {habits.map(([reason, n]) => (
            <Row
              key={reason}
              icon={<span className="bad">⚑</span>}
              title={reason}
              detail="the same thing raised on separate pieces of work"
              right={<span className="mono">{n} times</span>}
            />
          ))}
        </Rows>
      ) : (
        <Note size="body" margin={0}>
          Nothing has come up twice. What was raised was raised once.
        </Note>
      )}
      <Note top={12}>
        {
          'Something raised once is a slip. The same thing raised three times is a habit, and only the second kind is worth changing how you work for.'
        }
      </Note>
    </>
  )
}

export function ChecksDetail({ list }: { list: QcEntry[] }) {
  return (
    <>
      {list.length ? (
        <Rows>
          {list.map((x, i) => (
            <Row
              key={`${x.order}-${i}`}
              icon={<span className={x.crit ? 'bad' : 'ok'}>{x.crit ? '⚑' : '✓'}</span>}
              title={`${x.order}${x.crit ? ` · ${x.crit}` : ''}`}
              detail={`${fmtDate(x.d)} · checked by ${x.byName}${x.note ? ` — ${x.note}` : ''}`}
              right={<span className="mono">{x.avg.toFixed(2)}</span>}
            />
          ))}
        </Rows>
      ) : (
        <Note size="body" margin={0}>
          No checks in this range.
        </Note>
      )}
      <Note top={12}>
        {
          'A check with nothing raised still counts. A run of clean work is the thing that makes one bad score readable as an exception.'
        }
      </Note>
    </>
  )
}
