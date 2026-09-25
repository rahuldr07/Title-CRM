import { useStageName } from '@/domain/company/naming'
import { Row, Rows } from '@/shared/ui/DetailList'
import { useUi } from '@/shared/ui/UiProvider'

export function useBudgetHelp() {
  const { openModal } = useUi()
  const stageName = useStageName()

  return () =>
    openModal({
      title: 'What “inside your budget” means',
      body: (
        <>
          <Rows>
            <Row
              title="The stage budget"
              detail="the share of the client promise this stage is allowed"
              right={<span className="gr">set per product</span>}
            />
            <Row title="Inside budget" detail="you finished the stage within that share" />
            <Row
              title="Compared against"
              detail="other people doing the same stages, not the company average"
            />
          </Rows>
          <p className="gr" style={{ fontSize: 'var(--t-small)', marginTop: 12 }}>
            Stages differ enormously — {stageName('RTS')} finishes inside budget almost every time and {stageName('Search')} barely
            60% of the time. Comparing you against the company average would say more about which
            stage you work on than about you.
          </p>
        </>
      ),
    })
}
