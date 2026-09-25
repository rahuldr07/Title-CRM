import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, posix } from 'node:path'
import ts from 'typescript'

const ROOT = process.cwd()
const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'set', 'delete', 'clear', 'add'])
const PICKS = new Set(['find', 'at', 'findLast'])

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) sources(full, out)
    else if (/\.tsx?$/.test(name) && !/\.test\.ts$/.test(name)) out.push(full.slice(ROOT.length + 1))
  }
  return out
}

const straight = (spec: string): string =>
  spec.startsWith('@/') ? `@/${posix.normalize(spec.slice(2)).replace(/\/+$/, '').replace(/\.tsx?$/, '')}` : spec

function seedWrites(src: string, file = 'x.ts'): string[] {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const seed = new Set<string>()
  sf.statements.forEach((s) => {
    if (!ts.isImportDeclaration(s) || !ts.isStringLiteral(s.moduleSpecifier)) return
    if (!/^@\/data\//.test(straight(s.moduleSpecifier.text)) || s.importClause?.isTypeOnly) return
    const named = s.importClause?.namedBindings
    if (named && ts.isNamedImports(named)) named.elements.forEach((e) => !e.isTypeOnly && seed.add(e.name.text))
  })
  if (!seed.size) return []

  const rootOf = (e: ts.Expression): string | null => {
    let x: ts.Expression = e
    for (;;) {
      if (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x)) x = x.expression
      else if (ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x) || ts.isAsExpression(x)) x = x.expression
      else if (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && PICKS.has(x.expression.name.text)) x = x.expression.expression
      else break
    }
    return ts.isIdentifier(x) && seed.has(x.text) ? x.text : null
  }

  const found: string[] = []
  const flag = (node: ts.Node, root: string) =>
    found.push(`${file}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1} writes into ${root}`)

  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const root = rootOf(node.initializer)
      if (root && !ts.isIdentifier(node.initializer)) seed.add(node.name.text)
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      const left = node.left
      const root = (ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left)) && rootOf(left)
      if (root) flag(node, root)
    }
    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)) {
      const root = rootOf(node.operand)
      if (root) flag(node, root)
    }
    if (ts.isDeleteExpression(node)) {
      const root = rootOf(node.expression)
      if (root) flag(node, root)
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const { name, expression } = node.expression
      const root = MUTATORS.has(name.text) ? rootOf(expression) : null
      if (root) flag(node, root)
      const target = node.arguments[0]
      if (ts.isIdentifier(expression) && expression.text === 'Object' && name.text === 'assign' && target) {
        const into = rootOf(target)
        if (into) flag(node, into)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

describe('the seed', () => {
  it('is never written by the application — edits go through a store', () => {
    const writes = sources(join(ROOT, 'src')).flatMap((f) => seedWrites(readFileSync(join(ROOT, f), 'utf8'), f))
    expect(writes).toEqual([])
  })

  it('catches every shape of write the screens used to make', () => {
    const lines = [
      "import { LEAVE, LEAVEPOLICY, LEAVETYPES, RULES } from '@/data/hrms'",
      'LEAVE.unshift(x)',
      "LEAVEPOLICY.minCover = 2",
      'Object.assign(LEAVETYPES[0], y)',
      'RULES.splice(0, 1)',
      "const l = LEAVE.find((r) => r.id === id)",
      "l.st = 'approved'",
      "LEAVE.find((r) => r.id === id)!.by = 'x'",
      'LEAVEPOLICY.minCover++',
    ]
    expect(seedWrites(lines.join('\n')).map((w) => w.replace(/^x\.ts:\d+ writes into /, ''))).toEqual([
      'LEAVE',
      'LEAVEPOLICY',
      'LEAVETYPES',
      'RULES',
      'l',
      'LEAVE',
      'LEAVEPOLICY',
    ])
  })

  it('sees a seed import however its path is spelled', () => {
    const spellings = ["'@/./data/hrms'", "'@/data/hrms.ts'", "'@/data//hrms'", "'@/shared/../data/hrms'"]
    for (const from of spellings) {
      expect(seedWrites(`import { LEAVE } from ${from}\nLEAVE.push(x)`)).toEqual(['x.ts:2 writes into LEAVE'])
    }
  })

  it('lets a screen read the seed and copy it', () => {
    const lines = [
      "import { LEAVE } from '@/data/hrms'",
      'const rows = LEAVE.filter((l) => l.st === "pending")',
      'rows.sort((a, b) => a.days - b.days)',
      'const all = [...LEAVE]',
      'all.push(x)',
    ]
    expect(seedWrites(lines.join('\n'))).toEqual([])
  })
})
