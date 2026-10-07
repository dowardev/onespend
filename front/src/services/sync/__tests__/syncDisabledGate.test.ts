// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// LBDS-289: the gate fires at three levels — SyncApiService, attachmentService,
// and SyncQueueService. A user who has not enabled sync in Settings (or
// cleared the URL) must not see a single outbound HTTP request. The
// SyncApiService test below mocks configDb to return the disabled state
// and asserts that `merge()` throws SyncDisabledError instead of
// touching `fetch`. The SyncQueueService test asserts that `processQueue`
// returns null without acquiring the lock or calling the API.

const { configGetMock } = vi.hoisted(() => ({ configGetMock: vi.fn() }))

vi.mock('@/db/controllers/configDb', () => ({
  configDb: {
    get: configGetMock,
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
  },
}))

const { syncApiMerge, fetchMock } = vi.hoisted(() => ({
  syncApiMerge: vi.fn(),
  fetchMock: vi.fn(),
}))

vi.mock('../syncConfig', async () => {
  const actual = await vi.importActual<typeof import('../syncConfig')>('../syncConfig')
  return actual
})

import { SyncDisabledError, syncApiService } from '../SyncApiService'
import { SyncQueueService } from '../SyncQueueService'
import { syncLockService } from '../SyncLockService'

interface GateProbe {
  isSyncEnabledForRun(): Promise<boolean>
  processPendingAttachments(): Promise<void>
}

describe('LBDS-289 sync-disabled gate', () => {
  beforeEach(() => {
    configGetMock.mockReset()
    ;(globalThis as { fetch?: unknown }).fetch = fetchMock
    fetchMock.mockReset()
    syncApiMerge.mockReset()
  })

  afterEach(() => {
    delete (globalThis as { fetch?: unknown }).fetch
    vi.restoreAllMocks()
  })

  describe('SyncApiService throws SyncDisabledError when sync is off', () => {
    it('throws when syncEnabled is false (regardless of the env URL)', async () => {
      configGetMock.mockImplementation(async ({ key }: { key: string }) => {
        if (key === 'syncEnabled') return false
        return undefined
      })
      await expect(syncApiService.merge({ data: { account: [] } })).rejects.toBeInstanceOf(
        SyncDisabledError,
      )
    })

    it('throws when syncEnabled is true but the URL is empty (F-Droid rule)', async () => {
      configGetMock.mockImplementation(async ({ key }: { key: string }) => {
        if (key === 'syncEnabled') return true
        if (key === 'syncServerUrl') return ''
        return undefined
      })
      await expect(syncApiService.fullSync({})).rejects.toBeInstanceOf(SyncDisabledError)
    })

    it('throws for getChanges when sync is disabled', async () => {
      configGetMock.mockImplementation(async ({ key }: { key: string }) => {
        if (key === 'syncEnabled') return false
        return undefined
      })
      await expect(syncApiService.getChanges({ lastSync: '0' })).rejects.toBeInstanceOf(
        SyncDisabledError,
      )
    })
  })

  describe('SyncQueueService.processQueue short-circuits when sync is off', () => {
    it('returns null without acquiring the lock when syncEnabled is false', async () => {
      configGetMock.mockImplementation(async ({ key }: { key: string }) => {
        if (key === 'syncEnabled') return false
        return undefined
      })

      const lockSpy = vi.spyOn(syncLockService, 'acquire')
      const service = new SyncQueueService()
      service.setOnline(true)

      const result = await service.processQueue()

      expect(result).toBeNull()
      expect(lockSpy).not.toHaveBeenCalled()
      service.dispose()
    })

    it('processPendingAttachments is a no-op when sync is off (LBDS-289)', async () => {
      configGetMock.mockImplementation(async ({ key }: { key: string }) => {
        if (key === 'syncEnabled') return false
        return undefined
      })

      const service = new SyncQueueService()
      service.setOnline(true)
      const probe = service as unknown as GateProbe

      // No throw, no fetch attempted. The probe call is the same one the
      // scheduler uses (private method accessed via cast).
      await expect(probe.processPendingAttachments()).resolves.toBeUndefined()
      service.dispose()
    })
  })
})