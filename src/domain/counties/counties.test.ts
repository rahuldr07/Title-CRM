import { typeUsage } from './links'
import { describe, expect, it } from 'vitest'
import {
  countyName,
  currentCheck,
  currentCounties,
  currentLinkTypes,
  linkTypeKey,
  moveLinkType,
  removeCounty,
  removeLinkType,
  runLinkCheck,
  linkCheckRefusal,
  sameCounty,
  saveCounty,
  saveLink,
  saveLinkType,
  setCheckEvery,
  setCheckNotify,
} from './counties'
import { COUNTIES, LINKCHECK, LINKTYPES } from '@/data/catalog'
import { SEED_NOW } from '@/shared/lib/clock'
import { must } from '../../../tests/must'

const ADMIN = { id: 'hw', r: 'admin' }

const cambria = () => currentCounties().find((c) => c.n === 'Cambria' && c.st === 'PA')

describe('the county list', () => {
  it('matches a county by name, ignoring case and spacing, within its state', () => {
    const c = must(COUNTIES[0], 'a seeded county')
    expect(sameCounty(c, ` ${c.n.toUpperCase()} `, c.st)).toBe(true)
    expect(sameCounty(c, c.n, 'ZZ')).toBe(false)
  })

  it('adds a county, and edits one in place by its old name', () => {
    const links = { recorder: { u: '', s: 'none' as const } }
    saveCounty(ADMIN, { n: 'Testshire', st: 'PA', idx: null, links })
    expect(currentCounties()).toHaveLength(COUNTIES.length + 1)

    saveCounty(ADMIN, { n: 'Testshire East', st: 'PA', idx: 2001, links }, { n: 'Testshire', st: 'PA' })
    expect(currentCounties()).toHaveLength(COUNTIES.length + 1)
    expect(currentCounties().find((c) => c.n === 'Testshire East')?.idx).toBe(2001)
  })

  it('removes a county', () => {
    removeCounty(ADMIN, 'Cambria', 'PA')
    expect(cambria()).toBeUndefined()
    expect(COUNTIES.some((c) => c.n === 'Cambria')).toBe(true)
  })
})

describe('saveLink', () => {
  it('marks a new address as never checked', () => {
    saveLink(ADMIN, 'Cambria', 'PA', 'tax', { url: '  cambria.gov/tax  ' })
    expect(cambria()?.links.tax).toEqual({ u: 'cambria.gov/tax', s: 'unchecked' })
  })

  it('keeps the link as it was when the same address is saved again', () => {
    const before = cambria()?.links.recorder
    saveLink(ADMIN, 'Cambria', 'PA', 'recorder', { url: must(before, 'a recorder link for Cambria').u })
    expect(cambria()?.links.recorder).toEqual(before)
  })

  it('clears a link saved blank', () => {
    saveLink(ADMIN, 'Cambria', 'PA', 'recorder', { url: '' })
    expect(cambria()?.links.recorder).toEqual({ u: '', s: 'none' })
  })

  it('marks a link working by hand', () => {
    saveLink(ADMIN, 'Cambria', 'PA', 'tax', { url: 'cambria.gov/tax' })
    saveLink(ADMIN, 'Cambria', 'PA', 'tax', { markOk: true })
    expect(cambria()?.links.tax).toEqual({ u: 'cambria.gov/tax', s: 'ok' })
  })
})

describe('link types', () => {
  it('derives a key from the name, falling back when nothing is left', () => {
    expect(linkTypeKey('Plat maps!')).toBe('platmaps')
    expect(linkTypeKey('***')).toBe('link')
  })

  it('adds a type with a key of its own, and a blank link on every county', () => {
    saveLinkType(ADMIN, { n: 'Recorder', note: '', req: false })
    const added = currentLinkTypes().at(-1)
    expect(added?.k).toBe('recorder2')
    expect(currentCounties().every((c) => c.links.recorder2?.s === 'none')).toBe(true)
  })

  it('edits a type in place by its key', () => {
    saveLinkType(ADMIN, { n: 'Tax collector', note: 'x', req: false }, 'tax')
    expect(currentLinkTypes().find((t) => t.k === 'tax')).toMatchObject({ n: 'Tax collector', req: false })
    expect(currentLinkTypes()).toHaveLength(LINKTYPES.length)
  })

  it('removes a type and its link from every county', () => {
    removeLinkType(ADMIN, 'tax')
    expect(currentLinkTypes().some((t) => t.k === 'tax')).toBe(false)
    expect(currentCounties().some((c) => 'tax' in c.links)).toBe(false)
  })

  it('moves a type up or down, and not past either end', () => {
    moveLinkType(ADMIN, 'assessor', -1)
    expect(currentLinkTypes()[0]?.k).toBe('assessor')
    const order = currentLinkTypes().map((t) => t.k)
    moveLinkType(ADMIN, 'assessor', -1)
    expect(currentLinkTypes().map((t) => t.k)).toEqual(order)
  })

  it('counts where a type is held, missing and failing', () => {
    const u = typeUsage('tax')
    expect(u.held + u.missing).toBe(currentCounties().length)
    expect(u.held).toBe(COUNTIES.filter((c) => c.links.tax?.u).length)
  })
})

describe('the link check', () => {
  it('refuses someone without the capability in words about the link check, not a county record', () => {
    const staff = { id: 'us', r: 'staff' }
    for (const refused of [setCheckEvery(staff, 7), setCheckNotify(staff, 'everyone'), runLinkCheck(staff).refused]) {
      expect(refused).toMatch(/^Changing the link check/)
      expect(refused).not.toMatch(/county record/)
    }
    expect(linkCheckRefusal(staff)).toMatch(/“all”/)
    expect(linkCheckRefusal(ADMIN)).toBeNull()
  })

  it('only takes a positive number of days', () => {
    setCheckEvery(ADMIN, 7)
    expect(currentCheck().every).toBe(7)
    setCheckEvery(ADMIN, 0)
    setCheckEvery(ADMIN, -2)
    setCheckEvery(ADMIN, Number.NaN)
    expect(currentCheck().every).toBe(7)
  })

  it('sets who is told', () => {
    setCheckNotify(ADMIN, 'owner')
    expect(currentCheck().notify).toBe('owner')
  })

  it('checks the never-checked links, stamps when, and counts what is still failing', () => {
    saveLink(ADMIN, 'Cambria', 'PA', 'tax', { url: 'cambria.gov/tax' })
    const r = runLinkCheck(ADMIN)
    expect(r.checked).toBeGreaterThanOrEqual(1)
    expect(cambria()?.links.tax?.s).toBe('ok')
    expect(currentCheck().last).toEqual(SEED_NOW)
    expect(LINKCHECK.last).not.toEqual(SEED_NOW)
  })
})

describe('a county’s name', () => {
  it('is a county in most states', () => {
    expect(countyName('Cambria', 'PA')).toBe('Cambria County')
  })

  it('is a recording district in Alaska', () => {
    expect(countyName('Palmer', 'AK')).toBe('Palmer Recording District')
  })

  it('is a parish in Louisiana', () => {
    expect(countyName('Orleans', 'LA')).toBe('Orleans Parish')
  })
})
