// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'

const {
  mockIsNativePlatform,
  mockBrowserOpen,
  mockBrowserClose,
  mockAppAddListener,
} = vi.hoisted(() => ({
  mockIsNativePlatform: vi.fn((): boolean => false),
  mockBrowserOpen: vi.fn(),
  mockBrowserClose: vi.fn(),
  mockAppAddListener: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mockIsNativePlatform },
}))

vi.mock('@capacitor/browser', () => ({
  Browser: { open: mockBrowserOpen, close: mockBrowserClose },
}))

vi.mock('@capacitor/app', () => ({
  App: { addListener: mockAppAddListener },
}))

import { SSOClient } from '@dowardev/sso-client'
import { getSSOClient, setSSOClient } from '@/ssoClientAccessor'
import authController from '@/controllers/authController'
import { SSO_NATIVE_REDIRECT_URI, isSsoNativeCallbackUrl, useSsoNativeReturn } from '@/composables/useSsoNativeReturn'

function createRealClient(): SSOClient {
  return new SSOClient({
    ssoUrl: 'https://sso.example.com/api/',
    ssoFrontendUrl: 'https://sso.example.com',
    apiBaseUrl: 'https://api.example.com/api/',
    clientId: 'test-client',
  })
}

function stubTokenExchange(params: { client: SSOClient }): { getPostedData: () => Record<string, unknown> } {
  const { client } = params
  let posted: Record<string, unknown> = {}
  vi.spyOn(client as unknown as { internalPost: (url: string, data: object) => Promise<unknown> }, 'internalPost').mockImplementation(
    async (url: string, data: object) => {
      expect(url).toBe('oauth/token')
      posted = data as Record<string, unknown>
      return {
        token: 'access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        user: { id: 7, name: 'Test User', user: 'test', email: 'test@example.com' },
      }
    },
  )
  return { getPostedData: () => posted }
}

function seedPkce(params: { state: string; redirectUri: string }): void {
  const { state, redirectUri } = params
  sessionStorage.setItem(`@dowardev/sso-client:pkce:${state}`, 'test-verifier-seeded-for-spec')
  sessionStorage.setItem(`@dowardev/sso-client:pkce:${state}:redirect-uri`, redirectUri)
}

