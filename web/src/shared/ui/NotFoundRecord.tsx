import { useGo } from '@/shared/hooks/useGo'
import { Empty } from './Banner'
import { Btn } from './Button'
import { Card } from './Card'
import { PageHead } from './PageHead'

export function NotFoundRecord({
  what,
  backTo,
  backLabel,
  search,
}: {
  what: string
  backTo: string
  backLabel: string
  search?: Record<string, string>
}) {
  const navigate = useGo()
  const back = search ? { to: backTo, search } : { to: backTo }
  return (
    <>
      <PageHead
        parent={{ ...back, label: backLabel }}
        title={`That ${what} is not here`}
        sub="It may have been removed, or the link may be out of date."
      />
      <Card>
        <Empty
          icon="⊘"
          action={<Btn small onClick={() => navigate(back)}>Back to {backLabel.toLowerCase()}</Btn>}
        >
          Nothing matches that reference.
        </Empty>
      </Card>
    </>
  )
}
