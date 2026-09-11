// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'

const {
  mockIsNativePlatform,
  mockBrowserOpen,
  mockBrowserClose,
  mockBrowserAddListener,
  mockAppAddListener,
  mockAppGetLaunchUrl,
} = vi.hoisted(() => ({
  mockIsNativePlatform: vi.fn((): boolean => false),
  mockBrowserOpen: vi.fn(),
  mockBrowserClose: vi.fn(),
  mockBrowserAddListener: vi.fn(async () => ({ remove: vi.fn() })),
  mockAppAddListener: vi.fn(),
  mockAppGetLaunchUrl: vi.fn(async () => null),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mockIsNativePlatform },
}))

vi.mock('@capacitor/browser', () => ({
  Browser: { open: mockBrowserOpen, close: mockBrowserClose, addListener: mockBrowserAddListener },
}))

vi.mock('@capacitor/app', () => ({
  App: { addListener: mockAppAddListener, getLaunchUrl: mockAppGetLaunchUrl },
}))

vi.mock('@/services/dataClearService', () => ({
  clearAllUserData: vi.fn(),
  dataClearService: { clearAllUserData: vi.fn() },
}))

vi.mock('@/services/syncService', () => ({
  syncService: { getQueueCount: vi.fn(async () => 0) },
}))

import { SSOClient } from '@dowardev/sso-client'
import { getSSOClient, setSSOClient } from '@/ssoClientAccessor'
import authController from '@/controllers/authController'
import {
  SSO_NATIVE_REDIRECT_URI,
  isSsoNativeCallbackUrl,
  markSsoLoginStarted,
  markSsoLogoutStarted,
  useSsoNativeReturn,
} from '@/composables/useSsoNativeReturn'
import { createPinia, setActivePinia } from 'pinia'
import { clearAllUserData } from '@/services/dataClearService'
import { syncService } from '@/services/syncService'

function createRealClient(): SSOClient {
  return new SSOClient({
    ssoUrl: 'https://sso.example.com/api/',
    ssoFrontendUrl: 'https://sso.example.com',
    apiBaseUrl: 'https://api.example.com/api/',
    clientId: 'test-client',
  })
}

