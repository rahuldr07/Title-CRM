import { stageName } from '@/domain/company/naming'
import { currentDepts } from '@/domain/company/departments'
import { currentStaff } from '@/domain/people/roster'
import { currentCheck as CHECK_OF } from '@/domain/counties/counties'
import { brokenLinks, nextLinkCheck } from '@/domain/counties/links'
import { pastDueCount } from '@/domain/orders/orderCounts'
import { followUpCount } from '@/domain/leads/leads'
import { now } from '@/shared/lib/clock'
import { daysSince, fmtDate } from '@/shared/lib/format'

const thinDepts = () =>
  currentDepts().filter(
    (d) => currentStaff().filter((x) => x.dep.includes(d.n) && x.active !== false && x.avail === 'ok').length === 0,
  )

export interface Alert {
  k: 'broken-links' | 'link-check-due' | 'past-due' | 'follow-up' | 'thin-depts'
  sev: 'bad' | 'warn'
  t: string
  d: string
  go: string
}

export function alerts(): Alert[] {
  const out: Alert[] = []
  const bl = brokenLinks()
  if (bl.length) {
    const names = [...new Set(bl.map((x) => x.c.n))]
    const since = daysSince(CHECK_OF().last)
    out.push({
      k: 'broken-links',
      sev: 'bad',
      t: `${bl.length} county link${bl.length === 1 ? '' : 's'} not working`,
      d: `${names.slice(0, 3).join(', ')}${names.length > 3 ? ' and others' : ''} — found by the check ${
        since === 0 ? 'today' : since + ' days ago'
      }`,
      go: 'linkcheck',
    })
  }
  if (now() >= nextLinkCheck()) {
    out.push({
      k: 'link-check-due',
      sev: 'warn',
      t: 'Link check is due',
      d: `Every ${CHECK_OF().every} days · last ran ${fmtDate(CHECK_OF().last)}`,
      go: 'linkcheck',
    })
  }
  const overdue = pastDueCount()
  if (overdue) {
    out.push({
      k: 'past-due',
      sev: 'bad',
      t: `${overdue} order${overdue === 1 ? '' : 's'} past due`,
      d: 'The client is already owed an explanation',
      go: 'orders',
    })
  }
  const fu = followUpCount()
  if (fu) {
    out.push({
      k: 'follow-up',
      sev: 'warn',
      t: `${fu} lead${fu === 1 ? '' : 's'} need following up`,
      d: 'Flagged, or gone quiet on their own',
      go: 'leads',
    })
  }
  const thin = thinDepts()
  if (thin.length) {
    out.push({
      k: 'thin-depts',
      sev: 'bad',
      t: `${thin.map((d) => stageName(d.n)).join(', ')} has nobody available`,
      d: 'Any order needing that stage has nowhere to go',
      go: 'company',
    })
  }
  return out
}
