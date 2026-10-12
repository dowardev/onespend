// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// LBDS-295: the SSO URL resolvers live in `services/sso/ssoConfig.ts`.
// The F-Droid ticket requires three explicit cases:
//   - empty configDb           -> returns the VITE default
//   - populated configDb       -> returns the saved value
//   - malformed URL            -> returns the VITE default + logs a warning
// plus the URL-shape guard for the Settings UI (mirror of isValidSyncServerUrl).

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
  getSsoBaseUrl,
  getSsoFrontendUrl,
  setSsoServerUrl,
  setSsoFrontendUrl,
  isValidSsoServerUrl,
  defaultSsoBaseUrl,
  defaultSsoFrontendUrl,
  SSO_SERVER_URL_KEY,
  SSO_FRONTEND_URL_KEY,
} from '../ssoConfig'

const configDbMock = configDb as unknown as {
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

describe('ssoConfig (LBDS-295)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    configDbMock.get.mockReset()
    configDbMock.set.mockReset()
    configDbMock.delete.mockReset()
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    vi.restoreAllMocks()
  })

  describe('getSsoBaseUrl', () => {
    it('falls back to the VITE default when the row is missing (auto-migration)', async () => {
      configDbMock.get.mockResolvedValue(undefined)
      expect(await getSsoBaseUrl()).toBe(defaultSsoBaseUrl())
      expect(configDbMock.get).toHaveBeenCalledWith({ key: SSO_SERVER_URL_KEY })
    })

    it('returns the persisted value when populated', async () => {
      configDbMock.get.mockResolvedValue('https://auth.self-hosted.example.com/api')
      expect(await getSsoBaseUrl()).toBe('https://auth.self-hosted.example.com/api')
    })

    it('trims whitespace before returning', async () => {
      configDbMock.get.mockResolvedValue('  https://auth.example.com/api  ')
      expect(await getSsoBaseUrl()).toBe('https://auth.example.com/api')
    })

    it('treats empty string as missing and falls back to the default', async () => {
      // SSO has no opt-out, but an explicit empty save should still
      // behave like a missing row: env-var default, no warning.
      configDbMock.get.mockResolvedValue('')
      expect(await getSsoBaseUrl()).toBe(defaultSsoBaseUrl())
      expect(warnSpy).not.toHaveBeenCalled()
    })

    it('falls back to the default + warns on a malformed URL (LBDS-295 acceptance)', async () => {
      configDbMock.get.mockResolvedValue('not-a-url')
      expect(await getSsoBaseUrl()).toBe(defaultSsoBaseUrl())
      expect(warnSpy).toHaveBeenCalled()
    })

    it('falls back to the default + warns on a non-http(s) URL', async () => {
      configDbMock.get.mockResolvedValue('ftp://auth.example.com/api')
      expect(await getSsoBaseUrl()).toBe(defaultSsoBaseUrl())
      expect(warnSpy).toHaveBeenCalled()
    })

    it('falls back to the default when the row is a non-string (corrupted row)', async () => {
      configDbMock.get.mockResolvedValue(42)
      expect(await getSsoBaseUrl()).toBe(defaultSsoBaseUrl())
    })
  })

  describe('getSsoFrontendUrl', () => {
    it('falls back to the VITE default when the row is missing', async () => {
      configDbMock.get.mockResolvedValue(undefined)
      expect(await getSsoFrontendUrl()).toBe(defaultSsoFrontendUrl())
      expect(configDbMock.get).toHaveBeenCalledWith({ key: SSO_FRONTEND_URL_KEY })
    })

    it('returns the persisted value when populated', async () => {
      configDbMock.get.mockResolvedValue('https://auth-panel.self-hosted.example.com')
      expect(await getSsoFrontendUrl()).toBe('https://auth-panel.self-hosted.example.com')
    })

    it('falls back to the default + warns on a malformed URL', async () => {
      configDbMock.get.mockResolvedValue('garbage')
      expect(await getSsoFrontendUrl()).toBe(defaultSsoFrontendUrl())
      expect(warnSpy).toHaveBeenCalled()
    })
  })

  describe('setSsoServerUrl / setSsoFrontendUrl', () => {
    it('persists the trimmed value with the expected key', async () => {
      await setSsoServerUrl({ url: 'https://auth.example.com/api' })
      expect(configDbMock.set).toHaveBeenCalledWith({
        key: SSO_SERVER_URL_KEY,
        value: 'https://auth.example.com/api',
      })
    })

    it('persists the trimmed empty value (no env-var re-population on next read)', async () => {
      await setSsoServerUrl({ url: '' })
      expect(configDbMock.set).toHaveBeenCalledWith({
        key: SSO_SERVER_URL_KEY,
        value: '',
      })
      expect(configDbMock.delete).not.toHaveBeenCalled()
    })

    it('persists the SSO frontend URL with its own key', async () => {
      await setSsoFrontendUrl({ url: '  https://auth-panel.example.com  ' })
      expect(configDbMock.set).toHaveBeenCalledWith({
        key: SSO_FRONTEND_URL_KEY,
        value: 'https://auth-panel.example.com',
      })
    })
  })

  describe('isValidSsoServerUrl', () => {
    it('accepts empty (means "use the env-var default")', () => {
      expect(isValidSsoServerUrl({ url: '' })).toBe(true)
      expect(isValidSsoServerUrl({ url: '   ' })).toBe(true)
    })

    it('accepts an https URL', () => {
      expect(isValidSsoServerUrl({ url: 'https://auth.example.com/api' })).toBe(true)
    })

    it('accepts an http URL', () => {
      expect(isValidSsoServerUrl({ url: 'http://127.0.0.1:9000/api' })).toBe(true)
    })

    it('rejects non-http(s) URLs', () => {
      expect(isValidSsoServerUrl({ url: 'ftp://auth.example.com/api' })).toBe(false)
      expect(isValidSsoServerUrl({ url: 'ws://auth.example.com/api' })).toBe(false)
    })

    it('rejects garbage that does not parse', () => {
      expect(isValidSsoServerUrl({ url: 'not-a-url' })).toBe(false)
    })
  })

  describe('defaultSsoBaseUrl / defaultSsoFrontendUrl', () => {
    it('returns the build-time env var if set', () => {
      // import.meta.env.VITE_SSO_URL is the value injected by Vite at
      // build time. In the vitest env it may be empty; the function
      // must never throw and must return either the env value or ''.
      expect(typeof defaultSsoBaseUrl()).toBe('string')
      expect(typeof defaultSsoFrontendUrl()).toBe('string')
    })
  })

  // T-01 (pre-merge review): if configDb fails to open at boot, main.ts
  // wraps the resolver in try/catch and falls back to the env-var
  // defaults. The resolver itself MUST let the configDb error propagate
  // so the boot-level fallback can fire — swallowing it here would
  // hide the bug from the only place that can recover.
  describe('configDb error propagation (T-01)', () => {
    it('propagates a configDb read error from getSsoBaseUrl', async () => {
      const dbError = new Error('Dexie: IndexedDB API missing')
      configDbMock.get.mockRejectedValue(dbError)
      await expect(getSsoBaseUrl()).rejects.toBe(dbError)
    })

    it('propagates a configDb read error from getSsoFrontendUrl', async () => {
      const dbError = new Error('Dexie: blocked by permission policy')
      configDbMock.get.mockRejectedValue(dbError)
      await expect(getSsoFrontendUrl()).rejects.toBe(dbError)
    })
  })

  // T-02 (pre-merge review): the warn message must never echo the raw
  // persisted value back to the devtools console — a self-hoster could
  // have saved a URL with embedded credentials.
  describe('warning messages do not leak the raw URL (T-02)', () => {
    it('does not include the raw value in the non-http(s) warning', async () => {
      const sensitive = 'ftp://user:secret@auth.example.com/api'
      configDbMock.get.mockResolvedValue(sensitive)
      await getSsoBaseUrl()
      expect(warnSpy).toHaveBeenCalled()
      const message = String(warnSpy.mock.calls[0]?.[0] ?? '')
      expect(message).not.toContain('user:secret')
      expect(message).not.toContain(sensitive)
    })

    it('does not include the raw value in the unparseable warning', async () => {
      const sensitive = 'https://user:secret@not a real url'
      configDbMock.get.mockResolvedValue(sensitive)
      await getSsoBaseUrl()
      expect(warnSpy).toHaveBeenCalled()
      const message = String(warnSpy.mock.calls[0]?.[0] ?? '')
      expect(message).not.toContain('user:secret')
      expect(message).not.toContain(sensitive)
    })
  })
})