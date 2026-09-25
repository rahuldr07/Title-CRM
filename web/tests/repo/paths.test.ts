import { describe, expect, it } from 'vitest'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const TREES = ['src', 'server', 'tests']

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`
    out.push(rel)
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out)
  }
  return out
}

const moduleKey = (p: string) => p.toLowerCase().replace(/\.(tsx?|mjs|js)$/, '')

function caseClashes(paths: readonly string[]): string[][] {
  const byKey = new Map<string, string[]>()
  for (const p of paths) byKey.set(moduleKey(p), [...(byKey.get(moduleKey(p)) ?? []), p])
  return [...byKey.values()].filter((group) => group.length > 1)
}

function orphanTests(paths: readonly string[]): string[] {
  const have = new Set(paths)
  return paths.filter((p) => {
    const m = /^(.*\/)([^/.]+)(\.[^/]+)?\.test\.ts$/.exec(p)
    if (!m) return false
    const [, dir, module] = m
    return !have.has(`${dir}${module}.ts`) && !have.has(`${dir}${module}.tsx`)
  })
}

describe('paths', () => {
  it('finds two names an import cannot tell apart on a case-insensitive disk', () => {
    expect(caseClashes(['src/a/LeavePolicy.tsx', 'src/a/leavePolicy.ts', 'src/a/other.ts'])).toEqual([
      ['src/a/LeavePolicy.tsx', 'src/a/leavePolicy.ts'],
    ])
    expect(caseClashes(['src/Reports', 'src/reports'])).toEqual([['src/Reports', 'src/reports']])
    expect(caseClashes(['src/a/leave.ts', 'src/a/leave.test.ts', 'src/a/Leaves.tsx'])).toEqual([])
  })

  it('never differ only by case or extension, so `./x` resolves to one file on every disk', () => {
    const paths = TREES.flatMap((t) => walk(t))
    expect(paths.length).toBeGreaterThan(300)
    expect(caseClashes(paths)).toEqual([])
  })

  it('finds a test named after no module beside it', () => {
    expect(
      orphanTests(['src/a/leads.ts', 'src/a/leads.test.ts', 'src/a/leads.book.test.ts', 'src/a/leadBook.test.ts', 'src/a/Page.tsx', 'src/a/Page.test.ts']),
    ).toEqual(['src/a/leadBook.test.ts'])
  })

  it('names every test under src/ after the module beside it, as <module>.test.ts or <module>.<topic>.test.ts', () => {
    const paths = walk('src')
    expect(paths.filter((p) => p.endsWith('.test.ts')).length).toBeGreaterThan(80)
    expect(orphanTests(paths)).toEqual([])
  })
})
