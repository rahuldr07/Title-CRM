import { CANDIDATES, HIRESTAGES, OPENINGS } from '@/data/hrms'
import { createStore, useStore } from '@/shared/lib/store'
import type { Candidate, HireStage, Opening } from '@/data/types'
import { refusal, type Actor, type Saved } from '@/domain/auth/permissions'
import { nextId } from '@/shared/lib/ids'
import { now } from '@/shared/lib/clock'

const HIRING_CAPABILITY = 'people'

const hiringRefusal = (actor: Actor) => refusal(actor, HIRING_CAPABILITY, 'Changing the hiring board')

interface Board {
  candidates: Candidate[]
  openings: Opening[]
}

const store = createStore<Board>({ candidates: CANDIDATES, openings: OPENINGS })

export const useBoard = (): Board => useStore(store)

export const currentBoard = (): Board => store.get()

export const nextStage = (stage: HireStage): HireStage | null =>
  HIRESTAGES[HIRESTAGES.indexOf(stage) + 1] ?? null

export function moveCandidate(actor: Actor, id: string): string | null {
  const refused = hiringRefusal(actor)
  if (refused) return refused
  store.update((board) => ({
    ...board,
    candidates: board.candidates.map((c) => {
      if (c.id !== id) return c
      const next = nextStage(c.stage)
      return next ? { ...c, stage: next } : c
    }),
  }))
  return null
}

export type OpeningDraft = Omit<Opening, 'id' | 'open'>

export type OpeningField = 'title' | 'seats' | 'why'

export function openingProblem(d: Pick<OpeningDraft, 'title' | 'n' | 'why'>): { field: OpeningField; message: string } | null {
  if (!d.title.trim()) return { field: 'title', message: 'A title — it is what a candidate applies to.' }
  if (!Number.isInteger(d.n) || d.n < 1) return { field: 'seats', message: 'At least one seat.' }
  if (d.n > 50) return { field: 'seats', message: `${d.n} seats in one opening is almost certainly a typo.` }
  if (!d.why.trim()) return { field: 'why', message: 'The reason. Whoever approves this did not feel the pressure that caused it.' }
  return null
}

export function addOpening(actor: Actor, draft: OpeningDraft): Saved {
  const refused = hiringRefusal(actor) ?? openingProblem(draft)?.message
  if (refused) return { id: null, refused }
  const id = nextId('J', store.get().openings.map((o) => o.id))
  const opening: Opening = { ...draft, id, title: draft.title.trim(), why: draft.why.trim(), open: now() }
  store.update((board) => ({ ...board, openings: [opening, ...board.openings] }))
  return { id, refused: null }
}

export const resetHiringBoard = store.reset
