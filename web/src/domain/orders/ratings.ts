import { stageName } from '@/domain/company/naming'
import { PAIRS, STAGES } from '@/data/org'
import type { QcEntry } from '@/data/quality'
import { can, refusal } from '@/domain/auth/permissions'
import { wouldSelfReview } from '@/domain/assignment/narrow'
import { whoName } from '@/domain/people/roster'
import { ruleOn } from '@/domain/quality/qcRules'
import { QC_CRITERIA } from '@/domain/quality/quality'
import { now } from '@/shared/lib/clock'
import {
  change,
  logged,
  orderAsEdited,
  orderById,
  orderStates,
  ratingAverage,
  ratingComplete,
  ratingsOf,
  type EditedOrder,
  type OrderActor,
  type StageRating,
  type StoredRating,
} from './orders'

const checkerOf = (stage: string): string | null =>
  Object.entries(PAIRS).find(([, work]) => work === stage)?.[0] ?? null

const workedOn = (o: Pick<EditedOrder, 'a'>) => STAGES.filter((s) => o.a[s])

export function rateRefusal(actor: OrderActor, o: Pick<EditedOrder, 'id' | 'a'>, stage: string): string | null {
  const refused = refusal(actor, 'qc', 'Entering QC ratings')
  if (refused) return refused
  if (!o.a[stage]) return `Nobody worked ${stageName(stage)} on ${o.id}, so there is nobody to rate.`
  const qc = checkerOf(stage)
  const own = qc ? wouldSelfReview(o.a, qc, actor.id) : o.a[stage] === actor.id ? stage : null
  if (own) return `${stageName(stage)} on ${o.id} is your own work, and nobody rates their own stage.`
  if (can(actor, 'all') || (qc && o.a[qc] === actor.id)) return null
  return qc
    ? `${stageName(stage)} is rated by whoever holds ${stageName(qc)} on ${o.id}${o.a[qc] ? ` (${whoName(o.a[qc])})` : ''}, or by someone who sees every order (the “all” capability).`
    : `${stageName(stage)} has no QC stage checking it, so it is rated by someone who sees every order (the “all” capability).`
}

const counts = (o: Pick<EditedOrder, 'a'>, stage: string, r: StoredRating | undefined): boolean =>
  !!r && ratingComplete(r) && r.who === o.a[stage] && r.by !== o.a[stage]

export function ratedForSending(id: string): boolean {
  const base = orderById(id)
  if (!base) return false
  const o = orderAsEdited(base)
  const ratings = ratingsOf(id)
  const worked = workedOn(o)
  return worked.length > 0 && worked.every((s) => counts(o, s, ratings[s]))
}

export const unratedStages = (o: EditedOrder): string[] =>
  workedOn(o).filter((s) => !counts(o, s, ratingsOf(o.id)[s]))

export function sendingRefusal(id: string): string | null {
  if (!ruleOn('mand') || ratedForSending(id)) return null
  const base = orderById(id)
  const left = base ? unratedStages(orderAsEdited(base)) : []
  if (!left.length) return `QC ratings are required before an order is sent, and nobody has worked ${id} yet, so there is nothing rated. Assign and rate its stages first.`
  return `QC ratings are required before an order is sent, and ${left.map((s) => stageName(s)).join(', ')} ${left.length === 1 ? 'has' : 'have'} no rating from someone other than the person who worked it. Rate it on the Quality tab first.`
}

export function markRated(
  actor: OrderActor,
  id: string,
  ratings: Record<string, StageRating>,
): { ok: true } | { ok: false; why: string } {
  const base = orderById(id)
  if (!base) return { ok: false, why: 'That order is not here.' }
  const o = orderAsEdited(base)
  const stages = Object.keys(ratings)
  if (!stages.length) return { ok: false, why: 'Nothing has been scored yet.' }
  for (const s of stages) {
    const refused = rateRefusal(actor, o, s)
    if (refused) return { ok: false, why: refused }
    if (!ratingComplete(ratings[s])) return { ok: false, why: `${stageName(s)} has not been scored on every criterion.` }
  }
  const at = now()
  const kept = Object.fromEntries(
    stages.flatMap((s) => {
      const r = ratings[s]
      const who = o.a[s]
      return r && who ? [[s, { ...r, who, by: actor.id, at }]] : []
    }),
  )
  const list = Object.values(kept)
  const avg = list.reduce((t, r) => t + ratingAverage(r), 0) / list.length
  const detail = `${stages.map((s) => stageName(s)).join(', ')} · average ${avg.toFixed(1)} across ${list.length} ${list.length === 1 ? 'person' : 'people'}`
  change(id, (w) => ({
    ...w,
    ratings: { ...w.ratings, ...kept },
    events: logged(w, { by: actor.n, what: 'QC rated', detail }),
  }))
  return { ok: true }
}

const lowest = (r: StageRating): [string, number] =>
  QC_CRITERIA.map(([name, f]): [string, number] => [name, r.scores[f] ?? 0]).reduce((a, b) => (b[1] < a[1] ? b : a))

export function sessionQcEntries(): QcEntry[] {
  return Object.entries(orderStates()).flatMap(([id, w]) => {
    const base = orderById(id)
    if (!base || !w.ratings) return []
    const o = orderAsEdited(base)
    return Object.entries(w.ratings).map(([stage, r]): QcEntry => {
      const [crit, min] = lowest(r)
      return {
        d: r.at,
        order: id,
        cl: o.cl,
        pr: o.pr,
        stage,
        on: r.who,
        onName: whoName(r.who),
        by: r.by,
        byName: whoName(r.by),
        acc: r.scores.acc ?? 0,
        comp: r.scores.comp ?? 0,
        fmt: r.scores.fmt ?? 0,
        avg: ratingAverage(r),
        defect: min <= 3,
        crit: min < 5 ? crit : null,
        note: r.comment.trim() || null,
      }
    })
  })
}
