import { useState } from 'react'
import { Note } from '@/shared/ui/Layout'
import { useParams } from '@tanstack/react-router'
import { useGo, useMayOpen } from '@/shared/hooks/useGo'
import { Btn } from '@/shared/ui/Button'
import { Chip } from '@/shared/ui/Chip'
import { PageHead } from '@/shared/ui/PageHead'
import { Tabs } from '@/shared/ui/Tabs'
import { useNotBuilt } from '@/shared/hooks/useNotBuilt'
import { useSession } from '@/domain/auth/SessionProvider'
import { lastOrdersView } from '@/features/production/orders/ordersView'
import { useUi } from '@/shared/ui/UiProvider'
import { useQcRules } from '@/domain/quality/qcRules'
import { useRules } from '@/domain/assignment/RulesProvider'
import { CostForm } from './CostForm'
import { DefectForm } from './DefectForm'
import { docsOf, mayOpenOrder, ratingsOf, orderAsEdited, orderById, partiesOf, useOrderState, workingOn, type OrderEdits, type QcField, type StageRating } from '@/domain/orders/orders'
import { DOC_WORK, FINDINGS_WORK, NOTE_WORK, addCost, addNote, finishStage, headerRefusal, setAssignee, setAssignments, setOrderField, stageWorkRefusal, targetBreach } from '@/domain/orders/orderWrites'
import { markRated, rateRefusal, ratedForSending, unratedStages } from '@/domain/orders/ratings'
import { statusChoices } from '@/domain/orders/statusMoves'
import { refusal } from '@/domain/auth/permissions'
import { countyName, useCoverage } from '@/domain/counties/counties'
import { STAGES } from '@/data/org'
import { money, r2 } from '@/shared/lib/format'
import { dueMeta, orderChipKind, orderState } from '@/domain/orders/orderState'
import { whoName, useStaff } from '@/domain/people/roster'
import { statusName, useStatuses } from '@/domain/company/statuses'
import { useStageName } from '@/domain/company/naming'
import { wouldSelfReview } from '@/domain/assignment/narrow'
import { curStageOf, orderPlan } from '@/domain/assignment/sla'
import type { Assignments } from '@/data/types'
import { AssignAllPreview, SelfReviewNote } from './AssignAllPreview'
import { NotYourOrder } from './OrderUnavailable'
import { NotFoundRecord } from '@/shared/ui/NotFoundRecord'
import { OrderAssignmentTab } from './OrderAssignmentTab'
import { OrderCostsTab } from './OrderCostsTab'
import { OrderCountyLinksTab } from './OrderCountyLinksTab'
import { OrderDetailsTab } from './OrderDetailsTab'
import { OrderDocumentsTab } from './OrderDocumentsTab'
import { OrderHistoryTab } from './OrderHistoryTab'
import { OrderNotesTab } from './OrderNotesTab'
import { OrderQualityTab } from './OrderQualityTab'
import {
  costTotalOf,
  historyRows,
  planAssignAll,
  withScore,
} from './orderDetail'

const TABS = [
  'Details',
  'Assignment',
  'Quality',
  'Documents',
  'Costs',
  'History',
  'Notes',
  'County links',
] as const
type Tab = (typeof TABS)[number]

