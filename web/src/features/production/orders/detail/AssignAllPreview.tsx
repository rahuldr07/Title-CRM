import { useStageName } from '@/domain/company/naming'
import { Rows } from '@/shared/ui/DetailList'
import { whoName } from '@/domain/people/roster'
import type { AssignAllPlan } from './orderDetail'
import { Note } from '@/shared/ui/Layout'

export function AssignAllPreview({ orderId, plan }: { orderId: string; plan: AssignAllPlan }) {
  const { open, preview, load, applied } = plan
  const stageName = useStageName()
  return (
    <>
      <Note plain size="body">
        {open.length} stage{open.length === 1 ? '' : 's'} on <b className="mono">{orderId}</b>{' '}
        {open.length === 1 ? 'has' : 'have'} nobody on {open.length === 1 ? 'it' : 'them'}.
      </Note>
      <Rows bare>
        {preview.map(({ stage, person }) => (
          <div className="rw" key={stage}>
            <span className="gr">·</span>
            <span>
              <b>{stageName(stage)}</b>
              <div className="sd">
                {person ? (
                  <>
                    {`${person.n} — emptiest of the eligible at ${load[person.id] ?? 0}/${person.cap}`}
                    {(load[person.id] ?? 0) >= person.cap ? <span className="warn"> · takes them over their target</span> : null}
                  </>
                ) : (
                  <span className="bad">nobody eligible</span>
                )}
              </div>
            </span>
            <span />
          </div>
        ))}
      </Rows>
      <Note top={12}>
        These names come from the rules the automatic pass runs, as those rules stand right now:{' '}
        {applied.join(' · ')}. One switched off under Assignment → Rules is off here too. The
        daily target is the one this screen does not hold you to — the load beside each name is
        today’s automatic deal, and assigning by hand is how you go past it.
      </Note>
    </>
  )
}

export function SelfReviewNote({ who, paired, stage }: { who: string; paired: string; stage: string }) {
  const stageName = useStageName()
  return (
    <Note plain size="body">
      <b>{whoName(who)}</b> did the {stageName(paired)} on this order, and nobody checks their own work.
      Pick someone else from {stageName(stage)}.
    </Note>
  )
}
