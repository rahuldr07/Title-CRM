import { useStageName } from '@/domain/company/naming'
import { Btn } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Rows } from '@/shared/ui/DetailList'
import { SectionHead } from '@/shared/ui/PageHead'
import type { DayLoad } from '@/domain/orders/dayLoad'
import { fmtHour } from '@/shared/lib/format'
import { useCappedList } from '@/shared/hooks/useCappedList'

export function FinishedToday({ finished, done }: { finished: DayLoad['items']; done: number }) {
  const stageName = useStageName()
  const list = useCappedList(finished, { cap: 8, keyOf: (i) => `${i.o.id}-${i.stage}` })
  return (
    <>
      <SectionHead id="mwDone">Finished today — {done}</SectionHead>
      <Card>
        <Rows bare>
          {list.shown.map((i, idx) => (
            <div className="rw" key={`${i.o.id}-${i.stage}-${idx}`}>
              <span className="ok">✓</span>
              <span>
                <b className="mono" style={{ fontSize: 'var(--t-small)' }}>
                  {i.o.id}
                </b>{' '}
                <span className="gr">{stageName(i.stage)}</span>
                <div className="sd gr">
                  {i.o.cl} · {i.o.pr}
                </div>
              </span>
              <span className="gr mono" style={{ fontSize: 'var(--t-label)' }}>
                {fmtHour(i.hr)}
              </span>
            </div>
          ))}
          {list.hidden ? (
            <div className="rw">
              <span className="gr">·</span>
              <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
                and {list.hidden} more
              </span>
              <span>
                <Btn variant="ghost" small onClick={list.showAll}>
                  Show all
                </Btn>
              </span>
            </div>
          ) : null}
        </Rows>
      </Card>
    </>
  )
}
