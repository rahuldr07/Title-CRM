import { useStageName } from '@/domain/company/naming'
import { Row, Rows } from '@/shared/ui/DetailList'
import type { DayLoad } from '@/domain/orders/dayLoad'
import type { OrderPlan } from '@/domain/assignment/sla'
import type { Person } from '@/data/types'
import { fmtHour } from '@/shared/lib/format'
import { Note } from '@/shared/ui/Layout'

type WorkItem = DayLoad['items'][number]

export function FinishedTodayDetail({ finished, pct }: { finished: WorkItem[]; pct: number }) {
  const stageName = useStageName()
  return (
    <>
      {finished.length ? (
        <Rows>
          {finished.map((x, i) => (
            <Row
              key={`${x.o.id}-${x.stage}-${i}`}
              icon={<span className="ok">✓</span>}
              title={`${x.o.id} · ${stageName(x.stage)}`}
              detail={`${x.o.cl} · ${x.o.pr}`}
              right={<span className="mono gr">from {fmtHour(x.hr)}</span>}
            />
          ))}
        </Rows>
      ) : (
        <Note size="body" margin={0}>
          Nothing finished yet today.
        </Note>
      )}
      <Note top={12}>
        {`${pct}% of what was placed with you. The rest is still on your desk rather than lost.`}
      </Note>
    </>
  )
}

export function PastCheckpointDetail({ risky }: { risky: { i: WorkItem; p: OrderPlan }[] }) {
  const stageName = useStageName()
  return (
    <>
      {risky.length ? (
        <Rows>
          {risky.map((x, i) => (
            <Row
              key={`${x.i.o.id}-${x.i.stage}-${i}`}
              icon={<span className={x.p.doomed ? 'bad' : 'gr'}>{x.p.doomed ? '⚑' : '◷'}</span>}
              title={x.i.o.id}
              detail={`${x.i.o.cl} · ${x.i.o.pr} · ${stageName(x.i.stage)}${
                x.p.short > 0 ? ` · short ${x.p.short}h` : ''
              }`}
              right={
                <span className={x.p.doomed ? 'bad' : 'gr'}>
                  {x.p.doomed ? 'cannot land' : 'still recoverable'}
                </span>
              }
            />
          ))}
        </Rows>
      ) : (
        <Note size="body" margin={0}>
          Nothing on your desk is past a checkpoint.
        </Note>
      )}
      <Note top={12}>
        These are <b>internal</b> checkpoints, not the client promise. Being past one is a warning
        while there is still time to act — which is the whole point of having them.
      </Note>
    </>
  )
}

export function DaySizingDetail({ me, day }: { me: Person; day: DayLoad }) {
  const stageName = useStageName()
  return (
    <>
      <Rows>
        <Row
          title="Your target"
          detail={`set on your record — ${me.dep.map(stageName).join(', ') || 'no department'}`}
          right={<span className="mono">{day.cap} stages</span>}
        />
        <Row
          title="Carried in"
          detail="still open from earlier days, and counted against today"
          right={<span className="mono">{day.carried}</span>}
        />
        <Row
          title="Given to you today"
          detail={`${day.done} done, ${day.onDesk} on your desk — by the run or by hand`}
          right={<span className="mono">{day.given}</span>}
        />
        <Row
          title="Room left"
          detail="what the run will still place with you"
          right={<span className={`mono ${day.room ? 'ok' : 'bad'}`}>{day.room}</span>}
        />
      </Rows>
      <Note top={12}>
        {
          'The target is a limit the assignment run respects, not a quota you are measured against. When everyone is full, work waits as an exception rather than being pushed onto someone who cannot take it.'
        }
      </Note>
    </>
  )
}
