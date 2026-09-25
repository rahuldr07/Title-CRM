import { useStageName } from '@/domain/company/naming'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { FormActions } from '@/shared/ui/Form'
import { removeStaff, useStaff, findPerson } from '@/domain/people/roster'
import { useSession } from '@/domain/auth/SessionProvider'

export function StaffDelete({
  id,
  onCancel,
  onDone,
}: {
  id: string
  onCancel: () => void
  onDone: (message: string) => void
}) {
  const staff = useStaff()
  const { me } = useSession()
  const stageName = useStageName()
  const s = findPerson(staff, id)
  if (!s) return null

  return (
    <>
      <p style={{ fontSize: 'var(--t-body)' }}>
        <b>{s.n}</b> works {s.dep.map(stageName).join(', ') || 'no department'}
        {s.cap ? ` with a target of ${s.cap} a day` : ''}.
      </p>
      <Banner kind="r" icon="⚑" style={{ marginTop: 14 }}>
        <span style={{ fontSize: 'var(--t-small)' }}>
          Disabling them keeps their payslips, attendance and the work they did. Removing takes the
          record away, and the day re-runs without them.
        </span>
      </Banner>
      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn
          variant="danger"
          onClick={() => {
            onDone(removeStaff(me, id) ?? `${s.n} removed`)
          }}
        >
          Remove {s.n}
        </Btn>
      </FormActions>
    </>
  )
}
