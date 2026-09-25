import { LEVELS } from '@/data/org'
import { PRODUCTS } from '@/data/catalog'
import { createStore, useStore } from '@/shared/lib/store'
import { isDuplicateName } from '@/shared/lib/forms'
import { currentStaff, useStaff, personById, findPerson } from '@/domain/people/roster'
import { currentCounties, currentLinkTypes, saveCounty, useCoverage as useCountyBook } from '@/domain/counties/counties'
import { makeCoverage } from './qualification'
import { refusal, type Actor, type Saved } from '@/domain/auth/permissions'
import type { County, Level, Person } from '@/data/types'

type Counted = Level & { counties: Record<string, string[]> }

interface LevelBook {
  levels: Level[]
  moved: Record<string, string | null>
  selected: string | null
}

export type CovKey = 'state' | 'allstates' | 'addstate' | 'nostates' | 'allproducts' | 'noproducts' | 'product'

export type Coverage = ReturnType<typeof makeCoverage>

const clone = (l: Level): Counted => ({
  ...l,
  states: l.states === 'all' ? 'all' : [...l.states],
  products: l.products === 'all' ? 'all' : [...l.products],
  counties: Object.fromEntries(Object.entries(l.counties ?? {}).map(([k, v]) => [k, [...v]])),
})

const store = createStore<LevelBook>({ levels: LEVELS.map(clone), moved: {}, selected: LEVELS[0]?.id ?? null })

const levelIdIn =
  (book: LevelBook, staff: Person[]) =>
  (id: string): string | null =>
    id in book.moved ? (book.moved[id] ?? null) : (findPerson(staff, id)?.lvl ?? null)

export const currentLevels = (): Level[] => store.get().levels

export const personLevelOf = (id: string): string | null => levelIdIn(store.get(), currentStaff())(id)

let memo: { book: LevelBook; counties: County[]; staff: Person[]; cov: Coverage } | null = null

export function currentCoverage(): Coverage {
  const book = store.get()
  const counties = currentCounties()
  const staff = currentStaff()
  if (!memo || memo.book !== book || memo.counties !== counties || memo.staff !== staff) {
    memo = { book, counties, staff, cov: makeCoverage(book.levels, levelIdIn(book, staff), counties, staff) }
  }
  return memo.cov
}

export const coversPlace = (id: string, st: string, co: string | null): boolean =>
  currentCoverage().coversPlace(id, st, co)

export const coversProduct = (id: string, pr: string): boolean => currentCoverage().coversProduct(id, pr)

export const LEVEL_EDITOR = 'assign'

const levelRefusal = (actor: Actor) => refusal(actor, LEVEL_EDITOR, 'Changing a level or who is on it')

const edit = (lid: string, fn: (l: Counted) => void) =>
  store.update((b) => ({
    ...b,
    levels: b.levels.map((l) => {
      if (l.id !== lid) return l
      const next = clone(l)
      fn(next)
      return next
    }),
  }))

const allStateCodes = () => [...new Set(currentCounties().map((c) => c.st))].sort()

const countyNamesIn = (st: string) =>
  currentCounties()
    .filter((c) => c.st === st)
    .map((c) => c.n)
    .sort()

export function setCov(actor: Actor, lid: string, k: CovKey, v?: string): string | null {
  const refused = levelRefusal(actor)
  if (refused) return refused
  edit(lid, (l) => {
    if (k === 'state' && v) {
      if (l.states === 'all') l.states = allStateCodes()
      const has = l.states.includes(v)
      l.states = has ? l.states.filter((x) => x !== v) : [...l.states, v]
      if (has) delete l.counties[v]
    }
    if (k === 'allstates') {
      l.states = 'all'
      l.counties = {}
    }
    if (k === 'addstate' && v) {
      if (l.states === 'all') return
      if (!l.states.includes(v)) l.states = [...l.states, v]
    }
    if (k === 'nostates') {
      l.states = []
      l.counties = {}
    }
    if (k === 'allproducts') l.products = 'all'
    if (k === 'noproducts') l.products = []
    if (k === 'product' && v) {
      if (l.products === 'all') l.products = PRODUCTS.map((x) => x.id)
      l.products = l.products.includes(v) ? l.products.filter((x) => x !== v) : [...l.products, v]
      if (l.products.length === PRODUCTS.length) l.products = 'all'
    }
  })
  return null
}

