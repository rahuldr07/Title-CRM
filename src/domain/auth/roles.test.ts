import { describe, expect, it } from 'vitest'
import { removeRole, savePerm, saveRole } from './roles'
import { companyStore } from '@/domain/company/companyStore'
import { can, roleOf, type Actor } from './permissions'
import { personById, saveStaff } from '@/domain/people/roster'
import { must } from '../../../tests/must'

const ADMIN: Actor = { id: 'hw', r: 'admin' }

function hrClerk(): Actor {
  const made = saveRole(ADMIN, { n: 'HR clerk', desc: 'Keeps staff records', p: ['own', 'people'] })
  return { id: 'us', r: must(made.id, 'the HR role') }
}

describe('what a role editor may grant', () => {
  it('refuses a “people” holder the capabilities they do not hold, and names each one', () => {
    const hr = hrClerk()
    for (const k of ['all', 'config', 'pricing']) {
      const out = saveRole(hr, { n: `With ${k}`, desc: '', p: ['own', k] })
      expect(out.id, k).toBeNull()
      expect(out.refused, k).toContain(`“${k}”`)
    }
  })

  it('refuses raising their own role past what they hold', () => {
    const hr = hrClerk()
    const own = roleOf(hr.r)
    const out = saveRole(hr, { ...own, p: [...own.p, 'pricing'] }, hr.r)
    expect(out.refused).toContain('“pricing”')
    expect(roleOf(hr.r).p).not.toContain('pricing')
  })

  it('refuses taking away a capability they do not hold, so they cannot strip a role above them', () => {
    const hr = hrClerk()
    const lead = roleOf('lead')
    const out = saveRole(hr, { ...lead, p: lead.p.filter((k) => k !== 'assign') }, 'lead')
    expect(out.refused).toContain('“assign”')
    expect(roleOf('lead').p).toContain('assign')
  })

  it('lets them grant what they hold themselves', () => {
    const hr = hrClerk()
    const out = saveRole(hr, { n: 'Recruiter', desc: '', p: ['own', 'people'] })
    expect(out.refused).toBeNull()
  })

  it('refuses handing a person a role that holds more than the one handing it out', () => {
    const hr = hrClerk()
    const me = must(personById('us'), 'Uma')
    const out = saveStaff(hr, { ...me, r: 'admin' }, 'us')
    expect(out.refused).toMatch(/“(all|assign|pricing|config|export)”/)
    expect(personById('us')?.r).toBe('staff')
  })

  it('lets the company admin grant anything a role may hold', () => {
    const out = saveRole(ADMIN, { n: 'Billing', desc: '', p: ['own', 'all', 'config', 'pricing'] })
    expect(out.refused).toBeNull()
    expect(can({ r: must(out.id, 'the new role') }, 'pricing')).toBe(true)
  })
})

describe('a locked role', () => {
  it('stays locked, whoever saves it', () => {
    const staff = roleOf('staff')
    expect(saveRole(ADMIN, { ...staff, lock: false }, 'staff').refused).toBeNull()
    expect(roleOf('staff').lock).toBe(true)
  })

  it('cannot be removed, even by the admin', () => {
    expect(removeRole(ADMIN, 'staff')).toMatch(/cannot be removed/)
    expect(removeRole(ADMIN, 'admin')).toMatch(/cannot be removed/)
    expect(roleOf('admin').id).toBe('admin')
  })

  it('cannot be edited by someone holding less than it does', () => {
    const hr = hrClerk()
    const admin = roleOf('admin')
    expect(saveRole(hr, { ...admin, n: 'Boss' }, 'admin').refused).toMatch(/“(all|assign|pricing|qc|config|export)”/)
    expect(roleOf('admin').n).toBe('Company admin')
  })
})

describe('rewording a permission', () => {
  const wordingOf = (k: string) => companyStore.get().perms.find((p) => p.k === k)?.n

  it('refuses a built-in one the editor does not hold, and leaves its wording alone', () => {
    const hr = hrClerk()
    const was = wordingOf('pricing')
    expect(savePerm(hr, 'Nothing much', 'pricing')).toMatch(/hold it yourself/)
    expect(wordingOf('pricing')).toBe(was)
  })

  it('lets a holder of a built-in one reword it', () => {
    expect(savePerm(ADMIN, 'See prices, fees and invoices', 'pricing')).toBeNull()
    expect(wordingOf('pricing')).toBe('See prices, fees and invoices')
  })

  it('lets a people holder add and reword a descriptive one of the company’s own', () => {
    const hr = hrClerk()
    expect(savePerm(hr, 'Approve a rush order')).toBeNull()
    const k = must(companyStore.get().perms.find((p) => p.n === 'Approve a rush order'), 'the new permission').k
    expect(savePerm(hr, 'Approve a rush job', k)).toBeNull()
    expect(wordingOf(k)).toBe('Approve a rush job')
  })
})
