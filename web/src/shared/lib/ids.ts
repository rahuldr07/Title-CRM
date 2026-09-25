export const nextId = (prefix: string, taken: readonly string[]): string =>
  prefix +
  (taken.reduce((max, id) => (id.startsWith(prefix) ? Math.max(max, Number(id.slice(prefix.length)) || 0) : max), 0) + 1)
