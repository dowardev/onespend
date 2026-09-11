// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ref } from 'vue'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { getSSOClient } from '@/ssoClientAccessor'
import { clearAllUserData } from '@/services/dataClearService'
import { useAuthStore } from '@/stores/authStore'
import type { Router } from 'vue-router'

// Deep-link URI the Android app listens on (see AndroidManifest intent-filter).
// It must also be whitelisted as redirect_uri on the SSO server (manual step).
export const SSO_NATIVE_REDIRECT_URI = 'com.dowardev.onespend://auth/callback'

export type SsoNativeStatus = 'idle' | 'listening' | 'handling' | 'success' | 'error'

export function isSsoNativeCallbackUrl(params: { url: string }): boolean {
  const { url } = params
  try {
    const incoming = new URL(url)
    const expected = new URL(SSO_NATIVE_REDIRECT_URI)
    return (
      incoming.protocol === expected.protocol &&
      incoming.host === expected.host &&
      incoming.pathname === expected.pathname
    )
  } catch {
    return false
  }
}

// A deep link alone is not proof that an auth flow is happening: Android
// keeps returning the original launch intent on resume, and any app or web page
// can open a custom-scheme URL. Acting on such a URL would re-exchange a spent
// authorization code (bouncing a logged-in user to /login?sso_error=1) or, worse,
// wipe local data on a "logout return" that never happened. So the app records
// the flow it started, in localStorage so it survives the activity recreation
// that happens while the external browser is in front, with a short TTL so a
// stale marker can never gate a much later deep link.
const SSO_FLOW_KEY = 'onespend:sso-flow'
const SSO_FLOW_TTL_MS = 10 * 60 * 1000

type SsoFlow = 'login' | 'logout'

function markSsoFlow(params: { flow: SsoFlow }): void {
  try {
    localStorage.setItem(
      SSO_FLOW_KEY,
      JSON.stringify({ flow: params.flow, at: Date.now() })
    )
  } catch (storageError) {
    console.warn('[sso-native] Could not persist the pending SSO flow:', storageError)
  }
}

