import { Btn } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Rows } from '@/shared/ui/DetailList'
import { UPDKIND } from '@/data/production'
import { fmtDate } from '@/shared/lib/format'
import type { Update } from '@/data/types'
import { Note } from '@/shared/ui/Layout'

export function YourUpdatesCard({ updates, onAdd }: { updates: Update[]; onAdd: () => void }) {
  return (
    <Card padded top={18}>
      <div className="ch" style={{ border: 'none', padding: '0 0 10px' }}>
        <Label>What you wrote</Label>
        <div className="r">
          <Btn small onClick={onAdd}>
            ＋ Add an update
          </Btn>
        </div>
      </div>
      {updates.length ? (
        <Rows bare>
          {updates.map((u) => (
            <div className="rw tagged" key={u.id}>
              <span>
                <Chip kind={UPDKIND[u.kind] ?? 'n'}>{u.kind}</Chip>
              </span>
              <span>
                <div className="sd">{u.b}</div>
                <div className="sd gr">{fmtDate(u.d)}</div>
              </span>
              <span />
            </div>
          ))}
        </Rows>
      ) : (
        <Note size="body" margin={0}>
          Nothing yet. A handover note written today is the thing that saves someone an hour
          tomorrow.
        </Note>
      )}
      <Note top={12}>
        Updates cannot be edited once posted. That is what makes them worth reading back.
      </Note>
    </Card>
  )
}
