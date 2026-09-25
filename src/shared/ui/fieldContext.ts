import { createContext } from 'react'

export interface FieldBinding {
  id?: string | undefined
  labelId?: string | undefined
  describedBy?: string | undefined
  invalid?: boolean | undefined
}

export const FieldContext = createContext<FieldBinding | null>(null)
