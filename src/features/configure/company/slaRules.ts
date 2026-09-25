import type { SlaRule } from '@/data/budget'
import type { Product } from '@/data/types'
import { defaultRule } from '@/domain/assignment/sla'

export const underPromised = (sla: SlaRule[], products: Product[]): Product[] => {
  const fb = defaultRule(sla)
  return products.filter((p) => !sla.some((x) => x.pr === p.id) && p.h > fb.h)
}
