import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const TESTS = ['**/*.test.ts']
const UP = { regex: '(^|/)\\.\\./', message: 'Leave this folder through `@/`, so the boundary rules can see where the import goes.' }
const APP = { regex: '^@/app(/|$)', message: '`app/` is the shell that composes everything else; nothing below it may import it.' }
const FEATURE = { regex: '^@/features(/|$)', message: '`shared/` and `domain/` serve every feature, so they cannot depend on one. Move what they need down.' }
const UI = { regex: '^@/shared/(ui|hooks|editors)(/|$)', message: 'Rules and stores do not depend on the components and hooks built on them.' }
const DOMAIN = { regex: '^@/domain(/|$)', message: '`shared/lib` knows nothing about orders, pay or people; that belongs in `domain/`.' }
const FEATURES = [
  'production/dashboard', 'production/orders', 'production/assignment', 'production/intake',
  'production/commitment', 'production/my-work', 'production/my-performance',
  'business/leads', 'business/invoicing', 'business/clients',
  'hrms/attendance', 'hrms/leave', 'hrms/payroll', 'hrms/payslips', 'hrms/recruitment', 'hrms/petty-cash', 'hrms/loans',
  'reference/counties', 'reference/link-monitor',
  'insight/reports',
  'configure/company', 'configure/integrations', 'configure/onboarding',
  'auth/sign-in',
  'configure/people',
]
const COMPANY = 'src/domain/company/companyStore.ts'
const COVERAGE = 'src/domain/counties/counties.ts'
const LEAVE = 'src/domain/leave/leaveStore.ts'
const SEED_OWNED = [
  [COMPANY, '@/data/catalog', ['CLIENTS'], 'Read clients through `useClients()` / `currentClients()` in @/domain/company/clients; the seed never sees an edit.'],
  [COMPANY, '@/data/people', ['STAFF'], 'Read the roster through `useStaff()` / `currentStaff()` / `personById()` in @/domain/people/roster; the seed never sees an edit.'],
  [COMPANY, '@/data/org', ['ROLELIST', 'PERMS'], 'Read roles and permissions through `useRoles()` / `currentRoles()` / `usePerms()` in @/domain/auth/roles, and capabilities through `can()` in @/domain/auth/permissions; the seed never sees an edit.'],
  [COMPANY, '@/data/org', ['DEPTLIST'], 'Read departments through `useDepartments()` / `currentDepts()` in @/domain/company/departments; the seed never sees an edit.'],
  [COMPANY, '@/data/org', ['STATUS'], 'Read order statuses through `useStatuses()` / `currentStatuses()` / `statusName()` in @/domain/company/statuses; the seed never sees an edit.'],
  [COMPANY, '@/data/org', ['TENANTS'], 'Read workspaces through `useWorkspaces()` / `currentWorkspaces()` in @/domain/company/company; the current one carries the name the Company tab edits.'],
  [COMPANY, '@/data/hrms', ['PAYCFG'], 'Read pay settings through `payCfgOf(month)` in @/domain/payroll/payruns (a closed month keeps what it was approved with) or `currentPayCfg()` in @/domain/company/company.'],
  [COMPANY, '@/data/workflow', ['NAMING', 'CLOCK'], 'Read stage names through `stageName()` / `useStageName()` in @/domain/company/naming, status names through `statusName()` in @/domain/company/statuses, and the SLA clock through `useClock()` in @/domain/assignment/turnaround; the seed never sees an edit.'],
  [COMPANY, '@/data/budget', ['SLA', 'BUDGET'], 'Read turnaround promises and stage budgets through `useSla()` / `currentSla()` / `useBudget()` / `currentBudget()` in @/domain/assignment/turnaround; the seed never sees an edit.'],
  [COVERAGE, '@/data/catalog', ['COUNTIES', 'LINKTYPES', 'LINKCHECK'], 'Read counties, link types and the link check through `useCoverage()` / `currentCounties()` / `currentLinkTypes()` / `currentCheck()` in @/domain/counties/counties; the seed never sees an edit.'],
  ['src/domain/orders/orders.ts', '@/data/documents', ['SEED_DOCS'], 'Read an order’s documents through `docsOf()` in @/domain/orders/orders; the seed never sees an edit.'],
  ['src/domain/orders/orders.ts', '@/data/production', ['ORDERS'], 'Read orders through `allOrders()` / `useOrders()` / `orderById()` in @/domain/orders/orders; the seed holds 8 of them.'],
  ['src/domain/invoices/*.ts', '@/data/business', ['INVOICES'], 'Read invoices through `invoicesNow()` / `statusOf()` in @/domain/invoices/invoices; the seed status does not move when terms run out.'],
  ['src/domain/leads/leads.ts', '@/data/business', ['LEADS'], 'Read leads through `useLeads()` / `currentLeads()` / `leadById()` in @/domain/leads/leads; the seed never sees an edit.'],
  [LEAVE, '@/data/hrms', ['LEAVE', 'LEAVEPOLICY', 'LEAVETYPES'], 'Read leave through `useLeave()` / `currentLeave()` / `useLeavePolicy()` / `useLeaveTypes()` in @/domain/leave/leaveStore, and balances through `leaveBalance()` in @/domain/leave/balance; the seed never sees a decision.'],
  ['src/domain/attendance/timeRules.ts', '@/data/hrms', ['TIMECFG'], 'Read the attendance and overtime rules through `useTimeRules()` / `currentTimeRules()` in @/domain/attendance/timeRules; the seed never sees an edit.'],
  ['src/domain/attendance/timeclock.ts', '@/data/attendance', ['SWAPS'], 'Read swaps through `useTimeclock()` in @/domain/attendance/TimeclockProvider; the seed never sees a decision.'],
  ['src/domain/payroll/overtime.ts', '@/data/hrms', ['OT'], 'Read overtime through `useOvertime()` / `currentOvertime()` in @/domain/payroll/overtime; the seed never sees a decision.'],
  ['src/domain/loans/loanStore.ts', '@/data/loans', ['LOANS', 'LOANPAYMENTS', 'LOANEVENTS'], 'Read loans through `currentLoans()` / `currentLoanPayments()` in @/domain/loans/loanStore; the seed never sees a repayment.'],
  ['src/domain/auth/roles.ts', '@/data/org', ['ADMIN_FLOOR'], 'Read the admin floor through `ADMIN_FLOOR` in @/domain/auth/roles, which includes “all”; the generated copy leaves it out.'],
  ['src/domain/assignment/rules.ts', '@/data/org', ['RULES', 'ENGINE'], 'Read the assignment rules through `useRules()` in @/domain/assignment/RulesProvider or `currentRules()` in @/domain/assignment/rules; the seed never sees an edit.'],
  ['src/domain/assignment/levels.ts', '@/data/org', ['LEVELS'], 'Read levels through `useLevels()` / `currentLevels()` in @/domain/assignment/levels; the seed never sees an edit.'],
  ['src/domain/quality/qcRules.ts', '@/domain/quality/quality', ['QC_RULES'], 'Read the QC rules through `useQcRules()` / `ruleOn()` in @/domain/quality/qcRules; the defaults never see an edit.'],
  ['src/features/hrms/petty-cash/pettyStore.ts', '@/data/hrms', ['PETTY', 'PETTYCFG', 'COUNTS'], 'Read petty cash through `useBox()` in @/features/hrms/petty-cash/pettyStore; the seed never sees an entry.'],
  ['src/features/hrms/recruitment/hiring.ts', '@/data/hrms', ['CANDIDATES', 'OPENINGS'], 'Read candidates and openings through `useBoard()` in @/features/hrms/recruitment/hiring; the seed never sees a move.'],
  ['src/features/production/my-work/updates.ts', '@/data/production', ['UPDATES'], 'Read updates through `useUpdates()` in @/features/production/my-work/updates; the seed never sees a post.'],
]
const seedPaths = (owner) =>
  SEED_OWNED.filter(([o]) => o !== owner).map(([, name, importNames, message]) => ({ name, importNames, message }))
