import { resetCompany } from '@/domain/company/companyStore'
import { removeRole, saveRole } from '@/domain/auth/roles'
import { currentStaff, removeStaff, saveStaff } from '@/domain/people/roster'
import { currentDepts, removeDept, saveDept } from '@/domain/company/departments'
import { currentClients, saveClient } from '@/domain/company/clients'
import { addOverride, currentBudget, currentSla, removeOverride, setBuffer, setShare, setSlaHours } from '@/domain/assignment/turnaround'
import { describe, expect, it } from 'vitest'
import { currentPayCfg, setPayCfg } from './company'
import { budgetOK, checkpoints, shareTotal, sharesFor } from '@/domain/assignment/sla'
import { structureOf } from '@/domain/payroll/structure'
import { ASSIGN_STAGES } from '@/data/org'
import { BUDGET, SLA } from '@/data/budget'
import { PAYCFG } from '@/data/hrms'
import { readSettings } from '../../../server/routes/validate'
import { newPerson } from '@/domain/people/people'
import { must } from '../../../tests/must'

const BOSS = { id: 'hw', r: 'admin' }

describe('the stage split', () => {
  it('records what the slider was set to, even when the split stops adding up', () => {
    expect(shareTotal(sharesFor('COS')), 'the seed split is already broken').toBe(100)

    setShare(BOSS, 'base', 'Search', '90')

    expect(shareTotal(sharesFor('COS'))).toBe(140)
    expect(budgetOK(sharesFor('COS'))).toBe(false)
  })

  it('carries an unbalanced split straight into the checkpoints', () => {
    const before = checkpoints(24, 'COS')
    expect(before.at(-1)?.by).toBeCloseTo(21.6, 5)

    setShare(BOSS, 'base', 'Search', '90')

    const after = checkpoints(24, 'COS')
    expect(after.at(-1)?.by).toBeCloseTo(30.24, 5)
    expect(after.at(-1)?.by, 'the last checkpoint is inside the promise').toBeGreaterThan(24)
  })

  it('could not hold the total at 100 without refusing every edit', () => {
    expect(shareTotal(currentBudget().base), 'the seed divides the clock exactly').toBe(100)

    ASSIGN_STAGES.forEach((st) => {
      resetCompany()

      const was = must(BUDGET.base[st], `a seed share for ${st}`)
      setShare(BOSS, 'base', st, String(was + 1))

      expect(currentBudget().base[st], `moving ${st} by one was refused`).toBe(was + 1)
      expect(budgetOK(sharesFor('COS')), `${st} could be moved and still leave the split whole`).toBe(
        false,
      )
    })
  })

  it('clamps a share to the 0–100 the slider offers, and refuses a mis-key', () => {
    setShare(BOSS, 'base', 'Search', '-5')
    expect(currentBudget().base.Search).toBe(0)

    setShare(BOSS, 'base', 'Search', '250')
    expect(currentBudget().base.Search).toBe(100)

    setShare(BOSS, 'base', 'Search', 'abc')
    expect(currentBudget().base.Search, 'a mis-key was written as a share').toBe(100)
  })

  it('keeps a product override and the default clear of each other', () => {
    addOverride(BOSS, 'COS')
    expect(sharesFor('COS').Search).toBe(50)

    setShare(BOSS, 'base', 'Search', '40')
    expect(currentBudget().base.Search).toBe(40)
    expect(sharesFor('COS').Search, 'the override followed the default').toBe(50)

    setShare(BOSS, '40Y', 'Search', '70')
    expect(sharesFor('40Y').Search).toBe(70)
    expect(currentBudget().base.Search, 'the default followed an override').toBe(40)
  })

  it('drops a product back to the default when its override goes', () => {
    setShare(BOSS, '40Y', 'Search', '70')
    expect(sharesFor('40Y').Search).toBe(70)

    removeOverride(BOSS, '40Y')
    expect(sharesFor('40Y').Search).toBe(50)
  })
})

