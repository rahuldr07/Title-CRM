import type { Lead } from '@/data/types'

type Note = Lead['notes'][number]

export const newestFirst = (notes: Note[]): Note[] => [...notes].sort((a, b) => b.at.getTime() - a.at.getTime())

export const firstContact = (notes: Note[]): Date | null =>
  notes.reduce<Date | null>((m, n) => (m === null || n.at < m ? n.at : m), null)