const SEED = seedPaths(null)
const OWNERS = [...new Set(SEED_OWNED.map(([o]) => o))]
const crossFeature = (f) => ({
  regex: `^@/features/(?!${f}/)`,
  message: `${f} cannot reach into another feature. What two features share belongs in shared/ or domain/.`,
})
const ownerPatterns = (owner) => {
  const f = FEATURES.find((x) => owner.startsWith(`src/features/${x}/`))
  return f ? [UP, APP, crossFeature(f)] : [UP, APP, FEATURE, UI]
}
const CLOCK = [
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: 'Read the clock through `now()` from @/shared/lib/clock, not `new Date()`.',
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: 'Read the clock through `now()` from @/shared/lib/clock, not `Date.now()`.',
  },
]
const HAND_TABLE =
  'Build table rows with `FlexTable`, `FlexRow` and `Cell` from @/shared/ui/FlexTable. A hand-made `.trow`/`.cell` gets no column name, so on a phone its values show unlabelled.'
const TABLE_CLASS = '/(^|\\s)(trow|cell)(\\s|$)/'
const TABLE = [
  { selector: `JSXAttribute[name.name='className'] Literal[value=${TABLE_CLASS}]`, message: HAND_TABLE },
  { selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=${TABLE_CLASS}]`, message: HAND_TABLE },
]
const SHARED = {
  button: '`Btn`, `Press`, `IconButton`, `Pill` or `LinkButton` from @/shared/ui/Button, `Seg` from @/shared/ui/Tabs, or `CellButton` from @/shared/ui/MatrixTable',
  input: '`Input`, `Checkbox` or `Radio` from @/shared/ui/Controls, labelled by a `Field`',
  select: '`Select` from @/shared/ui/Controls, labelled by a `Field`',
  textarea: '`Textarea` from @/shared/ui/Controls, labelled by a `Field`',
  table: '`MatrixTable` and `Th` from @/shared/ui/MatrixTable, or `FlexTable` / `DataTable`',
  label: '`Field` from @/shared/ui/Form, the one thing that labels a control',
  a: '`Anchor` or `MailLink` from @/shared/ui/Anchor, or `WebLink` for an external address',
}
const RAW = Object.entries(SHARED).map(([tag, use]) => ({
  selector: `JSXOpeningElement[name.name='${tag}']`,
  message: `Screens are built from shared components: use ${use} instead of a raw <${tag}>, so the design's classes and an accessible name come with it.`,
}))
const SRC = { regex: '^src/', message: 'Import through `@/`, never the bare `src/` path, so the boundary rules can see where the import goes.' }
const STRAIGHT = [
  {
    regex: '^@/(.*/)?(\\.{1,2})?(/|$)',
    message: 'Write the `@/` path straight — no `./`, `../`, doubled or trailing slash. Every boundary and seed rule matches the plain path, so a detour past them reads as a different module.',
  },
  {
    regex: '\\.[cm]?[jt]sx?$',
    message: 'Import without a `.ts`/`.tsx`/`.js` suffix. The seed rules name each module by its plain path, and a suffix makes it a different string.',
  },
]
const LAYERS = 'data|shared/(lib|ui|hooks|editors)|domain|features|app|styles'
const PLACED = {
  regex: `^@/(?!(${LAYERS})(/|$))`,
  message: 'Import from a layer folder (data, shared/lib, shared/ui, shared/hooks, shared/editors, domain, features, app). A folder outside them belongs to no layer, so the boundary rules cannot place it.',
}
const BASE = [SRC, ...STRAIGHT, PLACED]
const LITERAL = {
  selector: "ImportExpression[source.type!='Literal']",
  message: 'Give `import()` a plain string. A built path is matched by no boundary or seed rule, so it can reach anything.',
}
const SEED_MODULES = [...new Set(SEED_OWNED.map(([, name]) => name))]
const SEED_DYNAMIC = SEED_MODULES.map((name) => ({
  selector: `ImportExpression[source.value='${name}']`,
  message: `Import ${name} statically. The seed rules check each name taken from it, and \`import()\` hands back the whole module without naming any.`,
}))
const restrict = (...patterns) => ({ 'no-restricted-imports': ['error', { patterns: [...BASE, ...patterns], paths: SEED }] })
const dynamic = (patterns) =>
  [...BASE, ...patterns].map(({ regex, message }) => ({
    selector: `ImportExpression[source.value=/${regex.replaceAll('/', '\\x2F')}/]`,
    message: `${message} A dynamic \`import()\` crosses the same boundary.`,
  }))
