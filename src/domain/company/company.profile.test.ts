import { describe, expect, it } from 'vitest'
import { currentWorkspaces, setDateFormat, setProfile, SEEDED_TENANT_ID } from './company'
import { resetCompany } from './companyStore'
import { fmtDate, onDateFormat } from '@/shared/lib/format'

const BOSS = { id: 'hw', r: 'admin' }

const AUG_3 = new Date(2026, 7, 3)

describe('the workspace name', () => {
  it('is the one the Company tab edits, wherever the current workspace is named', () => {
    setProfile(BOSS, 'name', 'Keystone Title Group')
    const seeded = currentWorkspaces().find((t) => t.id === SEEDED_TENANT_ID)
    expect(seeded?.name).toBe('Keystone Title Group')
  })

  it('leaves the other workspaces as they are', () => {
    const before = currentWorkspaces().filter((t) => t.id !== SEEDED_TENANT_ID)
    setProfile(BOSS, 'name', 'Keystone Title Group')
    expect(currentWorkspaces().filter((t) => t.id !== SEEDED_TENANT_ID)).toEqual(before)
  })
})

describe('the date format', () => {
  it('prints every date in the order the company picked', () => {
    expect(fmtDate(AUG_3)).toBe('08/03/2026')
    setDateFormat(BOSS, 'DD/MM/YYYY')
    expect(fmtDate(AUG_3)).toBe('03/08/2026')
  })

  it('goes back to the US order on reset, so one test cannot leak into the next', () => {
    setDateFormat(BOSS, 'DD/MM/YYYY')
    resetCompany()
    expect(fmtDate(AUG_3)).toBe('08/03/2026')
  })

  it('tells a listening screen once per change, so it can redraw in place instead of remounting', () => {
    const heard: string[] = []
    const stop = onDateFormat(() => heard.push(fmtDate(AUG_3)))
    setDateFormat(BOSS, 'DD/MM/YYYY')
    setDateFormat(BOSS, 'DD/MM/YYYY')
    setProfile(BOSS, 'name', 'Keystone Title Group')
    stop()
    expect(heard).toEqual(['03/08/2026'])
  })
})
