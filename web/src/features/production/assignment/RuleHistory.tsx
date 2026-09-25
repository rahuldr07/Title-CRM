import { Rows } from '@/shared/ui/DetailList'
import type { Rule } from '@/data/types'
import { Note } from '@/shared/ui/Layout'

export function RuleHistory({ rules, fired }: { rules: Rule[]; fired: Record<string, number> }) {
  return (
    <>
      <Rows bare>
        {rules.map((r) => (
          <div className="rw" key={r.id}>
            <span className={r.on ? 'ok' : 'gr'}>{r.on ? '✓' : '·'}</span>
            <span>
              <b>{r.n}</b>
              <div className="sd gr">
                {r.on ? 'on' : 'off'} · {r.k} rule{r.lock ? ' · cannot be turned off' : ''}
              </div>
            </span>
            <span className="mono gr">{fired[r.id] ?? 0} checks today</span>
          </div>
        ))}
      </Rows>
      <Note top={12}>
        This is the current state and how often each rule was consulted today.{' '}
        <b>A dated change log needs somewhere to store it</b> — nothing here writes to a database
        yet, so edits live only in this session.
      </Note>
    </>
  )
}
