import { describe, expect, it } from 'vitest'
import { setNaming, stageName } from './naming'
import { currentStatuses, saveStatus, statusName } from './statuses'
import { NAMING } from '@/data/workflow'

const ADMIN = { id: 'hw', r: 'admin' }

describe('a stage’s name', () => {
  it('is its key until someone renames it', () => {
    expect(stageName('Search QC')).toBe('Search QC')
    expect(stageName('Search')).toBe('Search')
  })

  it('follows a rename under Company › Workflow, and the key stays what it was', () => {
    expect(setNaming(ADMIN, 'Second search check', 'Second check')).toBeNull()
    expect(stageName('Search QC')).toBe('Second check')
    expect(NAMING.find((r) => r.stage === 'Search QC')?.name).toBe('Search QC')
  })

  it('is the same fact as the status an order is in while on that stage', () => {
    setNaming(ADMIN, 'Ready to send', 'Final check')
    expect(statusName('rts')).toBe('Final check')
    expect(currentStatuses().find(([k]) => k === 'rts')?.[1][0]).toBe('Final check')
    expect(saveStatus(ADMIN, 'Upload ready', '#06B6D4', 'rts')).toBeNull()
    expect(stageName('RTS')).toBe('Upload ready')
  })

  it('refuses a rename to someone without the workflow capability', () => {
    expect(setNaming({ id: 'us', r: 'staff' }, 'Ready to send', 'x')).toMatch(/“config”/)
    expect(stageName('RTS')).toBe('RTS')
  })
})