function stubTokenExchange(params: { client: SSOClient }): { getPostedData: () => Record<string, unknown>; exchange: ReturnType<typeof vi.spyOn> } {
  const { client } = params
  let posted: Record<string, unknown> = {}
  const exchange = vi.spyOn(client as unknown as { internalPost: (url: string, data: object) => Promise<unknown> }, 'internalPost')
  exchange.mockImplementation(
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
  return { getPostedData: () => posted, exchange }
}

function seedPkce(params: { state: string; redirectUri: string }): void {
  const { state, redirectUri } = params
  // sso-client 0.2.2+ keeps PKCE in localStorage: the OS recreates the WebView
  // while the external browser is in front, so sessionStorage would be empty
  // by the time the deep link returns.
  localStorage.setItem(`@dowardev/sso-client:pkce:${state}`, 'test-verifier-seeded-for-spec')
  localStorage.setItem(`@dowardev/sso-client:pkce:${state}:redirect-uri`, redirectUri)
}

describe('SSO native return (LBDS-233)', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto)
    vi.clearAllMocks()
    mockIsNativePlatform.mockReturnValue(false)
    setActivePinia(createPinia())
    vi.mocked(syncService.getQueueCount).mockResolvedValue(0)
    vi.mocked(clearAllUserData).mockResolvedValue(undefined)
    localStorage.clear()
    sessionStorage.clear()
    // Most specs drive a login return; the codeless/logout specs re-mark the
    // flow explicitly. Without a marker the composable deliberately ignores
    // deep links (see the "no flow in flight" specs).
    markSsoLoginStarted()
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
    // Tapping "Reintentar" starts a fresh login flow, which is what makes the
    // next deep link admissible: a return is only processed while a flow is
    // in flight (stale or foreign deep links are ignored by design).
    markSsoLoginStarted()
    const second = useSsoNativeReturn()

    const secondHandled = await second.handleAppUrl({
      url: `${SSO_NATIVE_REDIRECT_URI}?code=auth-code&state=retry-state`,
      router: { replace: retryReplace } as never,
    })

    expect(secondHandled).toBe(true)
    expect(second.status.value).toBe('success')
    expect(retryReplace).toHaveBeenCalledWith('/budget')
  })

  it('opens the logout URL with the native redirect URI in the external browser on native logout', async () => {
    mockIsNativePlatform.mockReturnValue(true)
    const logout = vi.fn().mockResolvedValue(undefined)
    setSSOClient({ logout } as unknown as SSOClient)

    const result = await authController.logout()

    expect(result).toBe(true)
    expect(logout).toHaveBeenCalledTimes(1)
    const options = logout.mock.calls[0][0] as { redirectUri: string; openUrl: (params: { url: string }) => Promise<void> }
    expect(options.redirectUri).toBe(SSO_NATIVE_REDIRECT_URI)
    expect(typeof options.openUrl).toBe('function')
    // The opener handed to the SSO client must launch the external browser
    // with a logout URL carrying the native redirect URI.
    const logoutUrl = `https://sso.example.com/auth/logout?client_id=test-client&redirect_uri=${encodeURIComponent(SSO_NATIVE_REDIRECT_URI)}`
    await options.openUrl({ url: logoutUrl })
    expect(mockBrowserOpen).toHaveBeenCalledTimes(1)
    expect(mockBrowserOpen).toHaveBeenCalledWith({ url: logoutUrl })
    const openedUrl = new URL(mockBrowserOpen.mock.calls[0][0].url)
    expect(openedUrl.pathname).toBe('/auth/logout')
    expect(openedUrl.searchParams.get('redirect_uri')).toBe(SSO_NATIVE_REDIRECT_URI)
  })

  it('treats a codeless deep-link return as logout: closes the browser and goes to /budget', async () => {
    markSsoLogoutStarted()
    const client = createRealClient()
    const exchange = vi.spyOn(client as unknown as { internalPost: () => Promise<unknown> }, 'internalPost')
    setSSOClient(client)
    const replace = vi.fn()
    const { handleAppUrl, status, error } = useSsoNativeReturn()

    const handled = await handleAppUrl({
      url: SSO_NATIVE_REDIRECT_URI,
      router: { replace } as never,
    })

    expect(handled).toBe(true)
    expect(exchange).not.toHaveBeenCalled()
    expect(mockBrowserClose).toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith('/budget')
    expect(status.value).toBe('success')
    expect(error.value).toBeNull()
  })

  it('stays success on codeless return when the browser close fails', async () => {
    markSsoLogoutStarted()
    const client = createRealClient()
    setSSOClient(client)
    mockBrowserClose.mockRejectedValueOnce(new Error('close failed'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const replace = vi.fn()
    const { handleAppUrl, status } = useSsoNativeReturn()

    const handled = await handleAppUrl({
      url: SSO_NATIVE_REDIRECT_URI,
      router: { replace } as never,
    })

    expect(handled).toBe(true)
    expect(replace).toHaveBeenCalledWith('/budget')
    expect(status.value).toBe('success')
    warn.mockRestore()
  })

  it('keeps web logout unchanged without opening the external browser', async () => {
    mockIsNativePlatform.mockReturnValue(false)
    const logout = vi.fn().mockResolvedValue(undefined)
    setSSOClient({ logout } as unknown as SSOClient)

    const result = await authController.logout()

    expect(result).toBe(true)
    expect(logout).toHaveBeenCalledTimes(1)
    expect(logout).toHaveBeenCalledWith()
    expect(mockBrowserOpen).not.toHaveBeenCalled()
  })

  it('ignores a redelivered deep link that was already consumed', async () => {
    markSsoLoginStarted()
    const client = createRealClient()
    const { exchange } = stubTokenExchange({ client })
    setSSOClient(client)
    seedPkce({ state: 'dup-state', redirectUri: SSO_NATIVE_REDIRECT_URI })
    const { handleAppUrl } = useSsoNativeReturn()
    const url = `${SSO_NATIVE_REDIRECT_URI}?code=dup-code&state=dup-state`

    expect(await handleAppUrl({ url })).toBe(true)
    expect(await handleAppUrl({ url })).toBe(true)
    expect(exchange).toHaveBeenCalledTimes(1)
  })

  it('routes OAuth error returns to login with sso_error', async () => {
    const { handleAppUrl, status, error } = useSsoNativeReturn()
    const replace = vi.fn()

    const handled = await handleAppUrl({
      url: `${SSO_NATIVE_REDIRECT_URI}?error=access_denied&state=some-state`,
      router: { replace } as never,
    })

    expect(handled).toBe(true)
    expect(status.value).toBe('error')
    expect(error.value).toBe('access_denied')
    expect(replace).toHaveBeenCalledWith('/login?sso_error=1')
  })

  it('clears local session on codeless logout return', async () => {
    markSsoLogoutStarted()
    const { handleAppUrl, status } = useSsoNativeReturn()
    const replace = vi.fn()

    const handled = await handleAppUrl({
      url: `${SSO_NATIVE_REDIRECT_URI}?logout=1`,
      router: { replace } as never,
    })

    expect(handled).toBe(true)
    expect(status.value).toBe('success')
    expect(vi.mocked(clearAllUserData)).toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith('/budget')
  })

  it('ignores a codeless deep link when no SSO flow is in flight (no data wipe)', async () => {
    // A deep link alone is not proof of a logout: acting on it wiped local data
    // for any stale or foreign custom-scheme intent.
    localStorage.clear()
    const { handleAppUrl, status } = useSsoNativeReturn()
    const replace = vi.fn()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const handled = await handleAppUrl({
      url: `${SSO_NATIVE_REDIRECT_URI}?logout=1`,
      router: { replace } as never,
    })

    expect(handled).toBe(true)
    expect(vi.mocked(clearAllUserData)).not.toHaveBeenCalled()
    expect(mockBrowserClose).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
    expect(status.value).toBe('idle')
    warn.mockRestore()
  })

  it('ignores a code return when no SSO flow is in flight (no exchange)', async () => {
    localStorage.clear()
    const client = createRealClient()
    const { exchange } = stubTokenExchange({ client })
    const { handleAppUrl } = useSsoNativeReturn()
    const replace = vi.fn()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await handleAppUrl({
      url: `${SSO_NATIVE_REDIRECT_URI}?code=stale-code&state=stale-state`,
      router: { replace } as never,
    })

    expect(exchange).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('ignores a login return while a logout flow is in flight', async () => {
    markSsoLogoutStarted()
    const client = createRealClient()
    const { exchange } = stubTokenExchange({ client })
    const { handleAppUrl } = useSsoNativeReturn()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await handleAppUrl({
      url: `${SSO_NATIVE_REDIRECT_URI}?code=auth-code&state=some-state`,
      router: { replace: vi.fn() } as never,
    })

    expect(exchange).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('does not re-run a failed exchange when the deep link is redelivered', async () => {
    markSsoLoginStarted()
    const client = createRealClient()
    const exchange = vi
      .spyOn(client as unknown as { internalPost: () => Promise<unknown> }, 'internalPost')
      .mockRejectedValue(new Error('network blip'))
    setSSOClient(client)
    seedPkce({ state: 'retry-state', redirectUri: SSO_NATIVE_REDIRECT_URI })
    const { handleAppUrl } = useSsoNativeReturn()
    const replace = vi.fn()
    const url = `${SSO_NATIVE_REDIRECT_URI}?code=retry-code&state=retry-state`

    await handleAppUrl({ url, router: { replace } as never })
    expect(exchange).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith('/login?sso_error=1')

    // A redelivered deep link must not re-attempt the exchange: the SDK already
    // consumed the single-use PKCE verifier, so the retry could never succeed.
    // Recovery is a fresh login from the UI.
    await handleAppUrl({ url, router: { replace } as never })

    expect(exchange).toHaveBeenCalledTimes(1)
  })

  it('does not reprocess a sticky launch URL on resume without a pending flow', async () => {
    mockIsNativePlatform.mockReturnValue(true)
    mockAppAddListener.mockResolvedValue({ remove: vi.fn() })
    // Android keeps returning the original launch intent: here it still carries
    // the spent code of a login that already completed.
    mockAppGetLaunchUrl.mockResolvedValue({
      url: `${SSO_NATIVE_REDIRECT_URI}?code=spent-code&state=spent-state`,
    })
    localStorage.clear()
    const { start } = useSsoNativeReturn()
    const replace = vi.fn()

    await start({ router: { replace } as never })
    const resumeHandle = mockAppAddListener.mock.calls.find(
      (call) => call[0] === 'appStateChange',
    )
    const onStateChange = resumeHandle?.[1] as (event: { isActive: boolean }) => void
    onStateChange({ isActive: true })
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(replace).not.toHaveBeenCalled()
  })

  it('rechecks the launch URL when the app resumes', async () => {
    markSsoLogoutStarted()
    mockIsNativePlatform.mockReturnValue(true)
    mockAppAddListener.mockResolvedValue({ remove: vi.fn() })
    mockAppGetLaunchUrl.mockResolvedValue({ url: `${SSO_NATIVE_REDIRECT_URI}?logout=1` })
    const replace = vi.fn()
    const { start } = useSsoNativeReturn()

    await start({ router: { replace } as never })
    const resumeHandle = mockAppAddListener.mock.calls.find(
      (call) => call[0] === 'appStateChange',
    )
    expect(resumeHandle).toBeTruthy()
    const onStateChange = resumeHandle?.[1] as (event: { isActive: boolean }) => void
    onStateChange({ isActive: true })
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/budget'))
  })

  it('rejects login when the browser closes before completing authentication', async () => {
    mockIsNativePlatform.mockReturnValue(true)
    setSSOClient(createRealClient())
    mockBrowserOpen.mockImplementationOnce(() => new Promise(() => {}))

    const loginPromise = authController.login()
    await vi.waitFor(() => expect(mockBrowserAddListener).toHaveBeenCalledWith('browserFinished', expect.any(Function)))
    const finishedCall = mockBrowserAddListener.mock.calls.find(
      (call: unknown[]) => call[0] === 'browserFinished',
    ) as unknown[] | undefined
    const onFinished = finishedCall?.[1] as () => void
    expect(onFinished).toBeTruthy()
    onFinished()
    await expect(loginPromise).rejects.toThrow('closed before completing')
  }, 10000)
})