describe('the buffer held back at the end', () => {
  it('takes 0 to 50 and refuses the rest', () => {
    setBuffer(BOSS, '50')
    expect(currentBudget().buffer).toBe(50)

    for (const v of ['50.1', '-1', 'ten', '']) {
      setBuffer(BOSS, v)
      expect(currentBudget().buffer, `${v} was accepted as a buffer`).toBe(50)
    }

    setBuffer(BOSS, '0')
    expect(currentBudget().buffer).toBe(0)
  })

  it('is capped tighter here than the server caps the same number', () => {
    setBuffer(BOSS, '60')
    expect(currentBudget().buffer, 'the client cap has moved off 50').toBe(BUDGET.buffer)
    expect(readSettings({ slaBufferPct: 60 }).ok, 'the server cap has moved down to 50').toBe(true)

    for (const v of [0, 25, 50]) {
      expect(readSettings({ slaBufferPct: v }).ok, `${v} is editable here and unstorable there`).toBe(
        true,
      )
    }
  })
})

describe('the promise', () => {
  it('refuses a promise of no time at all, and caps it at a fortnight', () => {
    for (const v of ['0', '-5', 'soon', '']) {
      setSlaHours(BOSS, 0, v)
      expect(currentSla()[0]?.h, `${v} was written as a promise`).toBe(24)
    }

    setSlaHours(BOSS, 0, '999')
    expect(currentSla()[0]?.h, '336 hours is the fortnight the doc claims').toBe(336)

    setSlaHours(BOSS, 0, '48')
    expect(currentSla()[0]?.h).toBe(48)
  })
})

describe('the salary structure', () => {
  it('moves every structure derived from it', () => {
    expect(structureOf({ ctc: 1_200_000 }).basic).toBe(50_000)
    expect(structureOf({ ctc: 1_200_000 }).hra).toBe(20_000)

    setPayCfg(BOSS, 'basicPct', '60')

    expect(structureOf({ ctc: 1_200_000 }).basic).toBe(60_000)
    expect(structureOf({ ctc: 1_200_000 }).hra).toBe(24_000)
  })

  it('refuses a blank or negative figure rather than writing it', () => {
    for (const v of ['', '-10', 'half']) {
      setPayCfg(BOSS, 'basicPct', v)
      expect(currentPayCfg().basicPct, `${v} was written as a percentage`).toBe(50)
    }

    setPayCfg(BOSS, 'currency', '   ')
    expect(currentPayCfg().currency).toBe('INR')
  })
})

describe('the seed', () => {
  it('is never written to', () => {
    setShare(BOSS, 'base', 'Search', '90')
    setPayCfg(BOSS, 'basicPct', '60')
    setSlaHours(BOSS, 0, '48')
    setBuffer(BOSS, '25')

    expect(currentBudget().base.Search).toBe(90)
    expect(currentBudget().buffer).toBe(25)
    expect(currentPayCfg().basicPct).toBe(60)
    expect(currentSla()[0]?.h).toBe(48)

    expect(BUDGET.base.Search).toBe(50)
    expect(BUDGET.buffer).toBe(10)
    expect(PAYCFG.basicPct).toBe(50)
    expect(SLA[0]?.h).toBe(24)
  })

  it('goes back on reset, so one test cannot leak into the next', () => {
    setShare(BOSS, 'base', 'Search', '90')
    setBuffer(BOSS, '25')

    resetCompany()

    expect(currentBudget().base.Search).toBe(50)
    expect(currentBudget().buffer).toBe(10)
    expect(budgetOK(sharesFor('COS'))).toBe(true)
  })
})

describe('a client code', () => {
  const mgr = () => currentClients().find((c) => c.n === 'MGR')!

  it('keeps its code when the client is edited, and takes the rest', () => {
    saveClient(BOSS, { ...mgr(), n: 'MGR2', terms: 'Net 45' }, 'MGR')
    expect(currentClients().some((c) => c.n === 'MGR2')).toBe(false)
    expect(mgr().terms).toBe('Net 45')
  })

  it('cannot be taken by a second client', () => {
    const before = currentClients().length
    saveClient(BOSS, { ...mgr(), dn: 'ZZ' })
    expect(currentClients()).toHaveLength(before)
    expect(mgr().dn).toBe('MGR')
  })
})

describe('departments', () => {
  it('reads one added on screen', () => {
    saveDept({ id: 'hw', r: 'admin' }, { n: 'Probate', desc: '', auto: false, pair: null, qc: false })
    expect(currentDepts().map((d) => d.n)).toContain('Probate')
  })
})

