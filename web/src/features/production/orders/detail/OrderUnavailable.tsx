import { Btn } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { PageHead } from '@/shared/ui/PageHead'
import { Note } from '@/shared/ui/Layout'

export function NotYourOrder({ who, orderId, onBack }: { who: string; orderId: string; onBack: () => void }) {
  return (
    <>
      <PageHead parent={{ to: '/mywork', label: 'My work' }} title="Not one of yours" sub={`${who} is not on any stage of ${orderId}.`} />
      <Card padded style={{ maxWidth: 560 }}>
        <Note plain size="body" margin={0}>
          Your account sees the orders you are working. If this one should be yours, whoever runs
          your department can assign it.
        </Note>
        <div style={{ marginTop: 14 }}>
          <Btn onClick={onBack}>Back to my queue</Btn>
        </div>
      </Card>
    </>
  )
}
