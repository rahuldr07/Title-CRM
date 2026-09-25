import type { QcEntry } from '@/data/quality'
import type { Person } from '@/data/types'
import { STAFF_CAPABILITY } from '@/domain/auth/permissions'

export type CheckKind = 'all' | 'defect' | 'clean' | 'gave'

export const CHECK_TITLE: Record<CheckKind, string> = {
  all: 'Every check on their work',
  defect: 'Scored 3 or below',
  clean: 'Nothing raised',
  gave: 'Checks they carried out',
}

export const maskAadhaar = (a: string) => (a ? `XXXX XXXX ${a.replace(/\s/g, '').slice(-4)}` : '')

export const checksOf = (kind: CheckKind, rated: QcEntry[], given: QcEntry[]): QcEntry[] =>
  kind === 'gave'
    ? given
    : kind === 'defect'
      ? rated.filter((x) => x.defect)
      : kind === 'clean'
        ? rated.filter((x) => !x.crit)
        : rated

export interface PersonAccess {
  personal: boolean
  performance: boolean
  edit: boolean
}

const WORK_MANAGER = 'assign'

export const personAccess = (
  viewerId: string,
  personId: string,
  can: (capability: string) => boolean,
): PersonAccess => ({
  personal: viewerId === personId || can(STAFF_CAPABILITY),
  performance: viewerId === personId || can(STAFF_CAPABILITY) || can(WORK_MANAGER),
  edit: can(STAFF_CAPABILITY),
})

const withheld = (what: string) =>
  `${what} need the “${STAFF_CAPABILITY}” capability. Ask a company admin if you should be able to see them.`

export const STATUTORY_WITHHELD = withheld('Statutory identifiers and bank details')
export const CONTACT_WITHHELD = withheld('Home address and emergency contact')
export const PERFORMANCE_WITHHELD = `Quality scores, defects and stage timings are a personal record, shown to the person themselves and to whoever holds “${STAFF_CAPABILITY}” or “${WORK_MANAGER}” — the ones who manage people or give out the work. Ask a company admin if you should be able to see them.`

export const contactRows = (
  person: Pick<Person, 'mob' | 'e' | 'addr'>,
  personal: boolean,
): [string, string][] =>
  (
    [
      ['Mobile', person.mob],
      ['Email', person.e],
      ...(personal ? [['Address', person.addr] as [string, string]] : []),
    ] as [string, string][]
  ).filter((r) => r[1])

export type EmergencyView = { kind: 'withheld' } | { kind: 'none' } | { kind: 'known'; emg: Person['emg'] }

export const emergencyView = (person: Pick<Person, 'emg'>, personal: boolean): EmergencyView =>
  !personal ? { kind: 'withheld' } : person.emg?.n ? { kind: 'known', emg: person.emg } : { kind: 'none' }
