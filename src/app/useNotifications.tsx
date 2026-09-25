import { useGo } from '@/shared/hooks/useGo'
import { useUi } from '@/shared/ui/UiProvider'
import { useCoverage } from '@/domain/counties/counties'
import { useDepartments } from '@/domain/company/departments'
import { useStaff } from '@/domain/people/roster'
import { alerts } from '@/domain/alerts/alerts'
import { useOrders } from '@/domain/orders/orders'
import { Empty } from '@/shared/ui/Banner'
import { Row, Rows } from '@/shared/ui/DetailList'
import { Note } from '@/shared/ui/Layout'

export function useNotifications() {
  const { openModal, closeModal } = useUi()
  const navigate = useGo()
  const { check } = useCoverage()
  useStaff()
  useDepartments()
  useOrders()
  const list = alerts()

  const open = () =>
    openModal({
      title: 'Notifications',
      body: list.length ? (
        <>
          <Rows>
            {list.map((a) => (
              <Row
                key={a.k}
                icon={
                  <span className={a.sev === 'bad' ? 'bad' : 'warn'} style={{ fontSize: 'var(--t-lead)' }}>
                    {a.sev === 'bad' ? '⚑' : '◷'}
                  </span>
                }
                title={a.t}
                detail={a.d}
                right={<span className="gr">→</span>}
                onClick={() => {
                  closeModal()
                  navigate({ to: `/${a.go}` })
                }}
              />
            ))}
          </Rows>
          <Note size="label" top={12}>
            Going to {check.notify === 'admins' ? 'company admins' : check.notify}. Change who under
            Link monitor.
          </Note>
        </>
      ) : (
        <div className="empty" style={{ padding: '26px 10px' }}>
          <Empty icon="✓">Nothing needs your attention.</Empty>
        </div>
      ),
    })

  return { list, open }
}
