import { useRef } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Card, CardHead, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Field, Fields } from '@/shared/ui/Form'
import { Select } from '@/shared/ui/Controls'
import { focusElement } from '@/shared/ui/focus'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { PageHead, SectionHead } from '@/shared/ui/PageHead'
import { Row, Rows } from '@/shared/ui/DetailList'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { useUi } from '@/shared/ui/UiProvider'
import { LSTATE, linkStats, nextLinkCheck, useBrokenLinks, type FlatLink } from '@/domain/counties/links'
import { daysSince, fmtDT, fmtDate, TZ } from '@/shared/lib/format'
import { WebLink } from '@/shared/ui/WebLink'
import { useSession } from '@/domain/auth/SessionProvider'
import { now } from '@/shared/lib/clock'
import { linkCheckRefusal, runLinkCheck, setCheckEvery, setCheckNotify, useCoverage } from '@/domain/counties/counties'
import { FixLink } from '@/shared/ui/FixLink'
import type { LinkStatus } from '@/data/types'
import { useStaff } from '@/domain/people/roster'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { Note } from '@/shared/ui/Layout'

const BROKEN_COLS = '160px 120px 1fr 130px 120px'

const EVERY = [1, 2, 3, 7, 14]

const NOTIFY: [string, string][] = [
  ['admins', 'Company admins'],
  ['leads', 'Admins and department leads'],
  ['everyone', 'Everyone'],
]

const CAUSES: [LinkStatus, string][] = [
  ['broken', 'The page does not load at all — 404, timeout, or the host has gone'],
  ['moved', 'It redirects somewhere else. Still works, but the address on file is stale'],
  ['auth', 'It now asks for a login that the searchers do not have'],
  ['slow', 'It answers, but slowly enough to hold up a search'],
  ['none', 'No address on file. Nothing to check, and nothing for the searcher to open'],
]

