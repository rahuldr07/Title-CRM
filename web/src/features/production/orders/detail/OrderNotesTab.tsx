import { Avatar } from '@/shared/ui/Avatar'
import { Btn } from '@/shared/ui/Button'
import { Textarea } from '@/shared/ui/Controls'
import { Card, CardHead } from '@/shared/ui/Card'
import { Rows } from '@/shared/ui/DetailList'
import { fmtDT, TZ } from '@/shared/lib/format'
import type { OrderNote } from './orderDetail'
import { Note } from '@/shared/ui/Layout'

interface Props {
  note: string
  notes: readonly OrderNote[]
  onNote: (text: string) => void
  onPost: () => void
  locked: string | null
}

export function OrderNotesTab({ note, notes, onNote, onPost, locked }: Props) {
  return (
    <Card>
      <CardHead title="Internal notes" />
      <div className="cb">
        <Textarea
          label="Add a note"
          rows={3}
          placeholder="Add a note — visible to your team only"
          value={note}
          disabled={!!locked}
          onChange={(e) => onNote(e.target.value)}
        />
        {locked ? <Note top={8}>{locked}</Note> : null}
        <div style={{ marginTop: 10 }}>
          <Btn small disabled={!!locked} onClick={onPost}>
            Add note
          </Btn>
        </div>
      </div>
      <Rows bare>
        {!notes.length ? (
          <div className="rw">
            <span className="gr">·</span>
            <span className="gr">No notes on this order yet.</span>
          </div>
        ) : null}
        {notes.map((n) => (
          <div className="rw" key={n.id}>
            <span>
              <Avatar name={n.by} />
            </span>
            <span>
              <b>{n.by}</b>
              <div className={`sd${n.defect ? ' bad' : ''}`}>{n.text}</div>
            </span>
            <span className="gr mono" style={{ fontSize: 'var(--t-label)' }}>
              {fmtDT(n.at)} {TZ}
            </span>
          </div>
        ))}
      </Rows>
    </Card>
  )
}
