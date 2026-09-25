import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, REQUEST_TIMEOUT_MS, fetchMemberships } from './api'

const hang = (_url: string, init?: RequestInit) =>
  new Promise<Response>((_, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
  })

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn(hang))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('a request the server never answers', () => {
  it('gives up after the timeout, as an ApiError', async () => {
    const pending = fetchMemberships(null)
    const settled = expect(pending).rejects.toBeInstanceOf(ApiError)
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)
    await settled
  })

  it('says the server did not answer, not that access was refused', async () => {
    const pending = fetchMemberships(null).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)
    const err = (await pending) as ApiError
    expect(err.isUnauthenticated).toBe(false)
    expect(err.isForbidden).toBe(false)
    expect(err.message).toMatch(/did not answer/)
  })

  it('is still waiting just before the timeout', async () => {
    let done = false
    fetchMemberships(null).catch(() => (done = true))
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toBe(true)
  })
})
