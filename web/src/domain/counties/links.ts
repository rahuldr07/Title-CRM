import { BADSTATES } from '@/data/catalog'
import {
  currentCheck as CHECK_OF,
  currentCounties as COUNTIES_OF,
  currentLinkTypes as LINKTYPES_OF,
  useCoverage,
} from './counties'
import type { ChipKind, County, CountyLink, LinkStatus, LinkType } from '@/data/types'

export const LSTATE: Record<LinkStatus, [string, ChipKind]> = {
  ok: ['Working', 'v'],
  slow: ['Slow', 'r'],
  moved: ['Moved', 'r'],
  auth: ['Login required', 'r'],
  broken: ['Not working', 'd'],
  none: ['No link on file', 'n'],
  unchecked: ['Never checked', 'n'],
}

export interface FlatLink {
  c: County
  k: string
  lbl: string
  l: CountyLink
}

const allLinks = (): FlatLink[] =>
  COUNTIES_OF().flatMap((c) =>
    LINKTYPES_OF().flatMap((t) => {
      const l = c.links[t.k]
      return l ? [{ c, k: t.k, lbl: t.n, l }] : []
    }),
  )

export const isBrokenLink = (l: CountyLink | undefined): boolean => !!l && BADSTATES.includes(l.s)

const isMissingLink = (l: CountyLink | undefined): boolean => !l || l.s === 'none'

export const brokenLinks = () => allLinks().filter((x) => isBrokenLink(x.l))

export const useBrokenLinks = (): FlatLink[] => {
  useCoverage()
  return brokenLinks()
}

export function linkGaps(county: Pick<County, 'links'>): { missing: LinkType[]; broken: LinkType[] } {
  const types = LINKTYPES_OF()
  return {
    missing: types.filter((t) => isMissingLink(county.links[t.k])),
    broken: types.filter((t) => isBrokenLink(county.links[t.k])),
  }
}

export function typeUsage(k: string) {
  const counties = COUNTIES_OF()
  const held = counties.filter((c) => c.links[k]?.u).length
  return {
    held,
    missing: counties.length - held,
    bad: counties.filter((c) => isBrokenLink(c.links[k])).length,
  }
}

export const nextLinkCheck = () => {
  const c = CHECK_OF()
  return new Date(c.last.getTime() + c.every * 86400000)
}

export function linkStats() {
  const a = allLinks()
  const by = {} as Record<LinkStatus, number>
  ;(Object.keys(LSTATE) as LinkStatus[]).forEach((k) => {
    by[k] = a.filter((x) => x.l.s === k).length
  })
  return {
    total: a.length,
    by,
    bad: brokenLinks().length,
    types: LINKTYPES_OF().length,
    covered: a.filter((x) => !isMissingLink(x.l)).length,
  }
}

export const findCounty = (n: string, st?: string) =>
  COUNTIES_OF().find(
    (c) => c.n.toLowerCase() === String(n).toLowerCase().trim() && (!st || c.st === st),
  )