function LinkMonitor() {
  const staff = useStaff()
  const { me } = useSession()
  const locked = linkCheckRefusal(me)
  const mayEdit = !locked
  const navigate = useGo()
  const { openModal, closeModal, toast } = useUi()
  const { counties, check } = useCoverage()
  const broken = useRef<HTMLHeadingElement>(null)
  const schedule = useRef<HTMLHeadingElement>(null)

  const stats = linkStats()
  const bad = useBrokenLinks()
  const due = now() >= nextLinkCheck()
  const sinceLast = daysSince(check.last)
  const lastRun = sinceLast === 0 ? 'today' : `${sinceLast} days ago`

  const byCause = CAUSES.map(([s]) => [s, bad.filter((x) => x.l.s === s)] as const).filter(
    ([, list]) => list.length,
  )

  const admins = staff.filter((s) => s.r === 'admin' && s.active !== false).map((s) => s.n)
  const countiesHit = new Set(bad.map((x) => x.c.n)).size

  const toCoverage = (f?: 'ok' | 'gap') =>
    navigate({ to: '/counties', search: f ? { f } : {} })

  const runNow = () => {
    const { refused, checked } = runLinkCheck(me)
    const stillBroken = linkStats().bad
    toast(
      refused ??
      (checked
        ? `Checked — ${checked} link${checked === 1 ? '' : 's'} resolved, ${stillBroken} still not working`
        : `Checked — nothing new, ${stillBroken} still not working`),
    )
  }

  const fix = (x: FlatLink) =>
    openModal({
      title: `${x.lbl} link — ${x.c.n}, ${x.c.st}`,
      body: (
        <FixLink
          county={x.c}
          type={{ k: x.k, n: x.lbl, req: false, note: '' }}
          onCancel={closeModal}
          onDone={(message) => {
            closeModal()
            toast(message)
          }}
        />
      ),
    })

  return (
    <>
      <PageHead
        title="Link monitor"
        sub={`Every county link is checked every ${check.every} days. Anything that stops working is reported here.`}
        actions={
          <>
            <Btn variant="ghost" onClick={() => toCoverage()}>
              County coverage
            </Btn>
            {mayEdit ? <Btn onClick={runNow}>Run the check now</Btn> : null}
          </>
        }
      />

      {bad.length ? (
        <Banner
          kind="d"
          icon="⚑"
          title={`${bad.length} link${bad.length === 1 ? ' is' : 's are'} not working`}
        >
          Across {countiesHit} {countiesHit === 1 ? 'county' : 'counties'}. A searcher working{' '}
          {bad.length === 1 ? 'that county' : 'those counties'} is doing it without the portal.
          <div className="bs">
            Found by the check that ran {lastRun}. Notifying{' '}
            <b>{check.notify === 'admins' ? 'company admins' : check.notify}</b>.
          </div>
        </Banner>
      ) : (
        <Banner kind="v" icon="✓" title="Every link is working">
          Last checked {lastRun}.
        </Banner>
      )}

      <Kpis>
        <Kpi
          title="Links on file"
          value={stats.covered}
          detail={`of ${stats.total} possible across ${counties.length} counties`}
          icon="›"
          hint="Every county"
          onClick={() => toCoverage()}
        />
        <Kpi
          title="Working"
          value={<span className="ok">{stats.by.ok}</span>}
          detail={`${stats.covered ? Math.round((stats.by.ok / stats.covered) * 100) : 0}% of what we hold`}
          icon="›"
          hint="Counties with every link working"
          onClick={() => toCoverage('ok')}
        />
        <Kpi
          title="Not working"
          value={<span className={stats.bad ? 'bad' : 'ok'}>{stats.bad}</span>}
          tone={stats.bad ? 'alert' : undefined}
          detail={stats.bad ? 'listed below' : 'none'}
          icon="›"
          hint={stats.bad ? 'What is broken and why' : 'Every county'}
          onClick={() => (stats.bad ? focusElement(broken.current) : toCoverage())}
        />
        <Kpi
          title="No link at all"
          value={<span className={stats.by.none ? 'warn' : 'gr'}>{stats.by.none}</span>}
          tone={stats.by.none ? 'warn' : undefined}
          detail="nothing to check"
          icon="›"
          hint="Counties missing an address"
          onClick={() => toCoverage('gap')}
        />
        <Kpi
          title="Next check"
          value={
            <span style={{ fontSize: 'var(--t-h2)' }}>{due ? 'Due now' : fmtDate(nextLinkCheck())}</span>
          }
          tone={due ? 'warn' : undefined}
          detail={`every ${check.every} days`}
          icon="›"
          hint="How the check runs"
          onClick={() => focusElement(schedule.current)}
        />
      </Kpis>

      {bad.length ? (
        <>
          <div ref={broken}>
            <SectionHead>What is broken, grouped by what went wrong</SectionHead>
          </div>
          {byCause.map(([s, list]) => (
            <Card key={s} bottom={13}>
              <CardHead
                title={LSTATE[s][0]}
                actions={
                  <Chip kind={LSTATE[s][1]}>
                    {list.length} link{list.length === 1 ? '' : 's'}
                  </Chip>
                }
              />
              <FlexTable
                cols={BROKEN_COLS}
                min={820}
                head={['County', 'Link', 'What happened', 'Broken for', '']}
                wrap="none"
              >
                {list.map((x) => (
                  <FlexRow key={`${x.c.st}-${x.c.n}-${x.k}`}>
                    <Cell>
                      <div className="v">
                        <b>{x.c.n}</b>
                      </div>
                      <div className="s">{x.c.st}</div>
                    </Cell>
                    <Cell>
                      <div className="v">{x.lbl}</div>
                    </Cell>
                    <Cell>
                      <div className="v" style={{ fontSize: 'var(--t-small)' }}>
                        {x.l.err || '—'}
                      </div>
                      <div className="s mono" style={{ fontSize: 'var(--t-label)' }}>
                        {x.l.u ? <WebLink address={x.l.u} /> : 'no address'}
                      </div>
                    </Cell>
                    <Cell>
                      <div
                        className={`v mono ${x.l.since && daysSince(x.l.since) > 7 ? 'bad' : 'warn'}`}
                      >
                        {x.l.since ? `${daysSince(x.l.since)} days` : '—'}
                      </div>
                    </Cell>
                    <Cell>
                      {mayEdit ? (
                        <Btn
                          variant="ghost"
                          small
                          aria-label={`Fix the ${x.lbl} link for ${x.c.n}`}
                          onClick={() => fix(x)}
                        >
                          Fix
                        </Btn>
                      ) : null}
                    </Cell>
                  </FlexRow>
                ))}
              </FlexTable>
            </Card>
          ))}
        </>
      ) : null}

      <div ref={schedule}>
        <SectionHead>The check</SectionHead>
      </div>
      <div className="two">
        <Card padded>
          <Label>Schedule</Label>
          <Fields>
            <Field
              label="Run every"
              hint="County portals change without warning. Three days keeps it fresh without hammering them."
            >
              <Select
                field
                id="lc-e"
                disabled={!!locked}
                aria-describedby={locked ? 'lc-locked' : undefined}
                value={String(check.every)}
                onChange={(v) => {
                  const refused = setCheckEvery(me, Number(v))
                  if (refused) toast(refused)
                }}
                options={EVERY.map((d) => [String(d), `${d} day${d === 1 ? '' : 's'}`] as const)}
              />
            </Field>
            <Field label="Tell" hint={<>Currently {admins.join(', ') || 'nobody'}.</>}>
              <Select
                field
                id="lc-n"
                disabled={!!locked}
                aria-describedby={locked ? 'lc-locked' : undefined}
                value={check.notify}
                onChange={(v) => {
                  const refused = setCheckNotify(me, v)
                  if (refused) toast(refused)
                }}
                options={NOTIFY}
              />
            </Field>
          </Fields>
          {locked ? (
            <Note id="lc-locked" top={10}>
              {locked}
            </Note>
          ) : null}

          <div style={{ marginTop: 16 }}>
            <Rows>
              <Row
                icon={<span className="gr">·</span>}
                title="Last run"
                detail={`${fmtDT(check.last)} ${TZ}`}
                right={
                  <span className="gr mono" style={{ fontSize: 'var(--t-label)' }}>
                    {sinceLast === 0 ? 'today' : `${sinceLast}d ago`}
                  </span>
                }
              />
              <Row
                icon={<span className={due ? 'warn' : 'gr'}>·</span>}
                title="Next run"
                detail={fmtDate(nextLinkCheck())}
                right={
                  <span className={`${due ? 'warn' : 'gr'} mono`} style={{ fontSize: 'var(--t-label)' }}>
                    {due ? 'due now' : 'scheduled'}
                  </span>
                }
              />
            </Rows>
          </div>
        </Card>

        <Card padded>
          <Label>What counts as broken</Label>
          <Rows>
            {CAUSES.map(([s, what]) => (
              <div className="rw tagged" key={s}>
                <span>
                  <Chip kind={LSTATE[s][1]}>{LSTATE[s][0]}</Chip>
                </span>
                <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
                  {what}
                </span>
                <span />
              </div>
            ))}
          </Rows>
          <Note top={12}>
            A redirect is reported rather than followed silently — a county that moved its portal
            usually changed how the search works too.
          </Note>
        </Card>
      </div>
    </>
  )
}

export default function LinkMonitorRoute() {
  return (
    <ErrorBoundary what="Link monitor">
      <LinkMonitor />
    </ErrorBoundary>
  )
}
