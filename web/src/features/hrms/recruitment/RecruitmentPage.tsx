import { useStageName } from '@/domain/company/naming'
import { useState } from 'react'
import { Banner } from '@/shared/ui/Banner'
import { Btn, Pill, Press } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { PageHead, SectionHead } from '@/shared/ui/PageHead'
import { Rows } from '@/shared/ui/DetailList'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { RequireCap } from '@/shared/ui/RequireCap'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { HIRESTAGES } from '@/data/hrms'
import { fmtDate } from '@/shared/lib/format'
import { OpeningForm } from '@/features/hrms/recruitment/forms/OpeningForm'
import { addOpening, moveCandidate, nextStage, useBoard } from './hiring'
import type { Candidate, HireStage, Opening } from '@/data/types'
import { Inline, Note } from '@/shared/ui/Layout'

const COLUMN_MIN = 168

const SHOWN_PER_STAGE = 5

function CandidateCard({ c, onMove }: { c: Candidate; onMove: (c: Candidate) => void }) {
  return (
    <Press
      onClick={() => onMove(c)}
      label={`${c.n}, ${c.exp} yr${c.exp === 1 ? '' : 's'} · ${c.src}${c.note ? ` — ${c.note}` : ''}`}
      title={`Move ${c.n} on`}
      style={{
        textAlign: 'left',
        background: 'var(--tint)',
        border: '1px solid var(--hair)',
        borderRadius: 9,
        padding: '9px 11px',
        width: '100%',
      }}
    >
      <div style={{ fontSize: 'var(--t-small)', fontWeight: 650 }}>{c.n}</div>
      <div className="gr" style={{ fontSize: 'var(--t-label)' }}>
        {c.exp} yr{c.exp === 1 ? '' : 's'} · {c.src}
      </div>
      {c.note ? (
        <div className="gr" style={{ fontSize: 'var(--t-label)', marginTop: 3 }}>
          {c.note}
        </div>
      ) : null}
    </Press>
  )
}

function StageColumn({
  stage,
  list,
  onMove,
}: {
  stage: HireStage
  list: Candidate[]
  onMove: (c: Candidate) => void
}) {
  return (
    <div style={{ flex: 1, minWidth: COLUMN_MIN }}>
      <Inline justify="space-between" style={{ marginBottom: 9 }}>
        <b style={{ fontSize: 'var(--t-small)' }}>{stage}</b>
        <span className="mono gr" style={{ fontSize: 'var(--t-label)' }}>
          {list.length}
        </span>
      </Inline>
      <Inline align={false} gap={7} style={{ flexDirection: 'column' }}>
        {list.length ? (
          list
            .slice(0, SHOWN_PER_STAGE)
            .map((c) => <CandidateCard key={c.id} c={c} onMove={onMove} />)
        ) : (
          <div className="gr" style={{ fontSize: 'var(--t-label)', padding: '8px 0' }}>
            nobody
          </div>
        )}
        {list.length > SHOWN_PER_STAGE ? (
          <div className="gr" style={{ fontSize: 'var(--t-label)' }}>
            and {list.length - SHOWN_PER_STAGE} more
          </div>
        ) : null}
      </Inline>
    </div>
  )
}

