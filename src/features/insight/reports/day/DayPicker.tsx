import { fmtDate, iso } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { Select } from '@/shared/ui/Controls'

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function DayPicker({
  value,
  days,
  onChange,
}: {
  value: string
  days: readonly { dk: string; date: Date; n: number }[]
  onChange: (dk: string) => void
}) {
  const today = iso(now())

  return (
    <div className="fbar">
      <Select
        label="Choose a day"
        value={value}
        onChange={onChange}
        options={[
          ...days.map(
            (d) => [d.dk, `${d.dk === today ? 'Today' : DAY_LABEL[d.date.getDay()]} · ${fmtDate(d.date)} — ${d.n}`] as const,
          ),
          ['all', `All ${days.length} days — ${days.reduce((a, d) => a + d.n, 0)}`] as const,
        ]}
      />
    </div>
  )
}
