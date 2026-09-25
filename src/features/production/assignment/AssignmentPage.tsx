import { useSearch } from '@tanstack/react-router'
import { Btn } from '@/shared/ui/Button'
import { PageHead } from '@/shared/ui/PageHead'
import { Tabs } from '@/shared/ui/Tabs'
import { useGo } from '@/shared/hooks/useGo'
import { RequireCap } from '@/shared/ui/RequireCap'
import { useUi } from '@/shared/ui/UiProvider'
import { useLevels } from '@/domain/assignment/levels'
import { useRules } from '@/domain/assignment/RulesProvider'
import { LiveTab } from '@/features/production/assignment/tabs/LiveTab'
import { ExceptionsTab } from '@/features/production/assignment/tabs/ExceptionsTab'
import { CapacityTab } from '@/features/production/assignment/tabs/CapacityTab'
import { RulesTab } from '@/features/production/assignment/tabs/RulesTab'
import { LevelsTab } from '@/features/production/assignment/tabs/LevelsTab'
import { openExceptions, useOrderState } from '@/domain/orders/orders'
import { useSession } from '@/domain/auth/SessionProvider'

type AssignTab = 'Live' | 'Exceptions' | 'Capacity' | 'Rules' | 'Levels'

const TABS: AssignTab[] = ['Live', 'Exceptions', 'Capacity', 'Rules', 'Levels']
const isTab = (t?: string): t is AssignTab => !!t && (TABS as string[]).includes(t)

function Assignment() {
  const { tab: tabParam } = useSearch({ from: '/assign' })
  const navigate = useGo()
  const tab: AssignTab = isTab(tabParam) ? tabParam : 'Live'
  const setTab = (t: AssignTab) =>
    navigate({ to: '/assign', search: t === 'Live' ? {} : { tab: t }, replace: true })
  const { toast } = useUi()
  const { me } = useSession()
  const { coverageGaps } = useLevels(me)
  const { board, rules, rerun } = useRules()

  useOrderState()
  const exc = openExceptions()
  const gaps = coverageGaps().length

  return (
    <>
      <PageHead
        title="Assignment"
        sub={`Orders arrive through the day and are placed automatically. ${exc.length} need a person.`}
        actions={
          <Btn
            variant="ghost"
            onClick={() => {
              rerun()
              toast(
                `Re-run — ${board.run.assigns.filter((a) => a.today).length} placed, ${exc.length} exceptions`,
              )
            }}
          >
            Re-run
          </Btn>
        }
      />

      <Tabs
        tabs={[
          'Live',
          ['Exceptions', exc.length || null],
          'Capacity',
          'Rules',
          ['Levels', gaps || null],
        ]}
        value={tab}
        onChange={setTab}
      >
        {tab === 'Live' ? <LiveTab board={board} rules={rules} onTab={setTab} /> : null}
        {tab === 'Exceptions' ? <ExceptionsTab board={board} onTab={setTab} /> : null}
        {tab === 'Capacity' ? <CapacityTab board={board} /> : null}
        {tab === 'Rules' ? <RulesTab board={board} onTab={setTab} /> : null}
        {tab === 'Levels' ? <LevelsTab /> : null}
      </Tabs>
    </>
  )
}

export default function AssignmentRoute() {
  return (
    <RequireCap cap="assign">
      <Assignment />
    </RequireCap>
  )
}
