// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// LBDS-289: the sync gate lives in `services/sync/syncConfig.ts`. Every
// HTTP-touching service (SyncApiService, attachmentService, SyncQueueService)
// reads through `resolveApiBaseUrl()` and the gate must behave correctly
// for the three states that matter:
//   - sync disabled + no URL  -> resolveApiBaseUrl returns null
//   - sync enabled + URL set  -> returns the user's URL (not the env fallback)
//   - sync enabled + URL empty -> returns null (no silent fallback)

vi.mock('@/db/controllers/configDb', () => ({
  configDb: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
  },
}))

import { configDb } from '@/db/controllers/configDb'
import {
  isSyncEnabled,
  getSyncServerUrl,
  readSyncConfig,
  resolveApiBaseUrl,
  setSyncEnabled,
  setSyncServerUrl,
  isValidSyncServerUrl,
  defaultSyncServerUrl,
  SYNC_ENABLED_KEY,
  SYNC_SERVER_URL_KEY,
} from '../syncConfig'

const configDbMock = configDb as unknown as {
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

describe('syncConfig (LBDS-289)', () => {
  beforeEach(() => {
    configDbMock.get.mockReset()
    configDbMock.set.mockReset()
    configDbMock.delete.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isSyncEnabled', () => {
    it('returns false when the row is missing (fresh install)', async () => {
      configDbMock.get.mockResolvedValue(undefined)
      expect(await isSyncEnabled()).toBe(false)
      expect(configDbMock.get).toHaveBeenCalledWith({ key: SYNC_ENABLED_KEY })
    })

    it('returns true when the persisted value is true', async () => {
      configDbMock.get.mockResolvedValue(true)
      expect(await isSyncEnabled()).toBe(true)
    })

    it('returns false when the persisted value is a non-boolean string', async () => {
      configDbMock.get.mockResolvedValue('not-a-bool')
      expect(await isSyncEnabled()).toBe(false)
    })
  })

  describe('getSyncServerUrl', () => {
    it('falls back to the build-time env var when the row is missing (auto-migration)', async () => {
      configDbMock.get.mockResolvedValue(undefined)
      // In vitest `import.meta.env.VITE_API_URL` is undefined so the
      // fallback resolves to ''. In a production / F-Droid build it
      // resolves to the URL the deploy script baked in.
      expect(await getSyncServerUrl()).toBe(defaultSyncServerUrl())
      expect(configDbMock.get).toHaveBeenCalledWith({ key: SYNC_SERVER_URL_KEY })
    })

    it('returns the persisted value even when it is empty (user explicitly cleared it)', async () => {
      configDbMock.get.mockResolvedValue('')
      // '' here is the user opt-out: do NOT silently fall back to the
      // env var, the F-Droid rule says empty URL = sync off.
      expect(await getSyncServerUrl()).toBe('')
    })

    it('trims whitespace before returning', async () => {
      configDbMock.get.mockResolvedValue('  https://sync.example.com  ')
      expect(await getSyncServerUrl()).toBe('https://sync.example.com')
    })

    it('falls back to the env var for non-string values', async () => {
      // Stale row (e.g. someone wrote a number by accident): treat as
      // missing and use the env var fallback. Avoids a sync outage from
      // a corrupted config row.
      configDbMock.get.mockResolvedValue(42)
      expect(await getSyncServerUrl()).toBe(defaultSyncServerUrl())
    })
  })

  describe('readSyncConfig', () => {
    it('returns enabled=false and the build-time URL on a fresh install', async () => {
      // Nothing persisted yet: the flag is off and the server URL falls back to
      // the build-time default (LBDS-289), which is empty when VITE_API_URL is
      // not set. The expectation is derived from that same default so the test
      // does not depend on the environment it runs in.
      configDbMock.get.mockResolvedValue(undefined)
      const fallback = defaultSyncServerUrl()
      expect(await readSyncConfig()).toEqual({
        enabled: false,
        serverUrl: fallback,
        hasServerUrl: fallback.length > 0,
      })
    })

    it('returns enabled=true and the URL when both are set', async () => {
      configDbMock.get.mockImplementation(async ({ key }: { key: string }) => {
        if (key === SYNC_ENABLED_KEY) return true
        if (key === SYNC_SERVER_URL_KEY) return 'https://self-hosted.example.com'
        return undefined
      })
      expect(await readSyncConfig()).toEqual({
        enabled: true,
        serverUrl: 'https://self-hosted.example.com',
        hasServerUrl: true,
      })
    })
  })

  describe('resolveApiBaseUrl', () => {
    it('returns null when sync is disabled', async () => {
      configDbMock.get.mockImplementation(async ({ key }: { key: string }) => {
        if (key === SYNC_ENABLED_KEY) return false
        if (key === SYNC_SERVER_URL_KEY) return 'https://example.com'
        return undefined
      })
      expect(await resolveApiBaseUrl()).toBeNull()
    })

    it('returns null when sync is enabled but the URL is empty (F-Droid rule)', async () => {
      configDbMock.get.mockImplementation(async ({ key }: { key: string }) => {
        if (key === SYNC_ENABLED_KEY) return true
        if (key === SYNC_SERVER_URL_KEY) return ''
        return undefined
      })
      expect(await resolveApiBaseUrl()).toBeNull()
    })

    it('returns the user URL when sync is enabled and a URL is set', async () => {
      configDbMock.get.mockImplementation(async ({ key }: { key: string }) => {
        if (key === SYNC_ENABLED_KEY) return true
        if (key === SYNC_SERVER_URL_KEY) return 'https://self-hosted.example.com'
        return undefined
      })
      expect(await resolveApiBaseUrl()).toBe('https://self-hosted.example.com')
    })
  })

  describe('setSyncEnabled', () => {
    it('persists the value with the expected key', async () => {
      await setSyncEnabled({ enabled: true })
      expect(configDbMock.set).toHaveBeenCalledWith({ key: SYNC_ENABLED_KEY, value: true })
    })
  })

  describe('setSyncServerUrl', () => {
    it('persists the trimmed empty value (user opt-out of the env-var fallback)', async () => {
      // Saving '' is what distinguishes "user cleared the field" from
      // "row never existed" — with a delete, the next read would
      // re-populate from VITE_API_URL. Persisting '' is the F-Droid
      // rule (empty URL = sync off, no silent fallback).
      await setSyncServerUrl({ url: '' })
      expect(configDbMock.set).toHaveBeenCalledWith({
        key: SYNC_SERVER_URL_KEY,
        value: '',
      })
      expect(configDbMock.delete).not.toHaveBeenCalled()
    })

    it('persists whitespace-only as empty', async () => {
      await setSyncServerUrl({ url: '   ' })
      expect(configDbMock.set).toHaveBeenCalledWith({
        key: SYNC_SERVER_URL_KEY,
        value: '',
      })
    })

    it('stores the trimmed value when non-empty', async () => {
      await setSyncServerUrl({ url: '  https://sync.example.com/  ' })
      expect(configDbMock.set).toHaveBeenCalledWith({
        key: SYNC_SERVER_URL_KEY,
        value: 'https://sync.example.com/',
      })
    })
  })

  describe('isValidSyncServerUrl', () => {
    it('accepts empty (means "no server")', () => {
      expect(isValidSyncServerUrl({ url: '' })).toBe(true)
      expect(isValidSyncServerUrl({ url: '   ' })).toBe(true)
    })

    it('accepts an https URL', () => {
      expect(isValidSyncServerUrl({ url: 'https://sync.example.com' })).toBe(true)
    })

    it('accepts an http URL', () => {
      expect(isValidSyncServerUrl({ url: 'http://127.0.0.1:8001' })).toBe(true)
    })

    it('rejects non-http(s) URLs', () => {
      expect(isValidSyncServerUrl({ url: 'ftp://sync.example.com' })).toBe(false)
      expect(isValidSyncServerUrl({ url: 'ws://sync.example.com' })).toBe(false)
    })

    it('rejects garbage that does not parse', () => {
      expect(isValidSyncServerUrl({ url: 'not-a-url' })).toBe(false)
    })
  })

  describe('defaultSyncServerUrl', () => {
    it('returns the build-time env var if set', () => {
      // import.meta.env.VITE_API_URL is the value injected by Vite at
      // build time. In the vitest env it may be empty; the function
      // must never throw and must return either the env value or ''.
      expect(typeof defaultSyncServerUrl()).toBe('string')
    })
  })
})