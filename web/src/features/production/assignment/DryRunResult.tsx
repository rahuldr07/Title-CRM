import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { Note } from '@/shared/ui/Layout'

export function DryRunResult({
  r,
  live,
  liveExc,
  today,
}: {
  r: { placed: number; unplaced: number }
  live: number
  liveExc: number
  today: number
}) {
  return (
    <>
      <Kpis style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Kpi
          title="Would place"
          value={r.placed}
          detail={
            <span className={r.placed === live ? 'gr' : r.placed > live ? 'ok' : 'warn'}>
              {r.placed === live
                ? 'the same as now'
                : `${r.placed > live ? '+' : ''}${r.placed - live} against now`}
            </span>
          }
        />
        <Kpi
          title="Would leave unplaced"
          value={r.unplaced}
          tone={r.unplaced ? 'warn' : undefined}
          detail={
            <span className="gr">
              {r.unplaced === liveExc ? 'unchanged' : 'different from now'}
            </span>
          }
        />
      </Kpis>
      <Note top={12}>
        Run against today’s {today} orders with the rules exactly as they stand. No
        queue was touched — this is what <i>would</i> happen.
      </Note>
    </>
  )
}
