import { describe, expect, it } from 'vitest'
import {
  cancelLeave,
  currentLeave,
  currentLeavePolicy,
  currentLeaveTypes,
  decideLeave,
  fileLeave,
  leaveTypeKey,
  removeLeaveType,
  saveLeaveType,
  setLeavePolicy,
  type LeaveRequest,
} from './leaveStore'
import { LEAVE, LEAVEPOLICY, LEAVETYPES } from '@/data/hrms'
import { OWN_REQUEST } from '@/domain/auth/permissions'
import { must } from '../../../tests/must'

const ADMIN = { id: 'hw', r: 'admin', n: 'Harry Whitfield' }
const LEAD = { id: 'sk', r: 'lead', n: 'Ashok S' }
const UMA = { id: 'us', r: 'staff', n: 'Uma Sankar' }

const ask = (who = 'us'): LeaveRequest => ({
  who,
  type: 'pl',
  from: new Date(2026, 8, 7),
  to: new Date(2026, 8, 7),
  days: 1,
  reason: 'Family function',
})

const newest = () => must(currentLeave()[0], 'a request')

describe('leave requests', () => {
  it('file into the register, not into the seed', () => {
    const seeded = LEAVE.length
    expect(fileLeave(UMA, ask())).toBeNull()
    expect(newest()).toMatchObject({ who: 'us', st: 'pending', by: null })
    expect(LEAVE).toHaveLength(seeded)
  })

  it('cannot be filed for somebody else without “people”', () => {
    expect(fileLeave(UMA, ask('sm'))).toMatch(/“people”/)
    expect(fileLeave(ADMIN, ask('sm'))).toBeNull()
  })

  it('are decided by someone holding “assign”, never by the person who asked', () => {
    fileLeave(UMA, ask())
    const id = newest().id
    expect(decideLeave(UMA, id, 'approved')).toBe(OWN_REQUEST)
    expect(decideLeave({ id: 'jr', r: 'staff', n: 'JP Ramesh' }, id, 'approved')).toMatch(/“assign”/)
    expect(decideLeave(LEAD, id, 'approved')).toBeNull()
    expect(newest()).toMatchObject({ st: 'approved', by: 'Ashok S' })
    expect(decideLeave(ADMIN, id, 'rejected'), 'a decision is not taken twice').toMatch(/already been decided/)
  })

  it('are cancelled only by the person who asked, and only before they start', () => {
    fileLeave(UMA, ask())
    const id = newest().id
    expect(cancelLeave(ADMIN, id)).toMatch(/Only the person/)
    expect(cancelLeave(UMA, id)).toBeNull()
    expect(newest().st).toBe('cancelled')
    const started = must(LEAVE.find((l) => l.st === 'approved' && l.from < new Date(2026, 7, 3)), 'a past leave')
    expect(cancelLeave({ id: started.who, r: 'staff' }, started.id)).toMatch(/already started/)
  })
})

describe('the leave policy and types', () => {
  it('change only for someone holding “people”, and leave the seed alone', () => {
    expect(setLeavePolicy(LEAD, 'minCover', 3)).toMatch(/“people”/)
    expect(setLeavePolicy(ADMIN, 'minCover', 3)).toBeNull()
    expect(currentLeavePolicy().minCover).toBe(3)
    expect(LEAVEPOLICY.minCover).toBe(1)
  })

  it('keys a new type from the first four letters of its name, or by position', () => {
    expect(leaveTypeKey('  Bereavement ', 5)).toBe('bere')
    expect(leaveTypeKey('Work-from-home', 5)).toBe('work')
    expect(leaveTypeKey('123', 5)).toBe('t5')
  })

  it('adds, edits and removes a type without touching the seed', () => {
    const type = { k: '', n: 'Bereavement', annual: 3, carry: 0, enc: false, c: 'n' as const, d: '' }
    expect(saveLeaveType(UMA, type)).toMatch(/“people”/)
    expect(saveLeaveType(ADMIN, type)).toBeNull()
    expect(saveLeaveType(ADMIN, { ...type, annual: 5 }, 'bere')).toBeNull()
    expect(currentLeaveTypes().find((t) => t.k === 'bere')?.annual).toBe(5)
    expect(removeLeaveType(ADMIN, 'bere')).toBeNull()
    expect(currentLeaveTypes().some((t) => t.k === 'bere')).toBe(false)
    expect(LEAVETYPES.some((t) => t.k === 'bere')).toBe(false)
  })

  it('refuses to remove a type somebody has used', () => {
    expect(removeLeaveType(ADMIN, 'pl')).toMatch(/already used/)
  })
})
