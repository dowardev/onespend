// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest'
import {
  SSO_NOT_CONFIGURED_URL,
  resolveSsoClientConfig,
  ssoUrlOrPlaceholder,
} from '@/services/sso/ssoConfig'

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

describe('resolveSsoClientConfig', () => {
  it('keeps a fully configured setup untouched', () => {
    const config = resolveSsoClientConfig({
      clientId: 'onespend-web',
      ssoUrl: 'https://sso.example.com/api/',
      ssoFrontendUrl: 'https://sso.example.com',
      apiBaseUrl: 'https://api.example.com/api/',
    })

    expect(config.configured).toBe(true)
    expect(config.clientId).toBe('onespend-web')
    expect(config.ssoUrl).toBe('https://sso.example.com/api/')
    expect(config.ssoFrontendUrl).toBe('https://sso.example.com')
    expect(config.apiBaseUrl).toBe('https://api.example.com/api/')
  })

  it('treats a build without a client id as a build without SSO', () => {
    // A client id the server does not know would be rejected by the SSO and
    // the attempt would be left in its logs, so no real server is contacted.
    const config = resolveSsoClientConfig({
      clientId: '',
      ssoUrl: 'https://sso.example.com/api/',
      ssoFrontendUrl: 'https://sso.example.com',
      apiBaseUrl: 'https://api.example.com/api/',
    })

    expect(config.configured).toBe(false)
    expect(config.ssoUrl).toBe(SSO_NOT_CONFIGURED_URL)
    expect(config.ssoFrontendUrl).toBe(SSO_NOT_CONFIGURED_URL)
    expect(config.apiBaseUrl).toBe(SSO_NOT_CONFIGURED_URL)
    expect(config.clientId).toBe('not-configured')
  })

  it('never returns a URL the SSO client would reject', () => {
    const configs = [
      resolveSsoClientConfig({ clientId: '', ssoUrl: '', ssoFrontendUrl: '', apiBaseUrl: '' }),
      resolveSsoClientConfig({ clientId: 'x', ssoUrl: 'nope', ssoFrontendUrl: '', apiBaseUrl: '' }),
      resolveSsoClientConfig({
        clientId: 'x',
        ssoUrl: 'https://sso.example.com/api/',
        ssoFrontendUrl: 'https://sso.example.com',
        apiBaseUrl: 'https://api.example.com/api/',
      }),
    ]

    for (const config of configs) {
      expect(config.clientId).not.toBe('')
      for (const url of [config.ssoUrl, config.ssoFrontendUrl, config.apiBaseUrl]) {
        expect(() => new URL(url)).not.toThrow()
      }
    }
  })
})
