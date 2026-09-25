import type { RefObject } from 'react'
import { Card, Label } from '@/shared/ui/Card'
import { fmtDate } from '@/shared/lib/format'
import { inr } from '@/domain/company/money'
import type { PettyCount, PettyEntry } from '@/data/types'
import { countDrift, expectedAt } from './petty'
import { Note } from '@/shared/ui/Layout'

export function PettyCounts({
  counts,
  entries,
  panelRef,
}: {
  counts: PettyCount[]
  entries: PettyEntry[]
  panelRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <Card padded>
      <div ref={panelRef}>
        <Label>Counts of the box</Label>
        {counts.length ? (
          [...counts]
            .sort((a, b) => b.d.getTime() - a.d.getTime())
            .map((x) => {
              const should = expectedAt(entries, x.d)
              const drift = countDrift(x, entries)
              return (
                <div className="rw" key={x.id} style={{ padding: '9px 0' }}>
                  <span className={drift === 0 ? 'ok' : 'bad'} style={{ fontSize: 'var(--t-lead)' }}>
                    {drift === 0 ? '✓' : '⚑'}
                  </span>
                  <span>
                    <b>
                      {fmtDate(x.d)} — counted {inr(x.counted)}
                    </b>
                    <div className="sd gr">
                      Ledger said {inr(should)} · counted by {x.by}
                    </div>
                    {drift === 0 ? (
                      <div className="sd">{x.note}</div>
                    ) : (
                      <div className="sd bad">
                        {drift > 0 ? 'Over' : 'Short'} by {inr(Math.abs(drift))} — {x.note}
                      </div>
                    )}
                  </span>
                  <span />
                </div>
              )
            })
        ) : (
          <Note size="body" margin="10px 0 0">
            Nobody has counted the box yet, so the ledger figure has never been checked against
            what is actually in it.
          </Note>
        )}
        <Note top={12}>
          Counted by somebody other than the person holding the box. A custodian who checks
          their own float is not a control.
        </Note>
      </div>
    </Card>
  )
}
