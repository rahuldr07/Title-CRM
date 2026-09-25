import { useStageName } from '@/domain/company/naming'
import { Card } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { DetailRow } from '@/shared/ui/DetailList'
import { settlement } from '@/domain/payroll/settlement'
import { inr } from '@/domain/company/money'
import { fmtDate, fmtUsDate, initials } from '@/shared/lib/format'
import type { Person } from '@/data/types'
import { Inline, Note } from '@/shared/ui/Layout'
import { Press } from '@/shared/ui/Button'

export function Leaver({ p, onOpen }: { p: Person; onOpen: () => void }) {
  const stageName = useStageName()
  const f = settlement(p, p.leaving)
  return (
    <Card padded bottom={14}>
      <div className="ch" style={{ border: 'none', padding: '0 0 12px' }}>
        <Inline gap={12}>
          <Press
            className="ava"
            style={{ width: 34, height: 34, fontSize: 'var(--t-body)' }}
            onClick={onOpen}
          >
            {initials(p.n)}
          </Press>
          <div>
            <b style={{ fontSize: 'var(--t-lead)' }}>{p.n}</b>
            <div className="gr" style={{ fontSize: 'var(--t-small)' }}>
              {p.dep.map(stageName).join(', ')} · joined {p.doj ? fmtUsDate(p.doj) : '—'} · last day{' '}
              {p.leaving ? fmtDate(p.leaving) : '—'}
            </div>
          </div>
        </Inline>
        <div className="r">
          <Chip kind="r">Full and final</Chip>
        </div>
      </div>
      {f.lines.map(([label, v]) => (
        <DetailRow
          key={label}
          label={label}
          value={
            <b className={`mono ${v < 0 ? 'warn' : ''}`}>
              {v < 0 ? '−' : ''}
              {inr(Math.abs(v))}
            </b>
          }
        />
      ))}
      <Inline align={false} justify="space-between" style={{ padding: '11px 0 0', fontSize: 'var(--t-lead)' }}>
        <b>Payable</b>
        <b className="mono ok">{inr(f.total)}</b>
      </Inline>
      {f.yrs === null ? (
        <div className="bnr d" style={{ marginTop: 12 }}>
          <span className="bi">⚑</span>
          <div>
            <b>No joining date, so gratuity cannot be worked out.</b> It is not zero — it is unknown,
            which is worse.
          </div>
        </div>
      ) : f.yrs < 5 ? (
        <Note top={10}>
          {f.yrs.toFixed(1)} years served. Gratuity becomes payable at five, so none is due — this is the
          rule, not a rounding.
        </Note>
      ) : (
        <Note top={10}>
          {Math.floor(f.yrs)} completed years at fifteen days of last-drawn basic, which is what the Act
          provides.
        </Note>
      )}
    </Card>
  )
}