function readSsoFlow(): SsoFlow | null {
  try {
    const raw = localStorage.getItem(SSO_FLOW_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { flow?: SsoFlow; at?: number }
    if (!parsed?.flow || typeof parsed.at !== 'number') return null
    if (Date.now() - parsed.at > SSO_FLOW_TTL_MS) {
      localStorage.removeItem(SSO_FLOW_KEY)
      return null
    }
    return parsed.flow
  } catch {
    return null
  }
}

function clearSsoFlow(): void {
  try {
    localStorage.removeItem(SSO_FLOW_KEY)
  } catch {
    // Nothing to do: the TTL still bounds a stale marker.
  }
}

export function markSsoLoginStarted(): void {
  markSsoFlow({ flow: 'login' })
}

export function markSsoLogoutStarted(): void {
  markSsoFlow({ flow: 'logout' })
}

export function useSsoNativeReturn() {
  const status = ref<SsoNativeStatus>('idle')
  const error = ref<string | null>(null)
  // Deep links already consumed by this instance (Android may redeliver the
  // same intent on activity recreation; auth codes are single-use anyway).
  const handledCallbackUrls = new Set<string>()
  let removeListener: (() => void) | null = null

  async function handleAppUrl(params: { url: string; router?: Router }): Promise<boolean> {
    const { url, router } = params
    if (!isSsoNativeCallbackUrl({ url })) {
      return false
    }
    if (handledCallbackUrls.has(url)) {
      return true
    }

    const incomingUrl = new URL(url)
    const oauthError = incomingUrl.searchParams.get('error')
    const hasCode = Boolean(incomingUrl.searchParams.get('code'))
    const pendingFlow = readSsoFlow()

    // No flow of ours is waiting for a return: this is a replayed, stale or
    // foreign deep link. Consume it without touching local data or navigating.
    if (!pendingFlow) {
      console.warn('[sso-native] Ignoring a deep link with no SSO flow in flight')
      return true
    }

    if (oauthError) {
      handledCallbackUrls.add(url)
      clearSsoFlow()
      status.value = 'error'
      error.value = oauthError
      if (router) {
        try {
          await router.replace('/login?sso_error=1')
        } catch (navigationError) {
          console.warn('[sso-native] Could not navigate to login after error:', navigationError)
        }
      }
      return true
    }

    // A code only ever completes a login, and a codeless return only ever
    // completes a logout: anything else is a mismatch, not ours to consume.
    if (hasCode && pendingFlow !== 'login') {
      console.warn('[sso-native] Ignoring a login return while a logout is in flight')
      return true
    }
    if (!hasCode && pendingFlow !== 'logout') {
      console.warn('[sso-native] Ignoring a codeless return while a login is in flight')
      return true
    }

    handledCallbackUrls.add(url)
    status.value = 'handling'
    error.value = null

    // Codeless return on the native redirect base is a logout return.
    // There is no authorization code to exchange, so close the external
    // browser and send the user back to budget as a consumed success.
    if (!hasCode) {
      clearSsoFlow()
      try {
        await clearAllUserData()
      } catch (clearError) {
        console.warn('[sso-native] Could not clear local data on logout return:', clearError)
      }
      try {
        useAuthStore().logout()
      } catch (storeError) {
        console.warn('[sso-native] Could not reset auth store on logout return:', storeError)
      }
      try {
        await Browser.close()
      } catch (browserError) {
        console.warn('[sso-native] Could not close the external browser:', browserError)
      }
      status.value = 'success'
      if (router) {
        try {
          // Logged-out users keep browsing locally: back to budget, not
          // to a login screen (which would auto-open a new login browser).
          await router.replace('/budget')
        } catch (navigationError) {
          console.warn('[sso-native] Could not navigate to budget after logout:', navigationError)
        }
      }
      return true
    }

    try {
      await getSSOClient().handleCallback(url, { redirectUri: SSO_NATIVE_REDIRECT_URI })
      clearSsoFlow()
      try {
        await Browser.close()
      } catch (browserError) {
        console.warn('[sso-native] Could not close the external browser:', browserError)
      }
      status.value = 'success'
    } catch (callbackError) {
      // The attempt is over: the SDK already consumed the single-use PKCE
      // verifier, so redelivering this same deep link could never succeed
      // anyway. Recovery is a fresh login from the UI (new code, new verifier).
      clearSsoFlow()
      error.value = callbackError instanceof Error ? callbackError.message : String(callbackError)
      status.value = 'error'
      if (router) {
        try {
          await router.replace('/login?sso_error=1')
        } catch (navigationError) {
          console.warn('[sso-native] Could not navigate to login after error:', navigationError)
        }
      }
      return true
    }

    if (router) {
      try {
        await router.replace('/budget')
      } catch (navigationError) {
        console.warn('[sso-native] Could not navigate to budget after login:', navigationError)
      }
    }
    return true
  }

  async function start(params?: { router?: Router }): Promise<void> {
    if (removeListener) {
      return
    }
    if (!Capacitor.isNativePlatform()) {
      return
    }
    status.value = 'listening'
    const handle = await App.addListener('appUrlOpen', (event) => {
      void handleAppUrl({ url: event.url, router: params?.router })
    })
    const resumeHandle = await App.addListener('appStateChange', (event) => {
      if (!event.isActive) {
        return
      }
      void (async () => {
        // Android keeps handing back the original launch intent, so this URL is
        // sticky: only look at it while a flow we started is actually awaiting a
        // return, otherwise every resume would reprocess an old deep link.
        if (!readSsoFlow()) {
          return
        }
        try {
          const launchUrl = await App.getLaunchUrl()
          if (launchUrl?.url) {
            await handleAppUrl({ url: launchUrl.url, router: params?.router })
          }
        } catch (resumeError) {
          console.warn('[sso-native] Could not handle resume URL:', resumeError)
        }
      })()
    })
    removeListener = () => {
      void handle.remove()
      void resumeHandle.remove()
    }
  }

  return { status, error, start, handleAppUrl }
}
