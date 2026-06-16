import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('SyncLockService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('releases the Web Lock so it can be re-acquired', async () => {
    const { SyncLockService } = await import('@/services/sync/SyncLockService')
    const service = new SyncLockService()

    if (!navigator.locks) {
      console.warn('Web Locks not available in test env, skipping')
      return
    }

    const acquired1 = await service.acquire({ timeoutMs: 1000 })
    expect(acquired1).toBe(true)

    service.release()

    const service2 = new SyncLockService()
    const acquired2 = await service2.acquire({ timeoutMs: 1000 })
    expect(acquired2).toBe(true)

    service2.release()
  })
})
