// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest'
import { SSO_NOT_CONFIGURED_URL, ssoUrlOrPlaceholder } from '@/services/sso/ssoConfig'

describe('ssoUrlOrPlaceholder', () => {
  it('keeps a configured https URL', () => {
    expect(ssoUrlOrPlaceholder({ url: 'https://auth.example.com/api/' })).toBe(
      'https://auth.example.com/api/',
    )
  })

  it('keeps a configured http URL', () => {
    expect(ssoUrlOrPlaceholder({ url: 'http://localhost:8080/api/' })).toBe(
      'http://localhost:8080/api/',
    )
  })

  it('falls back to the placeholder when there is no URL', () => {
    expect(ssoUrlOrPlaceholder({ url: '' })).toBe(SSO_NOT_CONFIGURED_URL)
    expect(ssoUrlOrPlaceholder({ url: '   ' })).toBe(SSO_NOT_CONFIGURED_URL)
  })

  it('falls back to the placeholder when the URL is malformed', () => {
    expect(ssoUrlOrPlaceholder({ url: 'not a url' })).toBe(SSO_NOT_CONFIGURED_URL)
    expect(ssoUrlOrPlaceholder({ url: 'ftp://auth.example.com' })).toBe(SSO_NOT_CONFIGURED_URL)
  })

  it('always returns a URL the SSO client accepts', () => {
    // The client validates the URL in its constructor and throws otherwise,
    // which used to leave the app unmounted (blank screen) when it was built
    // without configuration.
    for (const url of ['', '  ', 'nope', 'https://auth.example.com/api/']) {
      const resolved = ssoUrlOrPlaceholder({ url })
      expect(() => new URL(resolved)).not.toThrow()
      expect(['http:', 'https:']).toContain(new URL(resolved).protocol)
    }
  })
})
