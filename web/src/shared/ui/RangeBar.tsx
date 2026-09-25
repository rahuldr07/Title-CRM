import { QC_DAYS } from '@/data/quality'
import { fmtDate, iso } from '@/shared/lib/format'
import {
  RANGE_PRESETS,
  rangeFloor,
  resolveRange,
  setPreset,
  setRangeEnd,
  type RangeState,
} from '@/shared/lib/range'
import { now } from '@/shared/lib/clock'
import { Pill } from './Button'
import { Input } from './Controls'
import { Field } from './Form'

export function RangeBar({
  id,
  value,
  onChange,
  note,
  showCustom = true,
}: {
  id: string
  value: RangeState
  onChange: (next: RangeState) => void
  note?: string
  showCustom?: boolean
}) {
  const r = resolveRange(value)
  const lo = iso(rangeFloor())
  const hi = iso(now())

  return (
    <>
      <div className="fbar" role="group" aria-label="Date range">
        {RANGE_PRESETS.map(([key, label]) => (
          <Pill key={key} on={r.preset === key} onClick={() => onChange(setPreset(value, key))}>
            {label}
          </Pill>
        ))}
        {showCustom ? (
          <>
            <Pill on={r.preset === 'custom'} onClick={() => onChange(setPreset(value, 'custom'))}>
              Custom
            </Pill>
            <div className="sp" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Field layout="bare" label="From" id={`${id}f`} className="gr" style={{ fontSize: 'var(--t-label)' }}>
                <Input
                  field
                  mono
                  type="date"
                  style={{ width: 150 }}
                  value={iso(r.from)}
                  min={lo}
                  max={hi}
                  onChange={(e) => onChange(setRangeEnd(value, 'from', e.target.value))}
                />
              </Field>
              <Field layout="bare" label="to" id={`${id}t`} className="gr" style={{ fontSize: 'var(--t-label)' }}>
                <Input
                  field
                  mono
                  type="date"
                  style={{ width: 150 }}
                  value={iso(r.to)}
                  min={lo}
                  max={hi}
                  onChange={(e) => onChange(setRangeEnd(value, 'to', e.target.value))}
                />
              </Field>
            </div>
          </>
        ) : null}
      </div>
      <p className="cnt">
        <span>ⓘ</span> Showing <b>{fmtDate(r.from)}</b> to <b>{fmtDate(r.to)}</b> —{' '}
        {note ?? 'every figure below follows this range'}. History goes back {QC_DAYS} days.
      </p>
    </>
  )
}
