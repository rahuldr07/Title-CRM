import { BarRow } from '@/shared/ui/Bar'
import { Card, Label } from '@/shared/ui/Card'
import { listOf } from '@/shared/lib/format'
import { Note } from '@/shared/ui/Layout'

interface Axis {
  name: string
  n: number
  avg: number | null
}

export function CriteriaCard({
  axes,
  strongest,
  raised,
  checked,
}: {
  axes: Axis[]
  strongest: Axis[]
  raised: number
  checked: number
}) {
  return (
    <Card padded>
      <Label>What you’re doing well, and where marks come off</Label>
      <Note plain size="label" margin="0 0 6px">
        Your average score for each, out of 5 · how many times marks came off for it.
      </Note>
      {axes.map((a) => (
        <BarRow
          key={a.name}
          cols="118px 1fr 100px"
          gap={11}
          padding="7px 0"
          label={a.name}
          value={a.n}
          max={raised}
          color={a.n ? 'var(--warn)' : 'var(--ok)'}
          right={
            <>
              {a.avg === null ? <span className="gr">—</span> : a.avg.toFixed(2)}
              {a.n ? <span className="gr"> · {a.n}</span> : null}
            </>
          }
        />
      ))}
      {strongest.length ? (
        <div
          className="rw"
          style={{
            background: 'var(--oksoft)',
            border: '1px solid color-mix(in srgb, var(--ok) 28%, transparent)',
            borderRadius: 9,
            padding: '11px 13px',
            marginTop: 12,
          }}
        >
          <span className="ok" style={{ fontSize: 'var(--t-lead)' }}>
            ✓
          </span>
          <span>
            <b>Doing well: {listOf(strongest.map((c) => c.name))}</b>
            <div className="sd">Nothing raised across {checked} checks.</div>
          </span>
          <span />
        </div>
      ) : null}
    </Card>
  )
}
