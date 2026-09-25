import { createContext, use, useCallback, useMemo, useReducer, type ReactNode } from 'react'
import { board as sharedBoard, computeBoard, resetBoard, type AssignmentBoard } from './engine'
import type { EngineConfig, Rule } from '@/data/types'
import type { RuleDraft } from './ruleText'
import { placementOf } from '@/domain/orders/orders'
import { useSession } from '@/domain/auth/SessionProvider'
import {
  insertAt,
  removeRule,
  saveRule,
  setEngine as setEngineIn,
  toggleRule,
  useRuleBook,
} from './rules'

interface RulesValue {
  rules: Rule[]
  engine: EngineConfig
  board: AssignmentBoard
  version: number
  toggle: (id: string) => string | null
  save: (draft: RuleDraft, id: string | null) => string | null
  remove: (id: string) => string | null
  setEngine: <K extends keyof EngineConfig>(k: K, v: EngineConfig[K]) => string
  rerun: () => void
  dryRun: (draft?: RuleDraft) => { placed: number; unplaced: number }
}

const RulesContext = createContext<RulesValue | null>(null)

export function RulesProvider({ children }: { children: ReactNode }) {
  const { me } = useSession()
  const { rules, engine } = useRuleBook()
  const [runs, rerunNow] = useReducer((n: number) => n + 1, 0)

  const rerun = useCallback(() => {
    resetBoard()
    rerunNow()
  }, [])

  const toggle = useCallback((id: string) => toggleRule(me, id), [me])
  const save = useCallback((draft: RuleDraft, id: string | null) => saveRule(me, draft, id), [me])
  const remove = useCallback((id: string) => removeRule(me, id), [me])
  const setEngine = useCallback(
    <K extends keyof EngineConfig>(k: K, v: EngineConfig[K]) => setEngineIn(me, k, v),
    [me],
  )

  const dryRun = useCallback(
    (draft?: RuleDraft) => {
      let against = rules
      if (draft?.n) {
        against = [...rules]
        against.splice(insertAt(against), 0, {
          id: '__draft',
          n: draft.n,
          k: draft.k,
          on: true,
          cond: draft.cond,
          pool: draft.pool,
        })
      }
      const { placed, open } = placementOf(computeBoard({ rules: against }).run)
      return { placed, unplaced: open }
    },
    [rules],
  )

  const value = useMemo<RulesValue>(
    () => ({
      rules,
      engine,
      get board() {
        return sharedBoard()
      },
      version: runs,
      toggle,
      save,
      remove,
      setEngine,
      rerun,
      dryRun,
    }),
    [rules, engine, runs, toggle, save, remove, setEngine, rerun, dryRun],
  )

  return <RulesContext value={value}>{children}</RulesContext>
}

export function useRules(): RulesValue {
  const ctx = use(RulesContext)
  if (!ctx) throw new Error('useRules must be used inside <RulesProvider>')
  return ctx
}
