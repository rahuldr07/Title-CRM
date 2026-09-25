import { useStageName } from '@/domain/company/naming'
import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { useGo } from '@/shared/hooks/useGo'
import { Btn } from '@/shared/ui/Button'
import { NotFoundRecord } from '@/shared/ui/NotFoundRecord'
import { PageHead } from '@/shared/ui/PageHead'
import { Tabs } from '@/shared/ui/Tabs'
import { useBudgetHelp } from '@/shared/hooks/useBudgetHelp'
import { useStaffEditor } from '@/shared/editors/useStaffEditor'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { useStaff, findPerson } from '@/domain/people/roster'
import { usePerms, useRoles } from '@/domain/auth/roles'
import { useLevels } from '@/domain/assignment/levels'
import { liveWork } from '@/domain/orders/liveWork'
import { useOrders } from '@/domain/orders/orders'
import { dayLoadOf } from '@/domain/orders/dayLoad'
import { qcAverage, standing, type StageWork } from '@/domain/quality/quality'
import { DEFAULT_RANGE, inRange, resolveRange } from '@/shared/lib/range'
import { mayVisit, roleName, routeNeeds } from '@/domain/auth/permissions'
import { useDeliveries } from '@/shared/hooks/useDeliveries'
import { useQcLog } from '@/shared/hooks/useQcLog'
import { useStageWork } from '@/shared/hooks/useStageWork'
import { CHECK_TITLE, checksOf, PERFORMANCE_WITHHELD, personAccess, type CheckKind } from './personDetail'
import { PersonHead } from './PersonHead'
import { PersonOverview } from './PersonOverview'
import { PersonWorkTab } from './PersonWorkTab'
import { PersonQualityTab } from './PersonQualityTab'
import { PersonAccessTab } from './PersonAccessTab'
import { ChecksModal, LateModal, StagesModal } from './PersonModals'

const TABS = ['Overview', 'Work', 'Quality', 'Access'] as const
type Tab = (typeof TABS)[number]

export default function PersonDetailRoute() {
  const { personId } = useParams({ from: '/staff/$personId' })
  return <PersonDetail key={personId} personId={personId} />
}

