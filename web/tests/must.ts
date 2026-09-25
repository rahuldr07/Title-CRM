export function must<T>(value: T | null | undefined, what: string): T {
  if (value === undefined || value === null) throw new Error(`The test needs ${what}, and there is none.`)
  return value
}

export async function one<T>(rows: PromiseLike<readonly T[]>, what: string): Promise<T> {
  return must((await rows)[0], what)
}