const syntax = (patterns, { clock = true, screen = false } = {}) => ({
  'no-restricted-syntax': ['error', ...(clock ? CLOCK : []), ...(screen ? [...TABLE, ...RAW] : []), ...dynamic(patterns), ...SEED_DYNAMIC, LITERAL],
})
const layer = (files, patterns, opts) => ({
  files,
  ignores: TESTS,
  rules: { ...restrict(...patterns), ...syntax(patterns, opts) },
})
const APP_PATTERNS = [UP]
const LIB_PATTERNS = [UP, APP, FEATURE, DOMAIN, UI]
const UNLISTED = { regex: '^@/features/', message: 'List this feature in FEATURES in eslint.config.js.' }
const DATA = { regex: '^@/|(^|/)\\.\\.(/|$)', message: 'Seed data is the bottom layer and imports nothing from the application — only `./types` and its own JSON.' }
const ROOT = {
  regex: '^(\\.|@/)',
  message: 'Code lives in a layer folder under src/ (data, shared, domain, features, app). A module at the root belongs to none, so the boundary rules cannot place it.',
}
const SERVER = [
  {
    regex: '(^|/)src/(?!data/)',
    message: 'The server shares the seed with the front end and nothing else; what both need belongs in `src/data`.',
  },
  {
    regex: 'src/data/(.*/)?\\.\\.(/|$)',
    message: 'Reach the seed by a straight path: a `..` after `src/data` climbs back out of it.',
  },
  { regex: '^@/', message: 'The server has no `@/` alias; reach the seed as `src/data` by a relative path.' },
]

