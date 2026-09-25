import { useStageName } from '@/domain/company/naming'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { SecHead } from '@/shared/ui/PageHead'
import { useUi } from '@/shared/ui/UiProvider'
import { DeptForm, DeptDelete } from '@/features/configure/company/forms/DeptForm'
import { useStaff } from '@/domain/people/roster'
import { moveDept, useDepartments } from '@/domain/company/departments'
import { useLiveWork } from '@/domain/orders/liveWork'
import { csvName, downloadCSV } from '@/shared/lib/csv'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { useSession } from '@/domain/auth/SessionProvider'
import { useRefusal } from '@/shared/hooks/useRefusal'
import { Inline, Note } from '@/shared/ui/Layout'

const COLS = '170px 1fr 130px 110px 110px 120px 140px'

export function DepartmentsTab({ onOpenStaff }: { onOpenStaff: () => void }) {
  const { me } = useSession()
  const refuse = useRefusal()
  const { openModal, closeModal, toast } = useUi()
  const depts = useDepartments()
  const stageName = useStageName()
  const STAFF = useStaff()
  const { dwork } = useLiveWork()

  const editDept = (id?: string) =>
    openModal({
      title: id ? `Edit ${stageName(depts.find((d) => d.id === id)?.n ?? '')}` : 'Add a department',
      body: (
        <DeptForm
          id={id}
          onCancel={closeModal}
          onDone={(m) => { closeModal(); toast(m) }}
          onRemove={(x) => confirmRemove(x)}
        />
      ),
    })

  const confirmRemove = (id: string) =>
    openModal({
      title: `Remove ${stageName(depts.find((d) => d.id === id)?.n ?? '')}?`,
      body: (
        <DeptDelete
          id={id}
          onCancel={() => editDept(id)}
          onDone={(m) => { closeModal(); toast(m) }}
        />
      ),
    })

  const auto = depts.filter((d) => d.auto)
  const exc = depts.filter((d) => !d.auto)

  const head = (name: string) => {
    const people = STAFF.filter((s) => s.dep.includes(name) && s.active !== false)
    return {
      n: people.length,
      avail: people.filter((s) => s.avail === 'ok').length,
      load: dwork[name]?.tot ?? 0,
    }
  }

  const thin = depts.filter((d) => head(d.n).n <= 1)

  const exportDepts = () =>
    downloadCSV(csvName('departments'), [
      ['Department', 'What it does', 'In the pipeline', 'People', 'Available', "Today's work"],
      ...depts.map((d) => {
        const h = head(d.n)
        return [
          stageName(d.n),
          d.desc ?? '',
          d.auto ? `Step ${auto.indexOf(d) + 1}` : 'On demand',
          h.n,
          h.avail,
          h.load,
        ]
      }),
    ])

  return (
    <>
      <SecHead
        sub="The stages an order moves through, and who staffs them."
        actions={
          <>
            <Btn
              variant="ghost"
              onClick={() => {
                const out = exportDepts()
                toast(`${out.name} — ${out.rows.length - 1} departments`)
              }}
            >
              Export
            </Btn>
            <Btn onClick={() => editDept()}>＋ Add department</Btn>
          </>
        }
      />

      <Card padded>
        <Label>Pipeline order</Label>
        <Inline wrap gap={7}>
          {auto.map((d, i) => (
            <span key={d.id} style={{ display: 'contents' }}>
              <Chip kind="b" plain>
                <span style={{ fontWeight: 600 }}>
                  {i + 1}. {stageName(d.n)}
                </span>
              </Chip>
              {i < auto.length - 1 ? <span className="gr">→</span> : null}
            </span>
          ))}
        </Inline>
        {exc.length ? (
          <Inline wrap gap={7} style={{ marginTop: 11 }}>
            <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
              Off to one side:
            </span>
            {exc.map((d) => (
              <Chip key={d.id} kind="n" plain>
                {stageName(d.n)}
              </Chip>
            ))}
          </Inline>
        ) : null}
        <Note top={12}>
          An order passes through the numbered stages in order. An exception branch is entered on
          demand from any stage, and the order returns to where it left.
        </Note>
      </Card>

      <Card top={18}>
        <FlexTable
          cols={COLS}
          min={940}
          head={['Department', 'What it does', 'In the pipeline', 'People', 'Available', 'Today’s work', '']}
          wrap="none"
        >
          {depts.map((d, i) => {
            const h = head(d.n)
            return (
              <FlexRow key={d.id}>
                <Cell>
                  <div className="v">
                    <b>{stageName(d.n)}</b>
                  </div>
                  {d.pair ? <div className="s">checks {stageName(d.pair)}</div> : null}
                </Cell>
                <Cell>
                  <div className="v gr" style={{ fontSize: 'var(--t-small)' }}>
                    {d.desc || '—'}
                  </div>
                </Cell>
                <Cell>
                  {d.auto ? (
                    <Chip kind="b">Step {auto.indexOf(d) + 1}</Chip>
                  ) : (
                    <Chip kind="n">On demand</Chip>
                  )}
                </Cell>
                <Cell>
                  <div className={`v mono ${h.n === 0 ? 'bad' : h.n === 1 ? 'warn' : ''}`}>
                    {h.n}
                  </div>
                  {h.n <= 1 ? (
                    <div className={`s ${h.n ? '' : 'bad'}`}>{h.n ? 'single point' : 'nobody'}</div>
                  ) : null}
                </Cell>
                <Cell>
                  <div className={`v mono ${h.avail === 0 ? 'bad' : ''}`}>{h.avail}</div>
                </Cell>
                <Cell>
                  <div className="v mono">{h.load || '—'}</div>
                </Cell>
                <Cell style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <Btn
                    variant="ghost"
                    small
                    disabled={i === 0}
                    aria-label={`Move ${stageName(d.n)} up`}
                    onClick={() => refuse(moveDept(me, d.id, -1))}
                  >
                    ↑
                  </Btn>
                  <Btn
                    variant="ghost"
                    small
                    disabled={i === depts.length - 1}
                    aria-label={`Move ${stageName(d.n)} down`}
                    onClick={() => refuse(moveDept(me, d.id, 1))}
                  >
                    ↓
                  </Btn>
                  <Btn
                    variant="ghost"
                    small
                    onClick={() => editDept(d.id)}
                  >
                    Edit
                  </Btn>
                </Cell>
              </FlexRow>
            )
          })}
        </FlexTable>
      </Card>

      {thin.length ? (
        <Banner
          kind="r"
          icon="⚠"
          title="Some departments rest on one person"
          top={16}
          actions={
            <Btn variant="ghost" small onClick={onOpenStaff}>
              Staff
            </Btn>
          }
        >
          {thin.map((d) => stageName(d.n)).join(', ')}. If they are away, that stage stops and every order
          needing it becomes an exception.
        </Banner>
      ) : null}
    </>
  )
}
