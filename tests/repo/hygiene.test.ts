import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import ts from 'typescript'

const ROOT = process.cwd()
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.agents', '.claude', '.playwright-mcp'])
const ALLOWED = /eslint-disable\S* \S.* -- \S|@ts-expect-error|^\/\/\/\s*<reference|AUTO-GENERATED/
const EXEMPT = new Set(['src/styles/design.css'])
const CODE = new Set(['.ts', '.tsx', '.mjs', '.js', '.css', '.html', '.svg', '.sql', '.yml', '.yaml'])
const ROOT_CONFIGS = ['tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'tsconfig.test.json', 'knip.json']
const HASH_FILES = /^(\.env.*|\.gitignore|\.gitattributes|CODEOWNERS)$/

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full.slice(ROOT.length + 1))
  }
  return out
}

const files = walk(ROOT)

function tsComments(src: string, file: string): string[] {
  const kind = file.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : file.endsWith('.json')
      ? ts.ScriptKind.JSON
      : /\.(m?js)$/.test(file)
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, kind)
  const found = new Set<string>()
  const add = (ranges: readonly ts.CommentRange[] | undefined) =>
    ranges?.forEach((r) => found.add(src.slice(r.pos, r.end)))
  const visit = (node: ts.Node) => {
    if (ts.isJsxExpression(node) && !node.expression) found.add(src.slice(node.getStart(sf), node.end))
    add(ts.getLeadingCommentRanges(src, node.getFullStart()))
    add(ts.getTrailingCommentRanges(src, node.end))
    node.getChildren(sf).forEach(visit)
  }
  visit(sf)
  return [...found]
}

function cssComments(src: string): string[] {
  const out: string[] = []
  let quote: string | null = null
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quote) {
      if (c === '\\') i++
      else if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'") quote = c
    else if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      out.push(src.slice(i, end + 2))
      i = end + 1
    }
  }
  return out
}

function commentsIn(file: string): string[] {
  const src = readFileSync(join(ROOT, file), 'utf8')
  const ext = extname(file)
  const base = file.split('/').pop() ?? file
  if (HASH_FILES.test(base) || ext === '.yml' || ext === '.yaml') return src.split('\n').filter((l) => /^\s*#/.test(l))
  if (ext === '.css') return cssComments(src)
  if (ext === '.html' || ext === '.svg') return src.match(/<!--[\s\S]*?-->/g) ?? []
  if (ext === '.sql') return src.split('\n').filter((l) => /^\s*--/.test(l))
  return tsComments(src, file)
}

describe('the repository', () => {
  it('has no comments outside functional directives', () => {
    const scanned = files.filter(
      (f) =>
        !EXEMPT.has(f) &&
        (CODE.has(extname(f)) || ROOT_CONFIGS.includes(f) || HASH_FILES.test(f.split('/').pop() ?? '')),
    )
    expect(scanned.length).toBeGreaterThan(200)
    const offenders = scanned.flatMap((f) =>
      commentsIn(f)
        .filter((c) => !ALLOWED.test(c))
        .map((c) => `${f}: ${c.split('\n')[0]?.slice(0, 80)}`),
    )
    expect(offenders).toEqual([])
  })

  it('has no documents but CLAUDE.md', () => {
    const documents = files.filter((f) => /\.(md|pdf|docx?|txt)$/i.test(f) && !/(^|\/)LICENSE[^/]*$/.test(f))
    expect(documents).toEqual(['CLAUDE.md'])
  })
})