function Recruitment() {
  const stageName = useStageName()
  const { me } = useSession()
  const { openModal, closeModal, toast } = useUi()
  const { candidates, openings } = useBoard()
  const [job, setJob] = useState('all')

  const active = job === 'all' || openings.some((o) => o.id === job) ? job : 'all'
  const shown = candidates.filter((c) => active === 'all' || c.job === active)
  const seats = openings.reduce((a, o) => a + o.n, 0)

  const pillLabel = (o: Opening) =>
    openings.filter((x) => x.dep === o.dep).length > 1 ? o.title : stageName(o.dep)

  const askMove = (c: Candidate) => {
    const next = nextStage(c.stage)
    if (!next) return toast(`${c.n} has already joined`)

    openModal({
      title: `Move ${c.n} to ${next}?`,
      body: (
        <>
          <Note plain size="body">
            {c.n} · {c.exp} year{c.exp === 1 ? '' : 's'} · from {c.src}
            {c.note ? ` · ${c.note}` : ''}
          </Note>
          {next === 'Joined' ? (
            <Banner kind="b" icon="◔" margin="12px 0 0">
              Marking someone joined would create their staff record, department and salary.{' '}
              <b>That step is not available yet</b> — it needs the offer figures, which live outside
              this screen.
            </Banner>
          ) : null}
        </>
      ),
      footer: (
        <>
          <Btn variant="ghost" onClick={closeModal}>
            Cancel
          </Btn>
          <Btn
            onClick={() => {
              const refused = moveCandidate(me, c.id)
              closeModal()
              toast(refused ?? `${c.n} → ${next}`)
            }}
          >
            Move to {next}
          </Btn>
        </>
      ),
    })
  }

  const raise = () =>
    openModal({
      title: 'New opening',
      body: (
        <OpeningForm
          raisedBy={me.n}
          onCancel={closeModal}
          onSubmit={(draft) => {
            const { refused } = addOpening(me, draft)
            closeModal()
            if (refused) return toast(refused)
            toast(`${draft.title.trim()} — ${draft.n} seat${draft.n === 1 ? '' : 's'} open`)
          }}
        />
      ),
    })

  return (
    <>
      <PageHead
        title="Recruitment"
        sub={`${seats} position${seats === 1 ? '' : 's'} open across ${openings.length} role${
          openings.length === 1 ? '' : 's'
        } · ${shown.length} ${shown.length === 1 ? 'person' : 'people'} in the pipeline`}
        actions={<Btn onClick={raise}>＋ New opening</Btn>}
      />

      <div className="fbar" role="group" aria-label="Which role">
        <Pill on={active === 'all'} count={candidates.length} onClick={() => setJob('all')}>
          All roles
        </Pill>
        {openings.map((o) => (
          <Pill
            key={o.id}
            on={active === o.id}
            count={candidates.filter((c) => c.job === o.id).length}
            onClick={() => setJob(o.id)}
            title={`${o.title} — ${stageName(o.dep)}`}
          >
            {pillLabel(o)}
          </Pill>
        ))}
      </div>

      <SectionHead>The pipeline</SectionHead>
      <Card padded>
        {shown.length ? (
          <Inline className="xscroll" gap={10} align={false}>
            {HIRESTAGES.map((st) => (
              <StageColumn
                key={st}
                stage={st}
                list={shown.filter((c) => c.stage === st)}
                onMove={askMove}
              />
            ))}
          </Inline>
        ) : (
          <Note size="body" margin={0}>
            Nobody has applied to this role yet. The pipeline fills as candidates come in against
            it.
          </Note>
        )}
        <Note top={12}>
          Click anyone to move them a stage on. Marking someone joined does not create their staff
          record yet — add them under Company → Staff once the offer is signed.
        </Note>
      </Card>

      <SectionHead>Open positions</SectionHead>
      <Card>
        <Rows bare>
          {openings.map((o) => {
            const mine = candidates.filter((c) => c.job === o.id)
            const atOffer = mine.filter(
              (c) => c.stage === 'Offer' || c.stage === 'Verification',
            ).length
            return (
              <div className="rw" key={o.id}>
                <span className="br">{o.n}</span>
                <span>
                  <b>{o.title}</b>
                  <div className="sd">
                    {stageName(o.dep)} · {o.type} · opened {fmtDate(o.open)} by {o.by}
                  </div>
                  <div className="sd gr" style={{ marginTop: 4 }}>
                    {o.why}
                  </div>
                </span>
                <span className="mono gr" style={{ fontSize: 'var(--t-label)' }}>
                  {mine.length} in pipeline
                  <br />
                  {atOffer} at offer
                </span>
              </div>
            )
          })}
        </Rows>
      </Card>
      <Note top={10}>
        Every opening carries why it exists. A req without a reason is how headcount grows without
        anyone deciding to grow it.
      </Note>
    </>
  )
}

export default function RecruitmentRoute() {
  return (
    <RequireCap cap="people">
      <ErrorBoundary what="Recruitment">
        <Recruitment />
      </ErrorBoundary>
    </RequireCap>
  )
}
