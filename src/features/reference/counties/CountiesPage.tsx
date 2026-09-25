import { useMemo, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { useGo } from '@/shared/hooks/useGo'
import { Banner } from '@/shared/ui/Banner'
import { Btn, Pill, Press } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Controls'
import { WebLink } from '@/shared/ui/WebLink'
import { Chip } from '@/shared/ui/Chip'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { PageHead } from '@/shared/ui/PageHead'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { useNotBuilt } from '@/shared/hooks/useNotBuilt'
import { useUi } from '@/shared/ui/UiProvider'
import { useSession } from '@/domain/auth/SessionProvider'
import { webHref, daysSince } from '@/shared/lib/format'
import { COUNTY_EDITOR, LINK_TYPE_EDITOR, countyName, useCoverage } from '@/domain/counties/counties'
import { refusal } from '@/domain/auth/permissions'
import { LSTATE, brokenLinks, linkGaps, linkStats } from '@/domain/counties/links'
import { csvName, downloadCSV } from '@/shared/lib/csv'
import { CountyForm } from '@/features/reference/counties/forms/CountyForm'
import { FixLink } from '@/shared/ui/FixLink'
import { LinkTypes, type LtView } from './LinkTypes'
import type { County } from '@/data/types'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { Note } from '@/shared/ui/Layout'

type Filter = 'all' | 'bad' | 'gap' | 'ok'

function Counties() {
  const navigate = useGo()
  const { openModal, closeModal, toast } = useUi()
  const { can, me } = useSession()
  const notBuilt = useNotBuilt()
  const { counties, linkTypes, check } = useCoverage()
  const search = useSearch({ from: '/counties' })
  const [query, setQuery] = useState('')

  const FILTERS: Filter[] = ['all', 'bad', 'gap', 'ok']
  const filter: Filter = FILTERS.includes(search.f as Filter) ? (search.f as Filter) : 'all'
  const setFilter = (f: Filter) =>
    navigate({ to: '/counties', search: f === 'all' ? {} : { f }, replace: true })

  const isAdmin = can(COUNTY_EDITOR)
  const editsTypes = can(LINK_TYPE_EDITOR)
  const readOnly = isAdmin ? null : refusal(me, COUNTY_EDITOR, 'Changing a county record')
  const linkOf = (c: County, k: string) => c.links[k] ?? { u: '', s: 'none' as const }

  const counts = useMemo(() => {
    return {
      all: counties.length,
      bad: counties.filter((c) => linkGaps(c).broken.length > 0).length,
      gap: counties.filter((c) => linkGaps(c).missing.length > 0).length,
      ok: counties.filter((c) => linkTypes.every((t) => linkOf(c, t.k).s === 'ok')).length,
    }
  }, [counties, linkTypes])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return counties.filter((c) => {
      const states = linkTypes.map((t) => linkOf(c, t.k).s)
      const passes =
        filter === 'all'
          ? true
          : filter === 'bad'
            ? linkGaps(c).broken.length > 0
            : filter === 'gap'
              ? linkGaps(c).missing.length > 0
              : states.every((s) => s === 'ok')
      if (!passes) return false
      return !q || c.n.toLowerCase().includes(q) || c.st.toLowerCase().includes(q)
    })
  }, [counties, linkTypes, filter, query])

  const stats = linkStats()
  const bad = brokenLinks()

  const cols = `150px 70px 120px repeat(${linkTypes.length}, minmax(120px, 1fr)) 100px`

  const exportCounties = () =>
    downloadCSV(csvName('counties'), [
      ['County', 'State', 'Index from', ...linkTypes.flatMap((t) => [t.n, `${t.n} status`])],
      ...rows.map((c) => [
        c.n,
        c.st,
        c.idx ?? 'manual',
        ...linkTypes.flatMap((t) => [linkOf(c, t.k).u, LSTATE[linkOf(c, t.k).s][0]]),
      ]),
    ])

  const editCounty = (county: County | null) =>
    openModal({
      title: county ? `${countyName(county.n, county.st)}, ${county.st}` : 'Add a county',
      body: (
        <CountyForm
          county={county}
          onCancel={closeModal}
          onDone={() => {
            closeModal()
            toast(county ? `${county.n} saved` : 'County added')
          }}
        />
      ),
    })

  const fixLink = (county: County, k: string) => {
    const type = linkTypes.find((t) => t.k === k)
    if (!type) return
    openModal({
      title: `${type.n} link — ${county.n}, ${county.st}`,
      body: (
        <FixLink
          county={county}
          type={type}
          onCancel={closeModal}
          onDone={(message) => {
            closeModal()
            toast(message)
          }}
        />
      ),
    })
  }

  const manageTypes = (view: LtView = { at: 'list' }): void => {
    const named = view.at !== 'list' && view.k ? linkTypes.find((t) => t.k === view.k)?.n : null
    const title =
      view.at === 'confirm'
        ? `Remove ${named ?? 'link type'}?`
        : view.at === 'edit'
          ? named
            ? `Edit ${named}`
            : 'Add a link type'
          : 'Link types'

    openModal({
      title,
      body: <LinkTypes view={view} onView={manageTypes} onClose={closeModal} />,
    })
  }

  const PILLS: [Filter, string, number][] = [
    ['all', 'All', counts.all],
    ['bad', 'Broken links', counts.bad],
    ['gap', 'Missing links', counts.gap],
    ['ok', 'All working', counts.ok],
  ]

  return (
    <>
      <PageHead
        title="County coverage"
        sub="Your own county record — this workspace maintains it, and nobody else can see or change it."
        actions={
          <>
            {editsTypes ? (
              <Btn variant="ghost" onClick={() => manageTypes()}>
                Link types
              </Btn>
            ) : null}
            <Btn variant="ghost" onClick={() => navigate({ to: '/linkcheck' })}>
              Link monitor
            </Btn>
            {isAdmin ? (
              <>
                <Btn
                  variant="ghost"
                  onClick={() => notBuilt('Importing a CSV', 'a file picker and a column mapper', exportCounties)}
                >
                  Import CSV
                </Btn>
                <Btn onClick={() => editCounty(null)}>＋ Add county</Btn>
              </>
            ) : null}
          </>
        }
      />

      {bad.length ? (
        <Banner
          kind="d"
          icon="⚑"
          title={`${bad.length} link${bad.length === 1 ? '' : 's'} stopped working`}
          actions={
            <Btn variant="ghost" small onClick={() => navigate({ to: '/linkcheck' })}>
              See them
            </Btn>
          }
        >
          {[...new Set(bad.map((x) => x.c.n))].join(', ')}. Found by the check{' '}
          {daysSince(check.last) === 0 ? 'today' : `${daysSince(check.last)} days ago`}.
        </Banner>
      ) : null}

      <Kpis>
        <Kpi
          title="Counties on file"
          value={counties.length}
          detail="across every state we search"
          icon="›"
          hint="Show all counties"
          onClick={() => setFilter('all')}
        />
        <Kpi
          title="Links held"
          value={
            <>
              {stats.covered}
              <span className="gr" style={{ fontSize: 'var(--t-lead)' }}> / {stats.total}</span>
            </>
          }
          detail={`${linkTypes.length} per county`}
          icon="›"
          hint="Counties with every link working"
          onClick={() => setFilter('ok')}
        />
        <Kpi
          title="Not working"
          value={<span className={stats.bad ? 'bad' : 'ok'}>{stats.bad}</span>}
          tone={stats.bad ? 'alert' : undefined}
          detail={stats.bad ? 'needs attention' : 'all good'}
          icon="›"
          hint="Filter to broken links"
          onClick={() => setFilter('bad')}
        />
        <Kpi
          title="Missing"
          value={<span className={stats.by.none ? 'warn' : 'gr'}>{stats.by.none}</span>}
          tone={stats.by.none ? 'warn' : undefined}
          detail="no address on file"
          icon="›"
          hint="Filter to missing links"
          onClick={() => setFilter('gap')}
        />
      </Kpis>

      <div className="fbar" style={{ marginTop: 16 }} role="group" aria-label="Which counties">
        {PILLS.map(([k, label, n]) => (
          <Pill key={k} urgent={k === 'bad' && !!n} on={filter === k} count={n} onClick={() => setFilter(k)}>
            {label}
          </Pill>
        ))}
        <div className="sp">
          <Input
            label="Search counties"
            type="search"
            placeholder="Search county or state"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <p className="cnt">
        <span>ⓘ</span> Showing <b>{rows.length}</b> of <b>{counties.length}</b> counties
      </p>

      <FlexTable
        cols={cols}
        min={1000}
        head={['County', 'State', 'Index from', ...linkTypes.map((t) => t.n), '']}
        wrap="tbl"
      >
        {rows.length ? (
          rows.map((c) => (
            <FlexRow key={`${c.st}-${c.n}`}>
              <Cell>
                <div className="v">
                  <b>{c.n}</b>
                </div>
              </Cell>
              <Cell>
                <div className="v mono">{c.st}</div>
              </Cell>
              <Cell>
                <div className={`v mono ${c.idx ? '' : 'warn'}`}>{c.idx ?? 'manual'}</div>
              </Cell>
              {linkTypes.map((t) => {
                const l = linkOf(c, t.k)
                return (
                  <Cell key={t.k}>
                    {isAdmin ? (
                      <Press
                        style={{ font: 'inherit', textAlign: 'left' }}
                        title={l.err || l.u || 'no link on file'}
                        label={`${LSTATE[l.s][0]} — ${t.n} for ${c.n}`}
                        onClick={() => fixLink(c, t.k)}
                      >
                        <Chip kind={LSTATE[l.s][1]}>{LSTATE[l.s][0]}</Chip>
                        {l.since ? <div className="s bad">{daysSince(l.since)}d</div> : null}
                      </Press>
                    ) : (
                      <>
                        <Chip kind={LSTATE[l.s][1]}>{LSTATE[l.s][0]}</Chip>
                        {l.since ? <div className="s bad">{daysSince(l.since)}d</div> : null}
                      </>
                    )}
                    {webHref(l.u) ? (
                      <div className="s">
                        <WebLink address={l.u} about={`${t.n} for ${c.n}`}>
                          Open
                        </WebLink>
                      </div>
                    ) : null}
                  </Cell>
                )
              })}
              <Cell>
                {isAdmin ? (
                  <Btn
                    variant="ghost"
                    small
                    aria-label={`Edit ${c.n}, ${c.st}`}
                    onClick={() => editCounty(c)}
                  >
                    Edit
                  </Btn>
                ) : null}
              </Cell>
            </FlexRow>
          ))
        ) : (
          <div className="empty">
            <span className="ei">◈</span>
            <p>
              {query.trim()
                ? `No county matches “${query.trim()}” under this filter.`
                : 'No counties match this filter.'}
            </p>
            {filter !== 'all' || query.trim() ? (
              <Btn
                small
                onClick={() => {
                  setFilter('all')
                  setQuery('')
                }}
              >
                Show every county
              </Btn>
            ) : (
              <Btn small onClick={() => editCounty(null)}>
                ＋ Add the first county
              </Btn>
            )}
          </div>
        )}
      </FlexTable>

      <Note top={12}>
        {isAdmin ? 'Click any status to see the address and fix it. ' : ''}All {linkTypes.length} types are checked
        automatically every {check.every} days
        {editsTypes ? (
          <>
            {' — '}
            <Press className="br" style={{ fontWeight: 600 }} onClick={() => manageTypes()}>
              add another type
            </Press>{' '}
            and every county gets a slot for it
          </>
        ) : null}
        .{readOnly ? ` ${readOnly}` : ''}
      </Note>
    </>
  )
}

export default function CountiesRoute() {
  return (
    <ErrorBoundary what="County coverage">
      <Counties />
    </ErrorBoundary>
  )
}
