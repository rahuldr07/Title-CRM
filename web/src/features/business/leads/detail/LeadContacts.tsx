import { Btn } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import type { LeadContact } from '@/data/types'
import { MailLink } from '@/shared/ui/Anchor'
import { Inline, Note } from '@/shared/ui/Layout'

export function LeadContacts({ contacts, onEdit }: { contacts: LeadContact[]; onEdit: (index: number) => void }) {
  return (
    <Card padded>
      <Label>Contacts</Label>
      {contacts.map((c, i) => (
        <div
          key={`${c.n}-${c.e}-${i}`}
          style={{ padding: '11px 0', borderTop: i ? '1px solid var(--hair)' : undefined }}
        >
          <Inline gap={8}>
            <b style={{ fontSize: 'var(--t-body)' }}>{c.n}</b>
            {c.main ? <Chip kind="b">Main</Chip> : null}
            <Btn
              variant="ghost"
              small
              style={{ marginLeft: 'auto', padding: '4px 9px' }}
              onClick={() => onEdit(i)}
            >
              Edit
            </Btn>
          </Inline>
          <div className="gr" style={{ fontSize: 'var(--t-small)', marginTop: 3 }}>
            {c.role}
          </div>
          {c.e ? (
            <div style={{ fontSize: 'var(--t-small)', marginTop: 4 }}>
              <MailLink address={c.e} />
            </div>
          ) : null}
          {c.p ? (
            <div className="gr mono" style={{ fontSize: 'var(--t-label)', marginTop: 2 }}>
              {c.p}
            </div>
          ) : null}
        </div>
      ))}
      <Btn
        variant="ghost"
        small
        style={{ width: '100%', marginTop: 12 }}
        onClick={() => onEdit(-1)}
      >
        ＋ Add contact
      </Btn>
      <Note size="label" top={10}>
        A firm usually has an orders desk, a manager and someone who signs. Keep them separate.
      </Note>
    </Card>
  )
}
