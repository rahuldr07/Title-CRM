import { COUNTIES, LINKCHECK, LINKTYPES } from '@/data/catalog'
import { now } from '@/shared/lib/clock'
import { createStore, useStore } from '@/shared/lib/store'
import { refusal, type Actor } from '@/domain/auth/permissions'
import type { County, CountyLink, LinkCheckConfig, LinkType } from '@/data/types'

interface Coverage {
  counties: County[]
  linkTypes: LinkType[]
  check: LinkCheckConfig
}

const store = createStore<Coverage>({ counties: COUNTIES, linkTypes: LINKTYPES, check: LINKCHECK })

export const useCoverage = (): Coverage => useStore(store)

export const COUNTY_EDITOR = 'all'
export const LINK_TYPE_EDITOR = 'config'

const countyRefusal = (actor: Actor) => refusal(actor, COUNTY_EDITOR, 'Changing a county record')
export const linkCheckRefusal = (actor: Actor): string | null =>
  refusal(actor, COUNTY_EDITOR, 'Changing the link check — its schedule, who it tells, or running it')
const typeRefusal = (actor: Actor) => refusal(actor, LINK_TYPE_EDITOR, 'Changing the link types')

export const currentCounties = (): County[] => store.get().counties
export const currentLinkTypes = (): LinkType[] => store.get().linkTypes
export const currentCheck = (): LinkCheckConfig => store.get().check

export const countyName = (county: string, state: string): string =>
  state === 'AK' ? `${county} Recording District` : state === 'LA' ? `${county} Parish` : `${county} County`

export const sameCounty = (c: County, n: string, st: string) =>
  c.n.toLowerCase() === n.toLowerCase().trim() && c.st === st

export function saveCounty(
  actor: Actor,
  next: { n: string; st: string; idx: number | null; links: Record<string, CountyLink> },
  was?: { n: string; st: string },
): string | null {
  const refused = countyRefusal(actor)
  if (refused) return refused
  store.update((coverage) => ({
    ...coverage,
    counties: was
      ? coverage.counties.map((c) => (sameCounty(c, was.n, was.st) ? { ...c, ...next } : c))
      : [...coverage.counties, next],
  }))
  return null
}

export function removeCounty(actor: Actor, n: string, st: string): string | null {
  const refused = countyRefusal(actor)
  if (refused) return refused
  store.update((coverage) => ({
    ...coverage,
    counties: coverage.counties.filter((c) => !sameCounty(c, n, st)),
  }))
  return null
}

export function saveLink(
  actor: Actor,
  name: string,
  st: string,
  k: string,
  patch: { url?: string; markOk?: boolean },
): string | null {
  const refused = countyRefusal(actor)
  if (refused) return refused
  store.update((coverage) => ({
    ...coverage,
    counties: coverage.counties.map((c) => {
      if (!sameCounty(c, name, st)) return c
      const prev = c.links[k] ?? { u: '', s: 'none' as const }
      let link: CountyLink
      if (patch.markOk) {
        link = { ...prev, s: 'ok' }
      } else {
        const u = (patch.url ?? '').trim()
        link = !u
          ? { u: '', s: 'none' }
          : u === prev.u
            ? prev
            : { u, s: 'unchecked' }
      }
      const { err: _err, since: _since, ...cleared } = link
      return { ...c, links: { ...c.links, [k]: patch.markOk || link !== prev ? cleared : prev } }
    }),
  }))
  return null
}

export const linkTypeKey = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'link'

export function saveLinkType(actor: Actor, t: { n: string; note: string; req: boolean }, k?: string): string | null {
  const refused = typeRefusal(actor)
  if (refused) return refused
  store.update((coverage) => {
    if (k) {
      return {
        ...coverage,
        linkTypes: coverage.linkTypes.map((x) => (x.k === k ? { ...x, ...t } : x)),
      }
    }
    let key = linkTypeKey(t.n)
    let n = 2
    while (coverage.linkTypes.some((x) => x.k === key)) key = `${linkTypeKey(t.n)}${n++}`
    return {
      ...coverage,
      linkTypes: [...coverage.linkTypes, { k: key, ...t }],
      counties: coverage.counties.map((c) => ({
        ...c,
        links: { ...c.links, [key]: { u: '', s: 'none' } },
      })),
    }
  })
  return null
}

export function removeLinkType(actor: Actor, k: string): string | null {
  const refused = typeRefusal(actor)
  if (refused) return refused
  store.update((coverage) => ({
    ...coverage,
    linkTypes: coverage.linkTypes.filter((x) => x.k !== k),
    counties: coverage.counties.map((c) => {
      const { [k]: _gone, ...links } = c.links
      return { ...c, links }
    }),
  }))
  return null
}

export function moveLinkType(actor: Actor, k: string, dir: -1 | 1): string | null {
  const refused = typeRefusal(actor)
  if (refused) return refused
  const coverage = store.get()
  const linkTypes = [...coverage.linkTypes]
  const i = linkTypes.findIndex((x) => x.k === k)
  const a = linkTypes[i]
  const b = linkTypes[i + dir]
  if (!a || !b) return null
  linkTypes[i] = b
  linkTypes[i + dir] = a
  store.set({ ...coverage, linkTypes })
  return null
}

export function setCheckEvery(actor: Actor, days: number): string | null {
  const refused = linkCheckRefusal(actor)
  if (refused) return refused
  if (!(days > 0)) return 'Every how many days? A number above zero.'
  store.update((coverage) => ({ ...coverage, check: { ...coverage.check, every: days } }))
  return null
}

export function setCheckNotify(actor: Actor, notify: string): string | null {
  const refused = linkCheckRefusal(actor)
  if (refused) return refused
  store.update((coverage) => ({ ...coverage, check: { ...coverage.check, notify } }))
  return null
}

export function runLinkCheck(actor: Actor): { refused: string | null; checked: number } {
  const refused = linkCheckRefusal(actor)
  if (refused) return { refused, checked: 0 }
  const coverage = store.get()
  let checked = 0
  const counties = coverage.counties.map((c) => {
    const links = { ...c.links }
    for (const t of coverage.linkTypes) {
      const l = links[t.k]
      if (l && l.s === 'unchecked' && l.u) {
        links[t.k] = { ...l, s: 'ok' }
        checked++
      }
    }
    return { ...c, links }
  })
  store.set({ ...coverage, counties, check: { ...coverage.check, last: now() } })
  return { refused: null, checked }
}

export const resetCoverage = store.reset
