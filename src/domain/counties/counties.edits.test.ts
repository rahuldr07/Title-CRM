import { describe, expect, it } from 'vitest'
import {
  COUNTY_EDITOR,
  LINK_TYPE_EDITOR,
  currentCounties,
  currentLinkTypes,
  removeCounty,
  removeLinkType,
  saveCounty,
  saveLink,
  saveLinkType,
  setCheckEvery,
} from './counties'

const ADMIN = { id: 'hw', r: 'admin' }
const LEAD = { id: 'sk', r: 'lead' }
const STAFF = { id: 'us', r: 'staff' }

describe('who may change the county records', () => {
  it('holds county edits to “all”, the capability the county screen already asks for', () => {
    expect(COUNTY_EDITOR).toBe('all')
    const before = currentCounties()
    expect(saveCounty(STAFF, { n: 'Testshire', st: 'PA', idx: null, links: {} })).toMatch(/“all”/)
    expect(removeCounty(STAFF, 'Cambria', 'PA')).toMatch(/“all”/)
    expect(saveLink(STAFF, 'Cambria', 'PA', 'tax', { url: 'cambria.gov/tax' })).toMatch(/“all”/)
    expect(setCheckEvery(STAFF, 7)).toMatch(/“all”/)
    expect(currentCounties()).toBe(before)
    expect(saveCounty(LEAD, { n: 'Testshire', st: 'PA', idx: null, links: {} })).toBeNull()
  })

  it('holds link types to “config”, as the permission list says', () => {
    expect(LINK_TYPE_EDITOR).toBe('config')
    const before = currentLinkTypes()
    expect(saveLinkType(LEAD, { n: 'Probate court', note: '', req: false })).toMatch(/“config”/)
    expect(removeLinkType(LEAD, 'tax')).toMatch(/“config”/)
    expect(currentLinkTypes()).toBe(before)
    expect(saveLinkType(ADMIN, { n: 'Probate court', note: '', req: false })).toBeNull()
  })
})
