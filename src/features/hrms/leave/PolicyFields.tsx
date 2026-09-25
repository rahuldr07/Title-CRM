import { DetailRow } from '@/shared/ui/DetailList'
import { Field } from '@/shared/ui/Form'
import { Input } from '@/shared/ui/Controls'
import { Inline } from '@/shared/ui/Layout'

export function NumberField({
  id,
  label,
  value,
  suffix,
  hint,
  step,
  onChange,
}: {
  id: string
  label: string
  value: number
  suffix?: string
  hint: string
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <Field label={label} id={id} hint={hint}>
      <Inline gap={8}>
        <Input
          field
          mono
          type="number"
          min={0}
          step={step}
          value={value}
          style={{ width: 100 }}
          onChange={(e) => {
            const n = parseFloat(e.target.value)
            if (n >= 0) onChange(n)
          }}
        />
        {suffix ? (
          <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
            {suffix}
          </span>
        ) : null}
      </Inline>
    </Field>
  )
}
export function Outcome({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return <DetailRow label={label} value={<b className={`mono ${warn ? 'warn' : ''}`}>{value}</b>} />
}