function PersonDetail({ personId }: { personId: string }) {
  const navigate = useGo()
  const { me, can } = useSession()
  const { openModal } = useUi()
  const budgetHelp = useBudgetHelp()
  const { editStaff } = useStaffEditor()
  const staff = useStaff()
  const perms = usePerms()
  const roles = useRoles()
  const levelsApi = useLevels(me)
  const [tab, setTab] = useState<Tab>('Overview')
  const [aadhaarShown, setAadhaarShown] = useState(false)

  const person = findPerson(staff, personId)

  const history = useDeliveries()
  const qcLog = useQcLog()
  const orders = useOrders()
  const range = resolveRange(DEFAULT_RANGE)
  const stageWork = useStageWork(range)
  const stageName = useStageName()

  if (!person) {
    return <NotFoundRecord what="person" backTo="/company" backLabel="Staff" />
  }

  const { dwork } = liveWork(orders)
  const log = qcLog.data ?? []
  const access = personAccess(me.id, person.id, can)
  const withheld = access.performance ? null : PERFORMANCE_WITHHELD

  const rated = withheld ? [] : log.filter((x) => x.onName === person.n && inRange(x.d, range))
  const given = withheld ? [] : log.filter((x) => x.byName === person.n && inRange(x.d, range))
  const teamRows = log.filter((x) => inRange(x.d, range))

  const work = dayLoadOf(person, orders)
  const t: StageWork | null = withheld ? null : (stageWork.people[person.n] ?? null)
  const qavg = qcAverage(rated)
  const teamAvg = qcAverage(teamRows)
  const sd = qavg !== null && teamAvg !== null && t ? standing(qavg, t.vsPeers, teamAvg) : null
  const role = roles.find((x) => x.id === person.r)
  const dis = person.active === false
  const isMe = person.id === me.id
  const loading = qcLog.isPending || history.isPending

  const maySeePersonal = access.personal

  const edit = access.edit ? () => editStaff(person.id) : undefined
  const toRoles = () => navigate({ to: '/company', search: { tab: 'Roles' } })

  const openStages = () =>
    openModal({
      title: `${person.n} — ${work.given} stage${work.given === 1 ? '' : 's'} today`,
      body: <StagesModal items={[...work.items].sort((a, b) => a.hr - b.hr)} cap={person.cap} />,
    })

  const openLate = () => {
    const over = t ? t.items.filter((x) => x.over && x.d.late) : []
    openModal({
      title: `Late deliveries their stage overran — ${over.length}`,
      body: <LateModal over={over} />,
    })
  }

  const openChecks = (kind: CheckKind) => {
    const set = checksOf(kind, rated, given)
    openModal({
      title: `${person.n} — ${CHECK_TITLE[kind].toLowerCase()} · ${set.length}`,
      body: <ChecksModal kind={kind} set={set} rangeLabel={range.label} />,
    })
  }

  const rosterNeeds = routeNeeds('company')
  const parent =
    !rosterNeeds || can(rosterNeeds)
      ? { to: '/company', search: { tab: 'Staff' }, label: 'Staff' }
      : can('all')
        ? { to: '/dash', label: 'Dashboard' }
        : { to: '/mywork', label: 'My work' }

  return (
    <>
      <PageHead
        parent={parent}
        title={person.n}
        sub={`${person.dep.map(stageName).join(', ') || 'no department'} · ${roleName(person.r)}`}
        actions={
          <>
            {mayVisit(me, 'reports') ? (
              <Btn
                variant="ghost"
                onClick={() =>
                  navigate({ to: '/reports', search: { tab: 'By staff', sw: person.id } })
                }
              >
                In workload
              </Btn>
            ) : null}
            {edit ? <Btn onClick={edit}>Edit details</Btn> : null}
          </>
        }
      />

      <PersonHead
        person={person}
        sd={sd}
        dis={dis}
        isMe={isMe}
        showRoles={access.edit}
        onEdit={edit}
        onRoles={toRoles}
      />

      <div style={{ marginTop: 16 }}>
        <Tabs tabs={[...TABS]} value={tab} onChange={setTab}>

          {tab === 'Overview' ? (
            <PersonOverview
              person={person}
              work={work}
              dwork={dwork}
              t={t}
              qavg={qavg}
              teamAvg={teamAvg}
              sd={sd}
              ratedCount={rated.length}
              rangeLabel={range.label}
              loading={loading}
              withheld={withheld}
              maySeePersonal={maySeePersonal}
              aadhaarShown={aadhaarShown}
              onShowAadhaar={() => setAadhaarShown(true)}
              levelsApi={levelsApi}
              onOpenLevel={
                mayVisit(me, 'assign')
                  ? (levelId) => {
                      levelsApi.select(levelId)
                      navigate({ to: '/assign' })
                    }
                  : undefined
              }
              onTab={setTab}
              onEdit={edit}
            />
          ) : null}
          {tab === 'Work' ? (
            <PersonWorkTab
              person={person}
              work={work}
              t={t}
              withheld={withheld}
              loading={loading}
              rangeLabel={range.label}
              onStages={openStages}
              onLate={openLate}
              onBudgetHelp={budgetHelp}
              onOpenOrder={(orderId) => navigate({ to: '/orders/$orderId', params: { orderId } })}
            />
          ) : null}
          {tab === 'Quality' ? (
            <PersonQualityTab
              withheld={withheld}
              rated={rated}
              given={given}
              qavg={qavg}
              teamAvg={teamAvg}
              loading={loading}
              rangeLabel={range.label}
              onChecks={openChecks}
            />
          ) : null}
          {tab === 'Access' ? (
            <PersonAccessTab person={person} role={role} perms={perms} dis={dis} onEdit={edit} onRoles={access.edit ? toRoles : undefined} />
          ) : null}
        </Tabs>
      </div>
    </>
  )
}
