import { useStageName } from '@/domain/company/naming'
import { Bar, BarGrid } from '@/shared/ui/Bar'
import { Banner } from '@/shared/ui/Banner'
import { Btn, LinkButton } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { DetailList } from '@/shared/ui/DetailList'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { SkeletonValue } from '@/shared/ui/Skeleton'
import type { Person } from '@/data/types'
import { COVSTAGES } from '@/data/org'
import type { LiveWork } from '@/domain/orders/liveWork'
import type { DayLoad } from '@/domain/orders/dayLoad'
import type { useLevels } from '@/domain/assignment/levels'
import { averageText, type StageWork, type standing } from '@/domain/quality/quality'
import { PersonStatutory } from './PersonStatutory'
import { PersonLevelCard } from './PersonLevelCard'
import { CONTACT_WITHHELD, contactRows, emergencyView } from './personDetail'
import { Inline, Note } from '@/shared/ui/Layout'

const TINT: Record<string, string> = {
  v: 'var(--oksoft)',
  d: 'var(--badtint)',
  r: 'var(--warntint)',
  b: 'var(--brandsoft)',
  n: 'var(--tint)',
}

export function PersonOverview({
  person,
  work,
  dwork,
  t,
  qavg,
  teamAvg,
  sd,
  ratedCount,
  rangeLabel,
  loading,
  withheld,
  maySeePersonal,
  aadhaarShown,
  onShowAadhaar,
  levelsApi,
  onOpenLevel,
  onTab,
  onEdit,
}: {
  person: Person
  work: DayLoad
  dwork: LiveWork['dwork']
  t: StageWork | null
  qavg: number | null
  teamAvg: number | null
  sd: ReturnType<typeof standing> | null
  ratedCount: number
  rangeLabel: string
  loading: boolean
  withheld: string | null
  maySeePersonal: boolean
  aadhaarShown: boolean
  onShowAadhaar: () => void
  levelsApi: ReturnType<typeof useLevels>
  onOpenLevel: ((levelId: string) => void) | undefined
  onTab: (tab: 'Work' | 'Quality') => void
  onEdit: (() => void) | undefined
}) {
  const stageName = useStageName()
  const emergency = emergencyView(person, maySeePersonal)
  return (
    <>
      <Kpis style={{ marginTop: 16 }}>
        <Kpi
          title="Today"
          value={work.given}
          detail={work.carried ? `given today, with ${work.carried} carried in — ${work.load} of a ${work.cap} target` : `of a ${work.cap} target`}
          hint="Their day, stage by stage"
          onClick={() => onTab('Work')}
        />
        <Kpi
          title="Completed"
          value={<span className="ok">{work.done}</span>}
          detail={`${work.pct}% of their day`}
          hint="Their day, stage by stage"
          onClick={() => onTab('Work')}
        />
        <Kpi
          title="On their desk"
          value={<span className={work.onDesk ? 'warn' : 'ok'}>{work.onDesk}</span>}
          tone={work.onDesk ? 'warn' : undefined}
          detail="still to finish"
          hint="What is still open"
          onClick={() => onTab('Work')}
        />
        <Kpi
          title="Quality"
          value={withheld ? '—' : loading ? <SkeletonValue width={64} /> : qavg !== null ? qavg.toFixed(2) : '—'}
          detail={withheld ? 'a personal record — why it is not shown' : `${ratedCount} rating${ratedCount === 1 ? '' : 's'} · ${rangeLabel}`}
          hint={withheld ? 'Who can see it' : 'Every rating and why marks came off'}
          onClick={() => onTab('Quality')}
        />
      </Kpis>

      {sd && qavg !== null && t ? (
        <Card padded top={16}>
          <div
            className="rw tagged"
            style={{ background: TINT[sd[1]] ?? 'var(--tint)', borderRadius: 9, padding: '13px 15px' }}
          >
            <span>
              <Chip kind={sd[1]}>{sd[0]}</Chip>
            </span>
            <span>
              <b>{sd[2]}</b>
              <div className="sd">
                Quality {qavg.toFixed(2)} against a team {averageText(teamAvg)}; inside budget on{' '}
                {t.onBudget}% of {t.c} stages where peers on the same stages manage {t.expected}%.
              </div>
            </span>
            <span>
              <Btn variant="ghost" small onClick={() => onTab('Quality')}>
                The detail
              </Btn>
            </span>
          </div>
        </Card>
      ) : null}

      <div className="two" style={{ marginTop: 16 }}>
        <Card padded>
          <Label>Contact and emergency</Label>
          <DetailList
            gap={14}
            rows={contactRows(person, maySeePersonal).map(([k, v]): [string, React.ReactNode] => [
              k,
              <span style={{ overflowWrap: 'anywhere' }}>{v}</span>,
            ])}
          />
          {emergency.kind === 'known' ? (
            <div
              className="rw"
              style={{
                background: 'var(--badtint)',
                borderRadius: 9,
                padding: '12px 14px',
                marginTop: 12,
              }}
            >
              <span className="bad" style={{ fontSize: 'var(--t-lead)' }}>
                ☎
              </span>
              <span>
                <b>
                  {emergency.emg.n} — {emergency.emg.rel}
                </b>
                <div className="sd mono">{emergency.emg.mob}</div>
                <div className="sd gr">Called first if something happens here.</div>
              </span>
              <span />
            </div>
          ) : emergency.kind === 'none' ? (
            <Banner kind="r" icon="⚠" top={12}>
              <b>No emergency contact on record.</b> This is the field nobody misses until the day it
              is needed.
            </Banner>
          ) : (
            <Note margin="10px 0 0">
              {CONTACT_WITHHELD}
            </Note>
          )}
        </Card>

        <PersonStatutory
          person={person}
          maySeePersonal={maySeePersonal}
          aadhaarShown={aadhaarShown}
          onShowAadhaar={onShowAadhaar}
        />
      </div>

      <div className="two" style={{ marginTop: 16 }}>
        <Card padded>
          <Label>Where they work</Label>
          {person.dep.length ? (
            person.dep.map((d) => {
              const st = work.stages[d] ?? { done: 0, pend: 0 }
              const dept = dwork[d]
              return (
                <BarGrid key={d} cols="130px 1fr 120px" gap={12} padding="7px 0">
                  <span>
                    <b>{stageName(d)}</b>
                  </span>
                  <Bar value={st.done + st.pend} max={Math.max(1, work.given)} color="var(--brand2)" />
                  <span className="mono gr" style={{ textAlign: 'right' }}>
                    {st.done + st.pend} today
                    {dept?.staff ? ` · 1 of ${dept.staff.length}` : ''}
                  </span>
                </BarGrid>
              )
            })
          ) : (
            <Note margin={0}>
              No department, so the assignment engine can never pick them.{' '}
              {onEdit ? (
                <>
                  <LinkButton onClick={onEdit}>Fix that</LinkButton>
                  .
                </>
              ) : (
                'Someone with the “people” capability can add one.'
              )}
            </Note>
          )}
          <Note top={12}>
            A person in one department is a single point of failure for that stage on the day they
            are away.
          </Note>
        </Card>

        <Card padded>
          <Label>Capacity</Label>
          <Inline align="baseline" gap={8} style={{ margin: '8px 0 10px' }}>
            <b className="mono" style={{ fontSize: 'var(--t-display)' }}>
              {work.load}
            </b>
            <span className="gr">of {work.cap} today</span>
          </Inline>
          <Bar
            value={work.load}
            max={work.cap}
            color={work.room ? 'var(--ok)' : 'var(--warn)'}
          />
          <Note top={12}>
            {work.carried} carried in from earlier days and {work.given} given today.{' '}
            {work.room
              ? `${work.room} more before the engine stops offering them work.`
              : 'At target, so the engine will not give them anything else today. Anything that needed them became an exception.'}
          </Note>
          <Note>
            Their target is set on their record, not by the department.
          </Note>
        </Card>

        {person.dep.some((d) => COVSTAGES.includes(d)) ? (
          <PersonLevelCard person={person} levelsApi={levelsApi} onOpenLevel={onOpenLevel} />
        ) : null}
      </div>
    </>
  )
}
