import { describe, expect, it } from 'vitest'
import { LSTATE, allLinks, brokenLinks, findCounty, isBrokenLink, isMissingLink, linkGaps, linkStats, nextLinkCheck } from './links'
import { currentCounties, currentLinkTypes, saveLink, setCheckEvery } from './counties'
import { BADSTATES, COUNTIES, LINKCHECK } from '@/data/catalog'
import { must } from '../../../tests/must'

const ADMIN = { id: 'hw', r: 'admin' }

describe('allLinks', () => {
  it('has one row for every county and link type held', () => {
    const expected = currentCounties().reduce(
      (n, c) => n + currentLinkTypes().filter((t) => c.links[t.k]).length,
      0,
    )
    expect(allLinks()).toHaveLength(expected)
  })

  it('labels each row by its type', () => {
    const names = new Set(currentLinkTypes().map((t) => t.n))
    expect(allLinks().every((x) => names.has(x.lbl))).toBe(true)
  })

  it('reads the county list as it is now', () => {
    saveLink(ADMIN, 'Cambria', 'PA', 'tax', { url: 'cambria.gov/tax' })
    expect(allLinks().find((x) => x.c.n === 'Cambria' && x.k === 'tax')?.l.s).toBe('unchecked')
  })
})

describe('brokenLinks and linkStats', () => {
  it('counts a link as broken only in a failing state', () => {
    expect(brokenLinks().every((x) => BADSTATES.includes(x.l.s))).toBe(true)
  })

  it('adds up to the whole', () => {
    const s = linkStats()
    expect(Object.values(s.by).reduce((a, n) => a + n, 0)).toBe(s.total)
    expect(Object.keys(s.by).sort()).toEqual(Object.keys(LSTATE).sort())
    expect(s.bad).toBe(brokenLinks().length)
    expect(s.covered).toBe(s.total - s.by.none)
    expect(s.types).toBe(currentLinkTypes().length)
  })
})

describe('nextLinkCheck', () => {
  it('is the last check plus the interval', () => {
    expect(nextLinkCheck().getTime()).toBe(LINKCHECK.last.getTime() + LINKCHECK.every * 86400000)
    setCheckEvery(ADMIN, 10)
    expect(nextLinkCheck().getTime()).toBe(LINKCHECK.last.getTime() + 10 * 86400000)
  })
})

describe('findCounty', () => {
  it('finds a county by name in any case, within a state when one is given', () => {
    expect(findCounty(' cambria ')?.st).toBe('PA')
    expect(findCounty('Cambria', 'PA')?.n).toBe('Cambria')
    expect(findCounty('Cambria', 'GA')).toBeUndefined()
    expect(findCounty('Nowhere')).toBeUndefined()
  })
})

describe('what a link on file is', () => {
  it('is broken only when a check found it failing', () => {
    for (const s of BADSTATES) expect(isBrokenLink({ u: 'https://x', s })).toBe(true)
    for (const s of ['ok', 'unchecked', 'none'] as const) expect(isBrokenLink({ u: '', s })).toBe(false)
    expect(isBrokenLink(undefined)).toBe(false)
  })

  it('is missing when nothing is on file for it', () => {
    expect(isMissingLink(undefined)).toBe(true)
    expect(isMissingLink({ u: '', s: 'none' })).toBe(true)
    expect(isMissingLink({ u: 'https://x', s: 'broken' })).toBe(false)
  })
})

describe('the gaps in a county’s links', () => {
  const county = must(COUNTIES[0], 'a county')
  const ok = Object.fromEntries(currentLinkTypes().map((t) => [t.k, { u: 'https://x', s: 'ok' as const }]))
  const k = must(currentLinkTypes()[0], 'a link type').k

  it('are none when every link works', () => {
    expect(linkGaps({ ...county, links: ok })).toEqual({ missing: [], broken: [] })
  })

  it('name the missing ones and the failing ones apart', () => {
    const { [k]: _gone, ...without } = ok
    expect(linkGaps({ ...county, links: without }).missing.map((t) => t.k)).toEqual([k])
    expect(linkGaps({ ...county, links: { ...ok, [k]: { u: '', s: 'none' } } }).missing.map((t) => t.k)).toEqual([k])
    expect(linkGaps({ ...county, links: { ...ok, [k]: { u: 'https://x', s: 'broken' } } }).broken.map((t) => t.k)).toEqual([k])
  })

  it('count a failing link the same way the link monitor’s badge does', () => {
    const failing = currentCounties().reduce((n, c) => n + linkGaps(c).broken.length, 0)
    expect(failing).toBe(brokenLinks().length)
  })
})
