import { useUi } from '@/shared/ui/UiProvider'

export function useRefusal(): (refused: string | null) => boolean {
  const { toast } = useUi()
  return (refused) => {
    if (refused) toast(refused)
    return !refused
  }
}
