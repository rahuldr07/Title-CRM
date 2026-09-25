export interface NavCounts {
  overdue: number
  followUps: number
  brokenLinks: number
}

export function navBadge(route: string, counts: NavCounts): { n: number; warn: boolean } | null {
  if (route === 'dash' && counts.overdue) return { n: counts.overdue, warn: false }
  if (route === 'leads' && counts.followUps) return { n: counts.followUps, warn: true }
  if (route === 'linkcheck' && counts.brokenLinks) return { n: counts.brokenLinks, warn: false }
  return null
}