describe('who may change a staff record', () => {
  const ADMIN = { id: 'hw', r: 'admin' }
  const LEAD = { id: 'sk', r: 'lead' }
  const STAFF = { id: 'us', r: 'staff' }
  const uma = () => currentStaff().find((s) => s.id === 'us')!

  it('refuses someone without “people” another person’s bank, PAN and CTC, and says why', () => {
    const before = uma()
    const out = saveStaff(STAFF, { ...before, pan: 'ZZZZZ9999Z', ctc: 1, bank: { ...before.bank, acct: '1', ifsc: 'X' } }, 'hw')
    expect(out.id).toBeNull()
    expect(out.refused).toMatch(/“people” capability/)
    expect(out.refused).toMatch(/Staff role/)
    expect(currentStaff().find((s) => s.id === 'hw')?.pan).not.toBe('ZZZZZ9999Z')
  })

  it('refuses a person their own record too, so nobody raises their own role or pay', () => {
    const out = saveStaff(STAFF, { ...uma(), r: 'admin', ctc: 9_999_999 }, 'us')
    expect(out.refused).toMatch(/“people”/)
    expect(uma().r).toBe('staff')
  })

  it('refuses a lead, who sees every order but not personnel records', () => {
    expect(saveStaff(LEAD, { ...uma(), n: 'Renamed' }, 'us').refused).toMatch(/Lead role/)
    expect(removeStaff(LEAD, 'us')).toMatch(/“people”/)
    expect(uma().n).toBe('Uma Sankar')
  })

  it('refuses adding someone', () => {
    const before = currentStaff().length
    expect(saveStaff(STAFF, { ...uma(), id: '', n: 'Nia Brooks' }).refused).not.toBeNull()
    expect(currentStaff()).toHaveLength(before)
  })

  it('refuses a record the staff form would refuse, whoever is saving it', () => {
    const before = currentStaff().length
    const taken = saveStaff(ADMIN, { ...newPerson(), n: 'Nia Brooks', e: 'uma.sankar@keystoneabstract.com' })
    expect(taken).toEqual({ id: null, refused: 'uma.sankar@keystoneabstract.com already belongs to someone here.' })
    const badPan = saveStaff(ADMIN, { ...newPerson(), n: 'Nia Brooks', e: 'nia.brooks@keystoneabstract.com', pan: 'ABC' })
    expect(badPan.refused).toMatch(/PAN/)
    expect(saveStaff(ADMIN, { ...newPerson(), n: '  ', e: 'nia.brooks@keystoneabstract.com' }).refused).toBe('A name is required.')
    expect(currentStaff()).toHaveLength(before)
  })

  it('keeps a placeholder already on file, so an edit is not blocked by what nobody changed', () => {
    expect(saveStaff(ADMIN, { ...uma(), n: 'Uma Sen' }, 'us').refused).toBeNull()
  })

  it('lets someone holding “people” edit, add and remove', () => {
    expect(saveStaff(ADMIN, { ...uma(), n: 'Uma Sen' }, 'us')).toEqual({ id: 'us', refused: null })
    expect(uma().n).toBe('Uma Sen')
    const added = saveStaff(ADMIN, { ...newPerson(), n: 'Nia Brooks', e: 'nia.brooks@keystoneabstract.com' })
    expect(added.refused).toBeNull()
    expect(currentStaff().find((s) => s.id === added.id)?.n).toBe('Nia Brooks')
    expect(removeStaff(ADMIN, 'us')).toBeNull()
    expect(currentStaff().some((s) => s.id === 'us')).toBe(false)
  })

  it('refuses role and department changes that would move staff records', () => {
    const lead = { n: 'Lead', desc: '', p: ['own', 'all', 'people'] }
    expect(saveRole(STAFF, lead, 'lead').refused).toMatch(/“people”/)
    expect(removeRole(LEAD, 'lead')).toMatch(/“people”/)
    expect(saveDept(LEAD, { n: 'Probate', desc: '', auto: false, pair: null, qc: false })).toMatch(/“people”/)
    expect(removeDept(STAFF, must(currentDepts()[0], 'a department').id)).toMatch(/“people”/)
    expect(currentDepts().map((d) => d.n)).not.toContain('Probate')
    expect(saveRole(ADMIN, lead, 'lead')).toEqual({ id: 'lead', refused: null })
  })
})
