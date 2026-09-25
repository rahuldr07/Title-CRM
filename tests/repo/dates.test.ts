import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const FORMATTER = 'src/shared/lib/format.ts'

const RULES: [RegExp, string][] = [
  [/\.toLocale(Date|Time)String\(|\.to(Date|Time|UTC)String\(|\.toLocaleString\([^)]*\b(month|weekday|day|hour)\b/, 'a locale date print ignores the company’s format — use fmtDate()'],
  [/pad\([^)]*\.get(Date|Month)\(\)/, 'a date built by hand ignores the company’s format — use fmtDate()'],
  [/getMonth\(\)\s*\+\s*1\)?\}\s*\//, 'a date built by hand ignores the company’s format — use fmtDate()'],
  [/(?<![\w.-])\d{1,2}\/\d{1,2}\/\d{4}\b/, 'a date written out in the source prints in one format only — hold a Date and print it with fmtDate()'],
  [/[=!]==\s*fmtDate\(|fmtDate\([^()]*(\([^()]*\))?\)\s*[=!]==/, 'a printed date changes with the company’s format — compare iso() keys or usDate() strings instead'],
  [/(?<!(key|value)=)\{\s*[\w?.]+\.dk\s*\}/, 'a day key is for matching, not for reading — print fmtDate() of the date'],
  [/(?<!value=)\{\s*[\w?.]+\.(doj|dob|recorded)\s*(\|\||\?\?|\})/, 'the seed stores this date as MM/DD/YYYY — print it through fmtUsDate()'],
]

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) sources(full, out)
    else if (/\.tsx?$/.test(name) && !/\.test\.ts$/.test(name)) out.push(full.slice(ROOT.length + 1))
  }
  return out
}

const offences = (file: string, text: string): string[] =>
  text.split('\n').flatMap((line, i) =>
    RULES.filter(([re]) => re.test(line)).map(([, why]) => `${file}:${i + 1} ${why}: ${line.trim()}`),
  )

describe('every date on screen', () => {
  it('is printed by the one formatter, in the format the company picked', () => {
    const found = sources(join(ROOT, 'src'))
      .filter((f) => !f.startsWith('src/data/') && f !== FORMATTER)
      .flatMap((f) => offences(f, readFileSync(join(ROOT, f), 'utf8')))
    expect(found).toEqual([])
  })

  it('catches each way a screen used to print one past it', () => {
    const lines = [
      'l.reqAt.toDateString()',
      "d.toLocaleDateString('en-US')",
      '{pad(d.getDate())}/{pad(d.getMonth() + 1)}',
      '`${d.getFullYear()}-${pad(d.getMonth() + 1)}/x`',
      "Next holiday on '08/15/2026'",
      "HOLIDAYS.find((h) => h.d === fmtDate(d))",
      '<Cell v={x.dk} mono />',
      "joined {p.doj || '—'}",
      '<div>{d.recorded}</div>',
    ]
    expect(lines.filter((l) => !offences('x.tsx', l).length)).toEqual([])
  })

  it('lets a key, a comparison and a number through', () => {
    const lines = [
      '<option key={d.dk} value={d.dk}>',
      "run.assigns.filter((a) => a.dk === day)",
      'Math.round((t.annual * (now().getMonth() + 1)) / 12)',
      'value={d.recorded}',
      "{p.doj ? fmtUsDate(p.doj) : '—'}",
      "bookPage: '736/935'",
    ]
    expect(lines.flatMap((l) => offences('x.tsx', l))).toEqual([])
  })
})
