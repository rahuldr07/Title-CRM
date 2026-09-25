import { useEffect } from 'react'
import { setTitlePart, type TitleParts } from '@/shared/lib/docTitle'

export function useTitlePart(key: keyof TitleParts, value: string | undefined, on = true): void {
  useEffect(() => {
    if (!on) return
    setTitlePart(key, value)
    return () => {
      setTitlePart(key, undefined)
    }
  }, [key, value, on])
}
