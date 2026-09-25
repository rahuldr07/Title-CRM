import { useStageName } from '@/domain/company/naming'
import type { ReactNode } from 'react'
import { Row, Rows } from '@/shared/ui/DetailList'
import { fmtDate, fmtHour } from '@/shared/lib/format'
import type { DayLoad } from '@/domain/orders/dayLoad'
import type { StageWork } from '@/domain/quality/quality'
import type { QcEntry } from '@/data/quality'
import type { CheckKind } from './personDetail'
import { Note } from '@/shared/ui/Layout'

function ModalNote({ children }: { children: ReactNode }) {
  return (
    <Note top={12}>
      {children}
    </Note>
  )
}

export function StagesModal({ items, cap }: { items: DayLoad['items']; cap: number }) {
  const stageName = useStageName()
  return (
    <>
      {items.length ? (
        <Rows>
          {items.map((x, i) => (
            <Row
              key={`${x.o.id}-${x.stage}-${i}`}
              icon={<span className={x.fin ? 'ok' : 'gr'}>{x.fin ? '✓' : '·'}</span>}
              title={`${x.o.id} · ${stageName(x.stage)}`}
              detail={`${x.o.cl} · ${x.o.pr} · placed at ${fmtHour(x.hr)}`}
              right={<span className={x.fin ? 'ok' : 'gr'}>{x.fin ? 'done' : 'open'}</span>}
            />
          ))}
        </Rows>
      ) : (
        <Note size="body" margin={0}>
          Nothing has been placed with them today.
        </Note>
      )}
      <ModalNote>
        Their target is <b>{cap} a day</b>, set on their record rather than by the
        department. The assignment run stops offering them work once they reach it.
      </ModalNote>
    </>
  )
}

export function LateModal({ over }: { over: StageWork['items'] }) {
  const stageName = useStageName()
  return (
    <>
      {over.length ? (
        <Rows>
          {over.map((x, i) => (
            <Row
              key={`${x.d.id}-${x.st}-${i}`}
              icon={<span className="bad">⚑</span>}
              title={`${x.d.id} · ${stageName(x.st)}`}
              detail={`${x.d.cl} · ${x.d.pr} · took ${x.h.toFixed(1)}h against a ${x.budget.toFixed(1)}h budget`}
              right={<span className="mono bad">{x.ratio.toFixed(2)}×</span>}
            />
          ))}
        </Rows>
      ) : (
        <Note size="body" margin={0}>
          None. Where an order ran late, their stage was inside its budget.
        </Note>
      )}
      <ModalNote>
        Only counted when <b>their own stage</b> was the one that overran. An order can be late
        for reasons upstream of the person holding it, and blaming them for that is how a
        metric stops being trusted.
      </ModalNote>
    </>
  )
}

export function ChecksModal({ kind, set, rangeLabel }: { kind: CheckKind; set: QcEntry[]; rangeLabel: string }) {
  const stageName = useStageName()
  return (
    <>
      {set.length ? (
        <Rows>
          {set.map((x, i) => (
            <Row
              key={`${x.order}-${x.stage}-${i}`}
              icon={
                <span className={x.defect ? 'bad' : x.crit ? 'gr' : 'ok'}>
                  {x.defect ? '⚑' : x.crit ? '·' : '✓'}
                </span>
              }
              title={`${x.order} · ${stageName(x.stage)}`}
              detail={`${fmtDate(x.d)} · ${
                kind === 'gave' ? `on ${x.onName}` : `checked by ${x.byName}`
              }${x.note ? ` — ${x.note}` : ''}`}
              right={<span className="mono">{x.avg.toFixed(2)}</span>}
            />
          ))}
        </Rows>
      ) : (
        <Note size="body" margin={0}>
          Nothing in {rangeLabel}.
        </Note>
      )}
      <ModalNote>
        {kind === 'gave'
          ? 'What someone raises on others is as much a part of their record as what is raised on them — a checker who never finds anything is not necessarily a good checker.'
          : 'About a third of finished work is never rated, so these counts are a sample rather than a census. Read the reasons before the average.'}
      </ModalNote>
    </>
  )
}
