import type { Bank, Person } from '@/data/types'
import { EMAIL_ERROR, bankProblem, idProblem, isDuplicateName, isEmail } from '@/shared/lib/forms'

export const suggestedEmail = (name: string | undefined): string =>
  name ? `${name.toLowerCase().replace(/\s+/g, '.')}@keystoneabstract.com` : ''

export interface StaffTyped {
  name: string
  mail: string
  acct: string
  ifsc: string
  pan: string
  uan: string
  aadhaar: string
}

export function staffProblem(
  typed: StaffTyped,
  staff: readonly Person[],
  id: string | undefined,
  rec: Person | undefined,
): string | null {
  const { name, mail, acct, ifsc, pan, uan, aadhaar } = typed
  if (!name) return 'A name is required.'
  if (!isEmail(mail)) return EMAIL_ERROR
  if (isDuplicateName(staff, mail, (x) => x.e ?? '', (x) => x.id === id))
    return `${mail} already belongs to someone here.`

  const changed = (now: string, was: string | undefined) => now.trim() !== (was ?? '').trim()
  if ((changed(acct, rec?.bank?.acct) || changed(ifsc, rec?.bank?.ifsc)) && (acct.trim() || ifsc.trim())) {
    const bad = bankProblem({ acct, ifsc })
    if (bad) return `${bad}. A salary sent to it would bounce.`
  }
  const ids = [
    ['pan', pan, rec?.pan],
    ['uan', uan, rec?.uan],
    ['aadhaar', aadhaar, rec?.aadhaar],
  ] as const
  for (const [kind, now, was] of ids) {
    const bad = changed(now, was) ? idProblem(kind, now) : null
    if (bad) return `${bad}.`
  }
  return null
}

export const newPerson = (): Person => ({
  id: '',
  n: '',
  dep: [],
  r: 'staff',
  cap: 0,
  open: 0,
  avail: 'ok',
  active: true,
  shift: 'day',
  mob: '',
  addr: '',
  emg: { n: '', rel: '', mob: '' },
  aadhaar: '',
  doj: '',
  dob: '',
  pan: '',
  uan: '',
  esicNo: '',
  bank: { acct: '', ifsc: '', name: '' },
  e: '',
})

export const bankFor = (name: string, acct: string, ifsc: string, was?: Bank): Bank => ({
  ...was,
  name,
  acct: acct.trim(),
  ifsc: ifsc.trim(),
})
