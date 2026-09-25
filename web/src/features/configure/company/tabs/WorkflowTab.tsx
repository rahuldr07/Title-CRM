import { moveStatus, useStatuses } from '@/domain/company/statuses'
import { useState } from 'react'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Card, CardHead, Label } from '@/shared/ui/Card'
import { Rows } from '@/shared/ui/DetailList'
import { SecHead } from '@/shared/ui/PageHead'
import { Tabs } from '@/shared/ui/Tabs'
import { useUi } from '@/shared/ui/UiProvider'
import { useGo } from '@/shared/hooks/useGo'
import { StatusForm, StatusDelete } from '@/features/configure/company/forms/StatusForm'
import { useOrders } from '@/domain/orders/orders'
import { csvName, downloadCSV } from '@/shared/lib/csv'
import { setNaming, useNaming } from '@/domain/company/naming'
import { useSession } from '@/domain/auth/SessionProvider'
import { useRefusal } from '@/shared/hooks/useRefusal'
import { Note } from '@/shared/ui/Layout'
import { MatrixTable, Th } from '@/shared/ui/MatrixTable'
import { Input } from '@/shared/ui/Controls'

const WTABS = ['Stages', 'Naming'] as const
type WTab = (typeof WTABS)[number]

const MAIN_LINE = 7

export function WorkflowTab() {
  const { me } = useSession()
  const refuse = useRefusal()
  const { openModal, closeModal, toast } = useUi()
  const navigate = useGo()
  const statuses = useStatuses()
  const orders = useOrders()
  const naming = useNaming()
  const [tab, setTab] = useState<WTab>('Stages')

  const editStatus = (k?: string) =>
    openModal({
      title: k ? `Edit ${statuses.find(([x]) => x === k)?.[1][0] ?? ''}` : 'Add a status',
      body: (
        <StatusForm
          statusKey={k}
          onCancel={closeModal}
          onDone={(m) => { closeModal(); toast(m) }}
        />
      ),
    })

  const deleteStatus = (k: string, name: string, used: number) =>
    openModal({
      title: used ? 'That status is in use' : `Delete ${name}?`,
      body: (
        <StatusDelete
          statusKey={k}
          name={name}
          used={used}
          onCancel={closeModal}
          onSee={() => { closeModal(); navigate({ to: '/orders' }) }}
          onDone={(m) => { closeModal(); toast(m) }}
        />
      ),
    })

  const exportStatuses = () =>
    downloadCSV(csvName('statuses'), [
      ['Status', 'Key', 'Where', 'Orders here now'],
      ...statuses.map(([k, v], i) => [
        v[0],
        k,
        i < MAIN_LINE ? `Main line · position ${i + 1}` : 'Exception branch',
        orders.filter((o) => o.stt === k).length,
      ]),
    ])

  return (
    <>
      <SecHead
        sub="The stages an order moves through, and what each is called."
        actions={
          <Btn
            variant="ghost"
            onClick={() => {
              const out = exportStatuses()
              toast(`${out.name} — ${out.rows.length - 1} statuses`)
            }}
          >
            Export
          </Btn>
        }
      />
      <Tabs tabs={[...WTABS]} value={tab} onChange={setTab}>
        {tab === 'Stages' ? (
          <>
            <Card>
              <CardHead
                title="Stages and statuses"
                actions={
                  <Btn small onClick={() => editStatus()}>
                    ＋ Add status
                  </Btn>
                }
              />
              <Rows bare>
                {statuses.map(([k, v], i) => {
                  const used = orders.filter((o) => o.stt === k).length
                  return (
                    <div className="rw" key={k}>
                      <span
                        style={{ width: 12, height: 12, borderRadius: 5, background: v[1] }}
                        aria-hidden="true"
                      />
                      <span>
                        <b>{v[0]}</b>
                        <div className="sd">
                          {i < MAIN_LINE ? `Main line · position ${i + 1}` : 'Exception branch'}
                          {used ? ` · ${used} order${used === 1 ? '' : 's'} here now` : ''}
                        </div>
                      </span>
                      <span style={{ display: 'flex', gap: 5 }}>
                        <Btn
                          variant="ghost"
                          small
                          disabled={i === 0}
                          aria-label={`Move ${v[0]} up`}
                          onClick={() => refuse(moveStatus(me, k, -1))}
                        >
                          ↑
                        </Btn>
                        <Btn
                          variant="ghost"
                          small
                          disabled={i === statuses.length - 1}
                          aria-label={`Move ${v[0]} down`}
                          onClick={() => refuse(moveStatus(me, k, 1))}
                        >
                          ↓
                        </Btn>
                        <Btn
                          variant="ghost"
                          small
                          onClick={() => editStatus(k)}
                        >
                          Edit
                        </Btn>
                        <Btn
                          variant="danger"
                          small
                          onClick={() => deleteStatus(k, v[0], used)}
                        >
                          Delete
                        </Btn>
                      </span>
                    </div>
                  )
                })}
              </Rows>
            </Card>

            <Banner kind="b" icon="⚑" title="A status in use cannot be deleted" top={16}>
              Deleting a status that live orders point at would orphan them, so the delete is refused
              with a count rather than allowed.
            </Banner>
          </>
        ) : (
          <Card padded>
            <Label>Names used across the product</Label>
            <Note bottom={14}>
              One name per concept, used on every screen and every export. Renaming here renames it
              everywhere.
            </Note>
            <div className="tsc">
              <MatrixTable label="Names used across the product">
                <thead>
                  <tr>
                    <Th>Concept</Th>
                    <Th>Display name</Th>
                    <Th>Short code</Th>
                    <Th>Used on</Th>
                  </tr>
                </thead>
                <tbody>
                  {naming.map((r) => (
                    <tr key={r.concept}>
                      <td>{r.concept}</td>
                      <td>
                        <Input
                          style={{ maxWidth: 190 }}
                          label={`Display name for ${r.concept}`}
                          defaultValue={r.name}
                          key={`${r.concept}-${r.name}`}
                          onBlur={(e) => refuse(setNaming(me, r.concept, e.target.value))}
                        />
                      </td>
                      <td className="mono">{r.short}</td>
                      <td className="gr">{r.used}</td>
                    </tr>
                  ))}
                </tbody>
              </MatrixTable>
            </div>
            <Banner
              kind="r"
              icon="⚑"
              title={'“Sent” and “Completed” were two names for one thing'}
              top={16}
            >
              Reports counted 8,746 Completed while the board counted 8,747 Sent. There is now one
              name.
            </Banner>
          </Card>
        )}
      </Tabs>
    </>
  )
}
