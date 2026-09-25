import { describe, expect, it } from 'vitest'
import {
  ADMIN_EMAIL,
  adminAccount,
  checkCredentials as check,
  personByEmail,
  staffAccount,
} from './credentials'
import { STAFF } from '@/data/people'
import { ROLELIST } from '@/data/org'
import { saveStaff } from '@/domain/people/roster'
import { newPerson } from '@/domain/people/people'

const anyPassword = 'whatever'
const seed = (email: string, password = anyPassword) =>
  check(email, password, { passwordChecked: false })

const caps = (roleId: string) => ROLELIST.find((r) => r.id === roleId)?.p ?? []

describe('which account an address lands in', () => {
  it('signs the administrator in on their own address', () => {
    const out = seed(ADMIN_EMAIL)
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(caps(out.person.r)).toContain('all')
      expect(caps(out.person.r)).toContain('people')
    }
  })

  it('ignores case and surrounding space on it', () => {
    const out = seed('  Hari@Gmail.com  ')
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.person.id).toBe(adminAccount()?.id)
  })

  it('signs a seeded person in as themselves', () => {
    for (const p of STAFF.filter((x) => x.active !== false)) {
      const out = seed(p.e)
      expect(out.ok, `${p.n} could not sign in`).toBe(true)
      if (out.ok) expect(out.person.id).toBe(p.id)
    }
  })

  it('sends an unfamiliar address to production staff', () => {
    for (const address of ['someone@example.com', 'a.b@c.co.uk', 'test@test.test']) {
      const out = seed(address)
      expect(out.ok, address).toBe(true)
      if (out.ok) {
        expect(caps(out.person.r)).not.toContain('all')
        expect(out.person.dep.length).toBeGreaterThan(0)
      }
    }
  })

  it('keeps the administrator and the staff account distinct', () => {
    expect(adminAccount()?.id).toBeDefined()
    expect(staffAccount()?.id).toBeDefined()
    expect(adminAccount()?.id).not.toBe(staffAccount()?.id)
  })
})

describe('what the form still insists on', () => {
  it('takes any password, because there is nothing yet to check it against', () => {
    for (const pw of ['x', 'password', 'a very long and wrong password']) {
      expect(seed(ADMIN_EMAIL, pw).ok).toBe(true)
      expect(seed('anyone@anywhere.com', pw).ok).toBe(true)
    }
  })

  it('refuses an empty password', () => {
    const out = seed(ADMIN_EMAIL, '')
    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.error).toMatch(/not optional/i)
  })

  it('refuses an empty email', () => {
    expect(seed('').ok).toBe(false)
    expect(seed('   ').ok).toBe(false)
  })

  it('refuses a disabled person on their own address', () => {
    const gone = STAFF.find((p) => p.active === false)
    if (!gone) return
    const out = seed(gone.e)
    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.error).toMatch(/disabled/i)
  })
})

describe('where a database is answering', () => {
  it('refuses the administrator address outright', () => {
    const out = check(ADMIN_EMAIL, anyPassword, { passwordChecked: true })
    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.error).toMatch(/not reachable/i)
  })

  it('refuses every seeded login, and every unfamiliar one', () => {
    for (const address of [...STAFF.map((p) => p.e), 'someone@example.com']) {
      expect(check(address, anyPassword, { passwordChecked: true }).ok, address).toBe(false)
    }
  })
})

describe('looking somebody up', () => {
  it('finds them by their own address', () => {
    expect(personByEmail('ashok.s@keystoneabstract.com')?.id).toBe('sk')
  })

  it('finds nobody for an address on file with no one', () => {
    expect(personByEmail('nobody@keystoneabstract.com')).toBeUndefined()
  })
})

describe('the roster the company edits', () => {
  it('signs in someone added after the seed', () => {
    saveStaff({ id: 'hw', r: 'admin' }, { ...newPerson(), n: 'Nia Brooks', e: 'nia.brooks@keystoneabstract.com' })
    expect(personByEmail('nia.brooks@keystoneabstract.com')?.n).toBe('Nia Brooks')
  })
})
