// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// LBDS-289: i18n infrastructure. These tests cover the locale-detection
// and override logic without touching the live i18n instance state
// (which is set up once in main.ts and would leak between tests).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/db/controllers/configDb', () => ({
  configDb: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
  },
}))

const { configGetMock, configSetMock, configDeleteMock } = vi.hoisted(() => ({
  configGetMock: vi.fn(),
  configSetMock: vi.fn(),
  configDeleteMock: vi.fn(),
}))

vi.mock('@/db/controllers/configDb', () => ({
  configDb: {
    get: configGetMock,
    set: configSetMock,
    delete: configDeleteMock,
    getAll: vi.fn(),
  },
}))

import {
  detectSystemLocale,
  setCurrentLocale,
  getCurrentLocale,
  type AppLocale,
} from './i18n'
import {
  loadLocaleOverride,
  setLocaleOverride,
  resolveInitialLocale,
} from './composables/useLocale'

describe('i18n (LBDS-289)', () => {
  beforeEach(() => {
    configGetMock.mockReset()
    configSetMock.mockReset()
    configDeleteMock.mockReset()
    setCurrentLocale('es')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('detectSystemLocale', () => {
    it('returns "es" when navigator.language starts with es', () => {
      vi.stubGlobal('navigator', { language: 'es-AR' })
      expect(detectSystemLocale()).toBe('es')
      vi.unstubAllGlobals()
    })

    it('returns "en" when navigator.language starts with en', () => {
      vi.stubGlobal('navigator', { language: 'en-US' })
      expect(detectSystemLocale()).toBe('en')
      vi.unstubAllGlobals()
    })

    it('falls back to "en" for any other locale (F-Droid rule)', () => {
      vi.stubGlobal('navigator', { language: 'fr-FR' })
      expect(detectSystemLocale()).toBe('en')
      vi.unstubAllGlobals()
    })

    it('returns "es" when navigator is undefined (SSR / Node test env)', () => {
      vi.stubGlobal('navigator', undefined)
      expect(detectSystemLocale()).toBe('es')
      vi.unstubAllGlobals()
    })
  })

  describe('getCurrentLocale / setCurrentLocale', () => {
    it('returns the active locale after switching it', () => {
      setCurrentLocale('en')
      expect(getCurrentLocale()).toBe('en')
      setCurrentLocale('es')
      expect(getCurrentLocale()).toBe('es')
    })
  })

  describe('loadLocaleOverride', () => {
    it('returns null when no row is stored', async () => {
      configGetMock.mockResolvedValue(undefined)
      expect(await loadLocaleOverride()).toBeNull()
    })

    it('returns null for non-locale stored values (corrupted row)', async () => {
      configGetMock.mockResolvedValue('pt-BR')
      expect(await loadLocaleOverride()).toBeNull()
    })

    it('returns the persisted locale', async () => {
      configGetMock.mockResolvedValue('en')
      expect(await loadLocaleOverride()).toBe<AppLocale | null>('en')
    })
  })

  describe('setLocaleOverride', () => {
    it('persists the locale with the languageOverride key', async () => {
      await setLocaleOverride({ locale: 'en' })
      expect(configSetMock).toHaveBeenCalledWith({ key: 'languageOverride', value: 'en' })
      expect(configDeleteMock).not.toHaveBeenCalled()
    })

    it('deletes the row when passed null (revert to system locale)', async () => {
      await setLocaleOverride({ locale: null })
      expect(configDeleteMock).toHaveBeenCalledWith({ key: 'languageOverride' })
      expect(configSetMock).not.toHaveBeenCalled()
    })
  })

  describe('resolveInitialLocale', () => {
    it('returns the persisted override when one exists', async () => {
      configGetMock.mockResolvedValue('en')
      vi.stubGlobal('navigator', { language: 'es-AR' })
      // Even though navigator is es, the override wins.
      expect(await resolveInitialLocale()).toBe('en')
      vi.unstubAllGlobals()
    })

    it('returns the system locale when no override exists', async () => {
      configGetMock.mockResolvedValue(undefined)
      vi.stubGlobal('navigator', { language: 'en-US' })
      expect(await resolveInitialLocale()).toBe('en')
      vi.unstubAllGlobals()
    })

    it('falls back to "en" for non-es system locales with no override (F-Droid rule)', async () => {
      configGetMock.mockResolvedValue(undefined)
      vi.stubGlobal('navigator', { language: 'de-DE' })
      expect(await resolveInitialLocale()).toBe('en')
      vi.unstubAllGlobals()
    })
  })
})