export default function OrderDetail() {
  const everyone = useStaff()
  const statuses = useStatuses()
  const { counties } = useCoverage()
  const st = (k: string) => statusName(k, statuses)
  const stageName = useStageName()
  const { orderId } = useParams({ from: '/orders/$orderId' })
  const navigate = useGo()
  const { me, can } = useSession()
  const mayOpenCompany = useMayOpen('company')
  const { toast, openModal, closeModal } = useUi()
  const notBuilt = useNotBuilt()
  const qcRules = useQcRules()
  const { rules } = useRules()
  const [tab, setTab] = useState<Tab>('Details')
  const [note, setNote] = useState('')
  const [scoring, setScoring] = useState<Record<string, StageRating>>({})

  useOrderState()

  const base = orderById(orderId)

  if (!base) {
    return <NotFoundRecord what="order" backTo="/orders" backLabel="Orders" search={lastOrdersView()} />
  }

  const w = workingOn(base.id)
  const o = orderAsEdited(base, w)
  const assign: Assignments = o.a

  if (!mayOpenOrder(me, o)) {
    return <NotYourOrder who={me.n} orderId={o.id} onBack={() => navigate({ to: '/mywork' })} />
  }

  const plan = orderPlan(o)
  const county = counties.find((c) => c.n === o.co && c.st === o.st)
  const costs = w.costs
  const costTotal = costTotalOf(costs)
  const worked = STAGES.filter((s) => assign[s])
  const rated = ratedForSending(o.id) || !!o.done
  const unrated = o.done ? [] : unratedStages(o)
  const whyNot = Object.fromEntries(unrated.flatMap((s) => {
    const why = rateRefusal(me, o, s)
    return why ? [[s, why]] : []
  }))
  const rateable = unrated.filter((s) => !whyNot[s])
  const moves = statusChoices(me, o)
  const rateStage = (s: string, fn: (r: StageRating) => StageRating) =>
    setScoring((prev) => ({
      ...prev,
      [s]: fn(prev[s] ?? { who: assign[s] ?? '', scores: {}, comment: '' }),
    }))
  const score = (s: string, field: QcField, v: number) => rateStage(s, (r) => withScore(r, field, v))
  const comment = (s: string, text: string) => rateStage(s, (r) => ({ ...r, comment: text }))
  const ratingRequired = qcRules.find((r) => r.k === 'mand')?.on ?? false

  const refuse = (refused: string | null) => {
    if (refused) toast(refused)
    return !refused
  }

  const field = <K extends keyof OrderEdits>(key: K, value: OrderEdits[K]) => {
    refuse(setOrderField(me, o.id, key, value))
  }

  const setStage = (stage: string, value: string) => {
    if (!value) return
    if (value === '__clear') {
      if (refuse(setAssignee(me, o.id, stage, null))) toast(`${stageName(stage)} unassigned`)
      return
    }
    const paired = wouldSelfReview(assign, stage, value)
    if (paired) {
      openModal({
        title: 'That would be self-review',
        body: <SelfReviewNote who={value} paired={paired} stage={stage} />,
        footer: <Btn onClick={closeModal}>Pick someone else</Btn>,
      })
      return
    }
    const give = (overTarget: boolean) => {
      if (refuse(setAssignee(me, o.id, stage, value, { overTarget }))) toast(`${stageName(stage)} → ${whoName(value)}`)
    }
    const over = targetBreach(o.id, stage, value)
    if (!over) return give(false)
    openModal({
      title: `${whoName(value)} is at their target`,
      body: <Note plain size="body">{over}</Note>,
      footer: (
        <>
          <Btn variant="ghost" onClick={closeModal}>
            Pick someone else
          </Btn>
          <Btn onClick={() => { closeModal(); give(true) }}>Give it to {whoName(value)} anyway</Btn>
        </>
      ),
    })
  }

  const assignAll = () => {
    const p = planAssignAll(o, assign, rules)
    if (!p.open.length) return toast('Every stage already has an owner')
    openModal({
      title: 'Assign the remaining stages',
      body: <AssignAllPreview orderId={o.id} plan={p} />,
      footer: (
        <>
          <Btn variant="ghost" onClick={closeModal}>
            Cancel
          </Btn>
          <Btn
            onClick={() => {
              const n = p.preview.filter((x) => x.person).length
              closeModal()
              if (refuse(setAssignments(me, o.id, p.taken))) toast(`${n} stage${n === 1 ? '' : 's'} assigned`)
            }}
          >
            Assign these
          </Btn>
        </>
      ),
    })
  }

  const openCost = () =>
    openModal({
      title: 'Add a pass-through cost',
      body: (
        <CostForm
          onCancel={closeModal}
          onSubmit={(what, amt) => {
            closeModal()
            if (refuse(addCost(me, o.id, what, amt))) toast(`${money(amt)} added — ${money(r2(costTotal + amt))} in pass-through costs on this order`)
          }}
        />
      ),
    })

  const openDefect = () =>
    openModal({
      title: 'Log a defect',
      body: (
        <DefectForm
          onCancel={closeModal}
          onSubmit={(criterion, text) => {
            closeModal()
            if (!refuse(addNote(me, o.id, `Defect · ${criterion} — ${text}`, true))) return
            toast('Defect logged against the order and the field')
            setTab('Notes')
          }}
        />
      ),
    })

  const saveRatings = () => {
    const r = markRated(me, o.id, Object.fromEntries(Object.entries(scoring).filter(([s]) => rateable.includes(s))))
    if (!r.ok) return toast(r.why)
    setScoring({})
    toast(ratingRequired && ratedForSending(o.id) ? 'Ratings saved — the order can now be marked Sent' : 'Ratings saved')
  }

  const postNote = () => {
    const v = note.trim()
    if (!v) return toast('Nothing to add — type the note first')
    if (!refuse(addNote(me, o.id, v))) return
    setNote('')
    toast('Note added')
  }

  const stageNow = o.done ? null : curStageOf(o)
  const mine = !!stageNow && assign[stageNow] === me.id
  const mayFinish = !!stageNow && (mine || can('assign'))

  const finish = () => {
    const r = finishStage(me, o.id)
    if (r.done) {
      toast(r.to === 'Sent' ? `${stageName(r.from)} finished — ${o.id} sent to the client` : `${stageName(r.from)} finished — handed to ${stageName(r.to)}`)
      return
    }
    openModal({
      title: `${stageNow ? stageName(stageNow) : 'This stage'} is not finished yet`,
      body: <Note plain size="body">{r.why}</Note>,
      footer: <Btn onClick={closeModal}>OK</Btn>,
    })
  }

  const save = () => {
    const n = Object.keys(w.edits).length
    toast(
      n
        ? `${n} change${n === 1 ? '' : 's'} held on ${o.id} — this session, until the API accepts writes`
        : 'Nothing has changed on this order',
    )
  }

  return (
    <>
      <PageHead
        parent={{ to: '/orders', label: 'Orders', search: lastOrdersView() }}
        title={o.prop || o.id}
        sub={`${o.id} · ${o.cl} · ${o.pr} · ${countyName(o.co, o.st)}, ${o.st}`}
        actions={
          <>
            <Chip kind={orderChipKind(o)}>{st(o.stt)}</Chip>
            {orderState(o) === 'late' ? <span className="due late">{dueMeta(o.due).rel}</span> : null}
            <Btn variant="ghost" onClick={() => navigate({ to: '/commitment', search: { order: o.id } })}>
              Open report
            </Btn>
            <Btn variant={mayFinish ? 'ghost' : 'primary'} onClick={save}>
              Save
            </Btn>
            {mayFinish ? (
              <Btn onClick={finish}>{mine ? `Finish ${stageName(stageNow ?? '')}` : `Mark ${stageName(stageNow ?? '')} finished`}</Btn>
            ) : null}
          </>
        }
      />

      <Tabs tabs={TABS.filter((t) => t !== 'Costs' || can('pricing'))} value={tab} onChange={setTab}>
        {tab === 'Details' ? (
          <OrderDetailsTab
            o={o}
            parties={partiesOf(base, w)}
            plan={plan}
            pricing={can('pricing')}
            statusKeys={moves.keys}
            statusWhy={moves.why}
            mayOpenCompany={mayOpenCompany}
            navigate={navigate}
            field={field}
            locks={{ header: headerRefusal(me), findings: stageWorkRefusal(me, o.id, FINDINGS_WORK) }}
          />
        ) : null}

        {tab === 'Assignment' ? (
          <OrderAssignmentTab
            assign={assign}
            everyone={everyone}
            locked={refusal(me, 'assign', 'Assigning work')}
            navigate={navigate}
            onAssignAll={assignAll}
            onPick={setStage}
          />
        ) : null}

        {tab === 'Quality' ? (
          <OrderQualityTab
            assign={assign}
            worked={worked}
            rated={rated}
            unrated={unrated}
            rateable={rateable}
            whyNot={whyNot}
            stored={ratingsOf(o.id)}
            scoring={scoring}
            mayQc={can('qc')}
            onScore={score}
            onComment={comment}
            onSave={saveRatings}
            onDefect={openDefect}
            onGoToAssignment={() => setTab('Assignment')}
          />
        ) : null}

        {tab === 'Documents' ? <OrderDocumentsTab orderId={o.id} docs={docsOf(o.id)} notBuilt={notBuilt} locked={stageWorkRefusal(me, o.id, DOC_WORK)} /> : null}

        {tab === 'Costs' && can('pricing') ? (
          <OrderCostsTab costs={costs} fee={o.fee} costTotal={costTotal} onAdd={openCost} />
        ) : null}

        {tab === 'History' ? <OrderHistoryTab rows={historyRows(base, w.events)} /> : null}

        {tab === 'Notes' ? <OrderNotesTab note={note} notes={w.notes} onNote={setNote} onPost={postNote} locked={stageWorkRefusal(me, o.id, NOTE_WORK)} /> : null}

        {tab === 'County links' ? (
          <OrderCountyLinksTab co={o.co} st={o.st} county={county} navigate={navigate} />
        ) : null}
      </Tabs>
    </>
  )
}
