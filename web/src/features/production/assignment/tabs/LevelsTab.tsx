import { useStageName } from '@/domain/company/naming'
import { Banner, Empty } from '@/shared/ui/Banner'
import { Btn, Pill } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Rows } from '@/shared/ui/DetailList'
import { useLevels } from '@/domain/assignment/levels'
import { useUi } from '@/shared/ui/UiProvider'
import { EVERYSTATE, levelMoves, type Gap } from '@/domain/assignment/qualification'
import { COVSTAGES, PRIOR_COVERAGE } from '@/data/org'
import { PRODUCTS } from '@/data/catalog'
import { openExceptions } from '@/domain/orders/orders'
import { useStaff, findPerson } from '@/domain/people/roster'
import { LevelCoverage } from '@/features/production/assignment/LevelCoverage'
import { LevelPeople } from '@/features/production/assignment/LevelPeople'
import { gapWhere, gapsSentence, levelsNoticeTitle } from '@/features/production/assignment/levelsText'
import { useSession } from '@/domain/auth/SessionProvider'
import { Note } from '@/shared/ui/Layout'

export function LevelsTab() {
  const staff = useStaff()
  const stageName = useStageName()
  const { me } = useSession()
  const lv = useLevels(me)
  const { openModal, closeModal, toast } = useUi()
  const { levels, selected, select, onLevel, allStates, coverageGaps, personLevel } = lv

  const level = levels.find((l) => l.id === selected) ?? levels[0]
  const gaps = coverageGaps()
  const eligible = staff.filter((x) => x.dep.some((d) => COVSTAGES.includes(d)) && x.active !== false)
  const ungraded = eligible.filter((x) => !personLevel(x.id))
  const covExc = openExceptions().filter((e) => e.why === 'coverage')

  const moves = levelMoves(
    PRIOR_COVERAGE,
    (id) => levels.find((l) => l.id === personLevel(id)) ?? null,
    eligible,
  )

  const showMoves = () =>
    openModal({
      title: `Coverage that changed — ${moves.length}`,
      body: (
        <>
          <Rows>
            {moves.map((m) => (
              <div className="rw" key={m.id}>
                <span className="gr">·</span>
                <span>
                  <b>
                    {m.n} → {m.lvl}
                  </b>
                  <div className="sd gr">was {m.before}</div>
                </span>
                <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
                  {m.after}
                </span>
              </div>
            ))}
          </Rows>
          <Note top={14}>
            Each person was put on the level nearest their old coverage, which is rarely an exact fit.
            Anyone who now covers <b>less</b> than they did may start seeing work hold as an exception;
            anyone who covers <b>more</b> may be given something they have not done before. Both are
            worth a minute.
          </Note>
        </>
      ),
      footer: <Btn onClick={closeModal}>Close</Btn>,
    })

  const showGaps = (kind: Gap['kind']) => {
    const list = gaps.filter((g) => g.kind === kind)
    const noun = kind === 'place' ? 'county' : 'product'
    if (!list.length)
      return openModal({
        title: `Every ${noun} is covered`,
        body: (
          <>
            <Rows>
              {COVSTAGES.map((s) => (
                <div className="rw" key={s}>
                  <span className="ok">✓</span>
                  <span>
                    <b>{stageName(s)}</b>
                    <div className="sd">
                      {kind === 'place'
                        ? `all ${lv.counties.length} counties have somebody`
                        : `all ${PRODUCTS.length} products have somebody`}
                    </div>
                  </span>
                  <span />
                </div>
              ))}
            </Rows>
            <Note top={14}>
              Nothing will hold for want of somebody qualified. This is the number to watch when you narrow
              someone — it is the first thing that moves.
            </Note>
          </>
        ),
      })

    openModal({
      title: `No ${kind === 'place' ? 'counties' : 'products'} cover — ${list.length}`,
      body: (
        <>
          <Rows>
            {list.map((g, i) => (
              <div className="rw" key={i}>
                <span className="bad">⚑</span>
                <span>
                  <b>
                    {stageName(g.stage)} · {gapWhere(g)}
                  </b>
                  <div className="sd">
                    {g.kind === 'place'
                      ? g.near.length
                        ? `${g.near.length} cover ${g.st} elsewhere — ${g.near
                            .slice(0, 3)
                            .map((id) => findPerson(staff, id)?.n)
                            .join(', ')}`
                        : `nobody covers ${g.st} at all`
                      : 'nobody in this stage works it'}
                  </div>
                </span>
                <span>
                  <Chip kind="d">gap</Chip>
                </span>
              </div>
            ))}
          </Rows>
          <Note top={14}>
            Each of these becomes an exception the moment an order arrives for it. Closing the gap is widening
            somebody's coverage, or hiring for it.
          </Note>
        </>
      ),
      footer: <Btn onClick={closeModal}>Close</Btn>,
    })
  }

  if (!levels.length || !level)
    return (
      <Card>
        <Empty
          icon="◈"
          action={
            <Btn small onClick={() => { lv.addLevel(); toast('Level 1 added — it covers nothing until you say what') }}>
              ＋ Create the first level
            </Btn>
          }
        >
          No levels yet. A level is one coverage — the products, states and counties everyone on it can be given.
        </Empty>
      </Card>
    )

  const prodsOn = level.products === 'all' ? PRODUCTS.length : level.products.length
  const chosenStates = level.states === 'all' ? EVERYSTATE() : level.states
  const rest = EVERYSTATE().filter((x) => !chosenStates.includes(x))
  const shownStates = level.states === 'all' ? allStates() : level.states
  const held = onLevel(level.id)

  return (
    <>
      <div className="fbar" role="group" aria-label="Levels">
        {levels.map((l) => (
          <Pill key={l.id} on={l.id === level.id} count={onLevel(l.id).length} onClick={() => select(l.id)}>
            {l.n}
          </Pill>
        ))}
        <div className="sp">
          <Btn small onClick={() => { lv.addLevel(); toast('Level added — it covers nothing until you say what') }}>
            ＋ New level
          </Btn>
        </div>
      </div>

      {covExc.length || gaps.length || moves.length ? (
        <Banner
          kind={covExc.length ? 'r' : 'd'}
          icon="⚑"
          title={levelsNoticeTitle(covExc.length, gaps.length, moves.length)}
          actions={
            <>
              {gaps.some((g) => g.kind === 'place') ? (
                <Btn variant="ghost" small onClick={() => showGaps('place')}>
                  {gaps.some((g) => g.kind !== 'place') ? 'County gaps' : 'The gaps'}
                </Btn>
              ) : null}
              {gaps.some((g) => g.kind !== 'place') ? (
                <Btn variant="ghost" small onClick={() => showGaps('product')}>
                  {gaps.some((g) => g.kind === 'place') ? 'Product gaps' : 'The gaps'}
                </Btn>
              ) : null}
              {moves.length ? (
                <Btn variant="ghost" small onClick={showMoves}>
                  What moved
                </Btn>
              ) : null}
            </>
          }
        >
          {gapsSentence(gaps)}
          {covExc.length ? ' Held work is on the Exceptions tab.' : ''}
        </Banner>
      ) : null}

      <LevelCoverage
        lv={lv}
        level={level}
        prodsOn={prodsOn}
        chosenStates={chosenStates}
        rest={rest}
        shownStates={shownStates}
        held={held}
      />

      <LevelPeople lv={lv} level={level} held={held} eligible={eligible} ungraded={ungraded} />
    </>
  )
}
