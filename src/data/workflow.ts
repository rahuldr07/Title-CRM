export interface NamingRow {
  concept: string
  name: string
  short: string
  used: string
  stage: string | null
  status: string | null
}

export const NAMING: NamingRow[] = [
  { concept: 'Title search', name: 'Search', short: 'S', used: 'board, reports, exports', stage: 'Search', status: 'search' },
  { concept: 'Second search check', name: 'Search QC', short: 'S.Q', used: 'board, reports, exports', stage: 'Search QC', status: 'sq' },
  { concept: 'Data entry', name: 'Typing', short: 'T', used: 'board, reports, exports', stage: 'Typing', status: 'typing' },
  { concept: 'Typing check', name: 'Typing QC', short: 'T.Q', used: 'board, reports, exports', stage: 'Typing QC', status: 'tqc' },
  { concept: 'Ready to send', name: 'RTS', short: 'RTS', used: 'board', stage: 'RTS', status: 'rts' },
  { concept: 'Document request', name: 'Doc Req', short: 'DR', used: 'board, exception branch', stage: 'Doc Req', status: 'docreq' },
  { concept: 'Delivered', name: 'Sent', short: '—', used: 'reports, invoicing', stage: null, status: 'sent' },
]

export interface ClockCfg {
  start: string
  run: string
  tz: string
  pause: Record<string, boolean>
}

export const CLOCK: ClockCfg = {
  start: 'email',
  run: '247',
  tz: 'ET',
  pause: {
    'Doc Req': true,
    'Fee Approval': true,
    Clarification: true,
    'Eff Date': true,
    Hold: true,
    Search: false,
    Typing: false,
  },
}
