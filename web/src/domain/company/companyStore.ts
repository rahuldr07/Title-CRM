import { PAYCFG } from '@/data/hrms'
import { DEPTLIST, PERMS, ROLELIST, STATUS, TENANTS } from '@/data/org'
import { STAFF } from '@/data/people'
import { CLIENTS } from '@/data/catalog'
import { BUDGET, SLA, type SlaRule } from '@/data/budget'
import { createStore } from '@/shared/lib/store'
import { CLOCK, NAMING, type ClockCfg, type NamingRow } from '@/data/workflow'
import type { Client, Dept, PayConfig, Perm, Person, Role, Tenant } from '@/data/types'
import type { DateFormat } from '@/shared/lib/format'

export type { ClockCfg, NamingRow }

export type Budget = typeof BUDGET

export type Profile = Pick<Tenant, 'name' | 'state'> & { tz: string; dateFormat: DateFormat }

export type StatusRow = [string, [string, string]]

export interface CompanyState {
  pay: PayConfig
  profile: Profile
  depts: Dept[]
  statuses: StatusRow[]
  naming: NamingRow[]
  sla: SlaRule[]
  budget: Budget
  clock: ClockCfg
  staff: Person[]
  clients: Client[]
  roles: Role[]
  perms: Perm[]
  tenants: Tenant[]
}

const FIRST = TENANTS[0]

export const SEEDED_TENANT_ID = FIRST?.id ?? ''

const SEED: CompanyState = {
  pay: PAYCFG,
  profile: { name: FIRST?.name ?? '', state: FIRST?.state ?? '', tz: 'India Standard Time', dateFormat: 'MM/DD/YYYY' },
  depts: DEPTLIST,
  statuses: Object.entries(STATUS),
  naming: NAMING,
  sla: SLA,
  budget: BUDGET,
  clock: CLOCK,
  staff: STAFF,
  clients: CLIENTS,
  roles: ROLELIST,
  perms: PERMS,
  tenants: TENANTS,
}

export const companyStore = createStore<CompanyState>(SEED)

export const keyOf = (n: string): string => n.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'perm'
