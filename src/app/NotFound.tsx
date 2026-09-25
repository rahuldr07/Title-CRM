import { useGo } from '@/shared/hooks/useGo'
import { Btn } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Empty } from '@/shared/ui/Banner'
import { PageHead } from '@/shared/ui/PageHead'
import { useSession } from '@/domain/auth/SessionProvider'

export function NotFound() {
  const navigate = useGo()
  const { can } = useSession()
  const home = can('all') ? 'dash' : 'mywork'
  const homeLabel = can('all') ? 'dashboard' : 'my work'

  return (
    <>
      <Btn variant="ghost" small style={{ marginBottom: 14 }} onClick={() => navigate({ to: `/${home}` })}>
        ← Back to {homeLabel}
      </Btn>
      <PageHead
        title="That page is not here"
        sub="It may have been removed, or the link may be out of date."
      />
      <Card>
        <Empty
          icon="·"
          action={
            <Btn small onClick={() => navigate({ to: `/${home}` })}>
              Back to {homeLabel}
            </Btn>
          }
        >
          Nothing to show. If you reached this from a link, what it pointed at no longer exists.
        </Empty>
      </Card>
    </>
  )
}