export function setCounty(actor: Actor, lid: string, st: string, co: string): string | null {
  const refused = levelRefusal(actor)
  if (refused) return refused
  edit(lid, (l) => {
    if (l.states === 'all') l.states = allStateCodes()
    if (!l.states.includes(st)) l.states = [...l.states, st]
    const all = countyNamesIn(st)
    const named = l.counties[st]
    const cur = named?.length ? named : all
    const next = cur.includes(co) ? cur.filter((x) => x !== co) : [...cur, co]
    if (!next.length || next.length === all.length) delete l.counties[st]
    else l.counties[st] = next
  })
  return null
}

export function addCounty(actor: Actor, st: string, name: string): { ok: true } | { ok: false; error: string } {
  const n = name.trim()
  if (!n) return { ok: false, error: 'A county name is required.' }
  if (isDuplicateName(currentCounties().filter((c) => c.st === st), n, (c) => c.n))
    return { ok: false, error: `${n}, ${st} is already on file.` }
  const links = Object.fromEntries(currentLinkTypes().map((t) => [t.k, { u: '', s: 'none' as const }]))
  const refused = saveCounty(actor, { n, st, idx: null, links })
  return refused ? { ok: false, error: refused } : { ok: true }
}

export function setPersonLevel(actor: Actor, id: string, lid: string): string {
  const refused = levelRefusal(actor)
  if (refused) return refused
  store.update((b) => ({ ...b, moved: { ...b.moved, [id]: lid || null } }))
  const p = personById(id)
  const l = store.get().levels.find((x) => x.id === lid)
  return lid ? `${p?.n} → ${l?.n}` : `${p?.n} has no level — takes anything`
}

function selectLevel(id: string): void {
  store.update((b) => ({ ...b, selected: id }))
}

export function addLevel(actor: Actor): Saved {
  const refused = levelRefusal(actor)
  if (refused) return { id: null, refused }
  const { levels } = store.get()
  let i = levels.length + 1
  while (levels.some((l) => l.id === `lv${i}`)) i++
  const id = `lv${i}`
  store.update((b) => ({
    ...b,
    levels: [...b.levels, { id, n: `Level ${b.levels.length + 1}`, note: '', states: [], counties: {}, products: [] }],
    selected: id,
  }))
  return { id, refused: null }
}

function renameLevel(actor: Actor, lid: string, v: string): string | null {
  const refused = levelRefusal(actor)
  if (refused) return refused
  const n = v.trim()
  if (n) edit(lid, (l) => void (l.n = n))
  return null
}

function setLevelNote(actor: Actor, lid: string, v: string): string | null {
  const refused = levelRefusal(actor)
  if (refused) return refused
  edit(lid, (l) => void (l.note = v.trim()))
  return null
}

export function removeLevel(
  actor: Actor,
  lid: string,
): { ok: true } | { ok: false; held: Person[]; refused: string | null } {
  const refused = levelRefusal(actor)
  if (refused) return { ok: false, held: [], refused }
  const held = currentCoverage().onLevel(lid)
  if (held.length) return { ok: false, held, refused: null }
  store.update((b) => {
    const levels = b.levels.filter((l) => l.id !== lid)
    return { ...b, levels, selected: b.selected === lid ? (levels[0]?.id ?? null) : b.selected }
  })
  return { ok: true }
}

export function useLevels(me: Actor) {
  const book = useStore(store)
  const { counties } = useCountyBook()
  useStaff()
  return {
    ...currentCoverage(),
    levels: book.levels,
    counties,
    selected: book.selected,
    personLevel: personLevelOf,
    select: selectLevel,
    readOnly: levelRefusal(me),
    setCov: (lid: string, k: CovKey, v?: string) => setCov(me, lid, k, v),
    setCounty: (lid: string, st: string, co: string) => setCounty(me, lid, st, co),
    addCounty: (st: string, name: string) => addCounty(me, st, name),
    setPersonLevel: (id: string, lid: string) => setPersonLevel(me, id, lid),
    addLevel: () => addLevel(me),
    rename: (lid: string, v: string) => renameLevel(me, lid, v),
    setNote: (lid: string, v: string) => setLevelNote(me, lid, v),
    remove: (lid: string) => removeLevel(me, lid),
  }
}

export const resetLevels = store.reset
