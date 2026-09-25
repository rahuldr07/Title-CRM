import { Btn } from '@/shared/ui/Button'
import type { Lead } from '@/data/types'

export function LeadBanner({
  lead,
  age,
  stale,
  onCopy,
  onClients,
  onToggleFlag,
}: {
  lead: Lead
  age: number
  stale: boolean
  onCopy: () => void
  onClients: () => void
  onToggleFlag: () => void
}) {
  return lead.st === 'won' ? (
    <div className="bnr v">
      <span className="bi">✓</span>
      <div>
        <div className="bt">Won</div>
        Create the client record separately when you are ready — this lead stays here as the history
        of how it was won.
      </div>
      <div className="ba">
        <Btn variant="ghost" small onClick={onCopy}>
          Copy details
        </Btn>
        <Btn small onClick={onClients}>
          Go to clients
        </Btn>
      </div>
    </div>
  ) : lead.st === 'lost' ? (
    <div className="bnr d">
      <span className="bi">✕</span>
      <div>
        <div className="bt">Lost</div>
        Kept so the reason is on record. Reopen by changing the status.
      </div>
    </div>
  ) : lead.flag || stale ? (
    <div className="bnr r">
      <span className="bi">◷</span>
      <div>
        <div className="bt">{lead.flag ? 'Flagged for follow-up' : 'This lead has gone quiet'}</div>
        {lead.flag
          ? `Someone marked this one to come back to.${stale ? ` It has also had no contact for ${age} days.` : ''}`
          : `No contact for ${age} days. Nothing is scheduled — it turned amber on its own.`}
        <div className="bs">
          Adding a note below clears the quiet flag, because the clock runs from the last thing you
          recorded.
        </div>
      </div>
      {lead.flag ? (
        <div className="ba">
          <Btn variant="ghost" small onClick={onToggleFlag}>
            Clear flag
          </Btn>
        </div>
      ) : null}
    </div>
  ) : null
}
