import { useStageName } from '@/domain/company/naming'
import { Bar, BarGrid } from '@/shared/ui/Bar'
import { Card, Label } from '@/shared/ui/Card'
import type { DayLoad } from '@/domain/orders/dayLoad'
import { Note } from '@/shared/ui/Layout'

export function WhereYouFitCard({
  deps,
  deptTotals,
  stages,
}: {
  deps: string[]
  deptTotals: Record<string, { tot: number }>
  stages: DayLoad['stages']
}) {
  const stageName = useStageName()
  return (
    <Card padded>
      <Label>Where you fit</Label>
      {deps.length ? (
        deps.map((d) => {
          const dept = deptTotals[d] ?? { tot: 0 }
          const st = stages[d] ?? { done: 0, pend: 0 }
          return (
            <BarGrid key={d} cols="130px 1fr 110px" gap={12} padding="7px 0">
              <span>
                <b>{stageName(d)}</b>
              </span>
              <Bar value={st.done + st.pend} max={Math.max(1, dept.tot)} color="var(--brand2)" />
              <span className="mono gr" style={{ textAlign: 'right' }}>
                {st.done + st.pend} of {dept.tot}
              </span>
            </BarGrid>
          )
        })
      ) : (
        <Note margin={0}>
          You are not in a department, so nothing can be assigned to you.
        </Note>
      )}
      <Note top={12}>
        Your share of what your department handled today.
      </Note>
    </Card>
  )
}
