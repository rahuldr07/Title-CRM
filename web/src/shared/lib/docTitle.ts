export const APP_NAME = 'Title CRM'

export interface TitleParts {
  page?: string | undefined
  tab?: string | undefined
  workspace?: string | undefined
}

export const docTitle = ({ page, tab, workspace }: TitleParts): string =>
  [tab === page ? undefined : tab, page, workspace, APP_NAME].filter((p): p is string => !!p).join(' · ')

const parts: TitleParts = {}

export function setTitlePart(key: keyof TitleParts, value: string | undefined): string {
  parts[key] = value
  const title = docTitle(parts)
  if (typeof document !== 'undefined') document.title = title
  return title
}