export default tseslint.config(
  { ignores: ['dist', 'drizzle', '.vercel', 'coverage', 'shots', '.claude'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/data/*.ts', '!src/data/types.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-duplicate-imports': ['error', { includeExports: true, allowSeparateTypeImports: false }],
      'no-restricted-syntax': ['error', ...CLOCK],
    },
  },
  {
    files: ['src/features/**/*.tsx', 'src/app/**/*.tsx', 'src/shared/{hooks,editors}/**/*.tsx'],
    rules: { 'no-restricted-syntax': ['error', ...CLOCK, ...TABLE, ...RAW] },
  },
  {
    files: ['src/**/*.tsx'],
    rules: { 'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }] },
  },
  {
    files: ['src/**/*.ts'],
    ignores: [...TESTS, 'src/data/**'],
    rules: { 'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }] },
  },
  layer(['src/**/*.{ts,tsx}'], [{ ...ROOT, message: PLACED.message }]),
  layer(['src/*.{ts,tsx}'], [ROOT]),
  layer(['src/app/**/*.{ts,tsx}'], APP_PATTERNS, { screen: true }),
  layer(['src/shared/lib/**/*.{ts,tsx}'], LIB_PATTERNS),
  layer(['src/shared/ui/**/*.{ts,tsx}'], [UP, APP, FEATURE]),
  layer(['src/shared/{hooks,editors}/**/*.{ts,tsx}'], [UP, APP, FEATURE], { screen: true }),
  layer(['src/domain/**/*.{ts,tsx}'], [UP, APP, FEATURE, UI]),
  layer(['src/features/**/*.{ts,tsx}'], [UP, APP, UNLISTED], { screen: true }),
  ...FEATURES.map((f) => layer([`src/features/${f}/**/*.{ts,tsx}`], [UP, APP, crossFeature(f)], { screen: true })),
  ...OWNERS.map((owner) => ({
    files: [owner],
    ignores: TESTS,
    rules: {
      'no-restricted-imports': ['error', { patterns: [...BASE, ...ownerPatterns(owner)], paths: seedPaths(owner) }],
      ...syntax(ownerPatterns(owner), { screen: true }),
    },
  })),
  {
    files: ['src/data/**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    rules: { ...restrict(DATA), ...syntax([DATA]) },
  },
  {
    files: ['src/shared/lib/clock.ts'],
    rules: syntax(LIB_PATTERNS, { clock: false }),
  },
  {
    files: ['src/app/main.tsx'],
    rules: syntax(APP_PATTERNS, { clock: false, screen: true }),
  },
  {
    files: ['tests/db/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['server/**/*.ts', 'api/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: SERVER }],
      'no-restricted-syntax': ['error', ...dynamic(SERVER).slice(1), LITERAL],
    },
  },
  {
    extends: [js.configs.recommended],
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.browser } },
  },
)
