import { Btn } from '@/shared/ui/Button'
import { Input, Select } from '@/shared/ui/Controls'
import { Card, CardHead } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import type { useNotBuilt } from '@/shared/hooks/useNotBuilt'
import { type OrderDoc } from '@/domain/orders/orders'
import { addDoc, setDoc } from '@/domain/orders/orderWrites'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { fmtUsDate } from '@/shared/lib/format'
import { Note } from '@/shared/ui/Layout'

const DOCCOLS = '1.1fr 120px 130px 150px 130px 150px'
const DOC_KINDS = ['Deed', 'Mortgage', 'Assignment', 'Judgment', 'Tax', 'Plat']

interface Props {
  orderId: string
  docs: readonly OrderDoc[]
  notBuilt: ReturnType<typeof useNotBuilt>
  locked: string | null
}

export function OrderDocumentsTab({ orderId, docs, notBuilt, locked }: Props) {
  const { me } = useSession()
  const { toast } = useUi()
  const refuse = (refused: string | null) => {
    if (refused) toast(refused)
  }
  return (
    <>
      <Card>
        <CardHead
          title="Documents in the package"
          actions={
            <>
              <Btn
                variant="ghost"
                small
                onClick={() => notBuilt('Upload', 'somewhere to put the file')}
              >
                Upload
              </Btn>
              <Btn small disabled={!!locked} onClick={() => refuse(addDoc(me, orderId))}>
                ＋ Add
              </Btn>
            </>
          }
        />
        <FlexTable
          cols={DOCCOLS}
          min={840}
          head={['Doc type', 'Recorded', 'Book/Page', 'Instrument no', 'Image', 'Extraction']}
          wrap="none"
        >
          {docs.map((d) => (
            <FlexRow key={d.id}>
              <Cell>
                {d.kind ? (
                  <div className="v">{d.kind}</div>
                ) : (
                  <Select<string>
                    label="Document type"
                    disabled={!!locked}
                    value=""
                    onChange={(v) => refuse(setDoc(me, orderId, d.id, 'kind', v))}
                    options={[['', '— choose type —'], ...DOC_KINDS.map((k) => [k, k] as const)]}
                  />
                )}
              </Cell>
              <Cell>
                {d.kind ? (
                  <div className="v mono">{d.recorded ? fmtUsDate(d.recorded) : '—'}</div>
                ) : (
                  <Input
                    mono
                    label="Recording date"
                    disabled={!!locked}
                    placeholder="MM/DD/YYYY"
                    value={d.recorded}
                    onChange={(e) => refuse(setDoc(me, orderId, d.id, 'recorded', e.target.value))}
                  />
                )}
              </Cell>
              <Cell>
                {d.kind ? (
                  <div className="v mono">{d.bookPage || '—'}</div>
                ) : (
                  <Input
                    mono
                    label="Book and page"
                    disabled={!!locked}
                    value={d.bookPage}
                    onChange={(e) => refuse(setDoc(me, orderId, d.id, 'bookPage', e.target.value))}
                  />
                )}
              </Cell>
              <Cell>
                {d.kind ? (
                  <div className="v mono">{d.instrument || '—'}</div>
                ) : (
                  <Input
                    mono
                    label="Instrument number"
                    disabled={!!locked}
                    value={d.instrument}
                    onChange={(e) => refuse(setDoc(me, orderId, d.id, 'instrument', e.target.value))}
                  />
                )}
              </Cell>
              <Cell>
                {d.image ? (
                  <Btn
                    variant="ghost"
                    small
                    onClick={() =>
                      notBuilt('Opening the scan', 'the original document files')
                    }
                  >
                    View
                  </Btn>
                ) : (
                  <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
                    no image
                  </span>
                )}
              </Cell>
              <Cell>
                {d.extraction === 'verified' ? (
                  <Chip kind="v">Verified</Chip>
                ) : d.extraction === 'review' ? (
                  <Chip kind="r">Needs review</Chip>
                ) : (
                  <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
                    —
                  </span>
                )}
              </Cell>
            </FlexRow>
          ))}
        </FlexTable>
      </Card>
      {locked ? <Note top={12}>{locked}</Note> : null}
      <Note top={12}>
        An empty row shows <b>no</b> extraction status. A document is only “Verified” once a
        person has confirmed the reading against the image.
      </Note>
    </>
  )
}