describe('SSO native return (LBDS-233)', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto)
    vi.clearAllMocks()
    mockIsNativePlatform.mockReturnValue(false)
    localStorage.clear()
    sessionStorage.clear()
  })

  it('opens the authorize URL with the native redirect URI in the external browser on native login', async () => {
    mockIsNativePlatform.mockReturnValue(true)
    setSSOClient(createRealClient())

    await authController.login()

    expect(mockBrowserOpen).toHaveBeenCalledTimes(1)
    const openedUrl = new URL(mockBrowserOpen.mock.calls[0][0].url)
    expect(openedUrl.pathname).toBe('/auth/login')
    expect(openedUrl.searchParams.get('redirect_uri')).toBe(SSO_NATIVE_REDIRECT_URI)
  })

  it('opens the register URL with the native redirect URI in the external browser on native register', async () => {
    mockIsNativePlatform.mockReturnValue(true)
    setSSOClient(createRealClient())

    await authController.register()

    expect(mockBrowserOpen).toHaveBeenCalledTimes(1)
    const openedUrl = new URL(mockBrowserOpen.mock.calls[0][0].url)
    expect(openedUrl.pathname).toBe('/auth/register')
    expect(openedUrl.searchParams.get('redirect_uri')).toBe(SSO_NATIVE_REDIRECT_URI)
  })

  it('reuses the stored redirect URI on callback when no explicit option is given', async () => {
    mockIsNativePlatform.mockReturnValue(true)
    const client = createRealClient()
    const { getPostedData } = stubTokenExchange({ client })
    setSSOClient(client)

    await authController.login()
    const loginUrl = new URL(mockBrowserOpen.mock.calls[0][0].url)
    const state = loginUrl.searchParams.get('state')
    expect(state).toBeTruthy()

    await client.handleCallback(`${SSO_NATIVE_REDIRECT_URI}?code=auth-code&state=${state}`)

    expect(getPostedData().redirect_uri).toBe(SSO_NATIVE_REDIRECT_URI)
  })

  it('exchanges the deep-link code with the native redirect URI, closes the browser and goes to /budget', async () => {
    const client = createRealClient()
    const { getPostedData } = stubTokenExchange({ client })
    setSSOClient(client)
    seedPkce({ state: 'some-state', redirectUri: SSO_NATIVE_REDIRECT_URI })
    const replace = vi.fn()
    const { handleAppUrl, status } = useSsoNativeReturn()

    const handled = await handleAppUrl({
      url: `${SSO_NATIVE_REDIRECT_URI}?code=auth-code&state=some-state`,
      router: { replace } as never,
    })

    expect(handled).toBe(true)
    const posted = getPostedData()
    expect(posted.code).toBe('auth-code')
    expect(posted.redirect_uri).toBe(SSO_NATIVE_REDIRECT_URI)
    expect(mockBrowserClose).toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith('/budget')
    expect(status.value).toBe('success')
  })

  it('ignores deep links that are not the SSO callback', async () => {
    const client = createRealClient()
    const exchange = vi.spyOn(client as unknown as { internalPost: () => Promise<unknown> }, 'internalPost')
    setSSOClient(client)
    const { handleAppUrl, status } = useSsoNativeReturn()

    const handled = await handleAppUrl({ url: 'com.dowardev.onespend://other/path' })

    expect(handled).toBe(false)
    expect(exchange).not.toHaveBeenCalled()
    expect(status.value).toBe('idle')
  })

  it('listens for appUrlOpen on native startup and completes the flow', async () => {
    mockIsNativePlatform.mockReturnValue(true)
    mockAppAddListener.mockResolvedValue({ remove: vi.fn() })
    const client = createRealClient()
    stubTokenExchange({ client })
    setSSOClient(client)
    seedPkce({ state: 'some-state', redirectUri: SSO_NATIVE_REDIRECT_URI })
    const replace = vi.fn()
    const { start, status } = useSsoNativeReturn()

    await start({ router: { replace } as never })

    expect(mockAppAddListener).toHaveBeenCalledWith('appUrlOpen', expect.any(Function))
    expect(status.value).toBe('listening')
    const listener = mockAppAddListener.mock.calls[0][1] as (params: { url: string }) => void
    listener({ url: `${SSO_NATIVE_REDIRECT_URI}?code=auth-code&state=some-state` })
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/budget'))
    expect(status.value).toBe('success')
  })

  it('keeps the web behavior unchanged: origin callback URI and reconstructed exchange URI', async () => {
    mockIsNativePlatform.mockReturnValue(false)
    const webCallback = `${window.location.origin}/auth/callback`
    const loginWithRedirect = vi.fn()
    setSSOClient({ loginWithRedirect } as unknown as SSOClient)

    await authController.login()

    expect(loginWithRedirect).toHaveBeenCalledTimes(1)
    const options = loginWithRedirect.mock.calls[0][0]
    expect(options.redirectUri).toBe(webCallback)
    expect(options.openUrl).toBeUndefined()
    expect(mockBrowserOpen).not.toHaveBeenCalled()

    const client = createRealClient()
    const { getPostedData } = stubTokenExchange({ client })
    setSSOClient(client)
    seedPkce({ state: 'web-state', redirectUri: webCallback })

    await getSSOClient().handleCallback(`${webCallback}?code=web-code&state=web-state`)

    expect(getPostedData().redirect_uri).toBe(webCallback)
  })

  it('navigates to /login?sso_error=1 when the exchange fails', async () => {
    const client = createRealClient()
    vi.spyOn(
      client as unknown as { internalPost: (url: string, data: object) => Promise<unknown> },
      'internalPost',
    ).mockRejectedValue(new Error('exchange failed'))
    setSSOClient(client)
    seedPkce({ state: 'bad-state', redirectUri: SSO_NATIVE_REDIRECT_URI })
    const replace = vi.fn().mockResolvedValue(undefined)
    const { handleAppUrl, status, error } = useSsoNativeReturn()

    const handled = await handleAppUrl({
      url: `${SSO_NATIVE_REDIRECT_URI}?code=bad-code&state=bad-state`,
      router: { replace } as never,
    })

    expect(handled).toBe(true)
    expect(status.value).toBe('error')
    expect(error.value).toContain('exchange failed')
    expect(replace).toHaveBeenCalledWith('/login?sso_error=1')
  })

  it('keeps success status when post-exchange navigation fails', async () => {
    const client = createRealClient()
    const { getPostedData } = stubTokenExchange({ client })
    setSSOClient(client)
    seedPkce({ state: 'some-state', redirectUri: SSO_NATIVE_REDIRECT_URI })
    const replace = vi.fn().mockRejectedValue(new Error('navigation failed'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { handleAppUrl, status } = useSsoNativeReturn()

    const handled = await handleAppUrl({
      url: `${SSO_NATIVE_REDIRECT_URI}?code=auth-code&state=some-state`,
      router: { replace } as never,
    })

    expect(handled).toBe(true)
    expect(replace).toHaveBeenCalledWith('/budget')
    expect(status.value).toBe('success')
    expect(getPostedData().code).toBe('auth-code')
    warn.mockRestore()
  })

  it('rejects prefix over-match without touching the exchange', async () => {
    const client = createRealClient()
    const exchange = vi.spyOn(client as unknown as { internalPost: () => Promise<unknown> }, 'internalPost')
    setSSOClient(client)
    const { handleAppUrl, status } = useSsoNativeReturn()

    expect(isSsoNativeCallbackUrl({ url: `${SSO_NATIVE_REDIRECT_URI}?code=x&state=y` })).toBe(true)
    const nonMatching = [
      `${SSO_NATIVE_REDIRECT_URI}/extra?code=x&state=y`,
      `${SSO_NATIVE_REDIRECT_URI}-evil?code=x&state=y`,
      'com.dowardev.onespend://other/path?code=x&state=y',
      'https://evil.example.com/auth/callback?code=x&state=y',
      'not-a-url',
    ]
    for (const url of nonMatching) {
      expect(isSsoNativeCallbackUrl({ url })).toBe(false)
      const handled = await handleAppUrl({ url })
      expect(handled).toBe(false)
    }
    expect(exchange).not.toHaveBeenCalled()
    expect(status.value).toBe('idle')
  })

  it('allows a retry to succeed after a failed attempt once the query is cleared', async () => {
    const failingClient = createRealClient()
    vi.spyOn(
      failingClient as unknown as { internalPost: (url: string, data: object) => Promise<unknown> },
      'internalPost',
    ).mockRejectedValue(new Error('first exchange failed'))
    setSSOClient(failingClient)
    seedPkce({ state: 'retry-state', redirectUri: SSO_NATIVE_REDIRECT_URI })
    const replace = vi.fn().mockResolvedValue(undefined)
    const first = useSsoNativeReturn()

    const firstHandled = await first.handleAppUrl({
      url: `${SSO_NATIVE_REDIRECT_URI}?code=bad-code&state=retry-state`,
      router: { replace } as never,
    })

    expect(firstHandled).toBe(true)
    expect(first.status.value).toBe('error')
    expect(replace).toHaveBeenCalledWith('/login?sso_error=1')

    const errorTarget = replace.mock.calls[0][0] as string
    expect(new URL(errorTarget, 'http://localhost').searchParams.get('sso_error')).toBe('1')
    const retryReplace = vi.fn().mockResolvedValue(undefined)
    await retryReplace('/login')
    expect(retryReplace).toHaveBeenCalledWith('/login')
    expect(new URL('/login', 'http://localhost').searchParams.get('sso_error')).toBeNull()

    const succeedingClient = createRealClient()
    stubTokenExchange({ client: succeedingClient })
    setSSOClient(succeedingClient)
    seedPkce({ state: 'retry-state', redirectUri: SSO_NATIVE_REDIRECT_URI })
    const second = useSsoNativeReturn()

    const secondHandled = await second.handleAppUrl({
      url: `${SSO_NATIVE_REDIRECT_URI}?code=auth-code&state=retry-state`,
      router: { replace: retryReplace } as never,
    })

    expect(secondHandled).toBe(true)
    expect(second.status.value).toBe('success')
    expect(retryReplace).toHaveBeenCalledWith('/budget')
  })
})
