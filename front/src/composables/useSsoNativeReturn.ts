// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ref } from 'vue'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { getSSOClient } from '@/ssoClientAccessor'
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

export function useSsoNativeReturn() {
  const status = ref<SsoNativeStatus>('idle')
  const error = ref<string | null>(null)
  let removeListener: (() => void) | null = null

  async function handleAppUrl(params: { url: string; router?: Router }): Promise<boolean> {
    const { url, router } = params
    if (!isSsoNativeCallbackUrl({ url })) {
      return false
    }
    status.value = 'handling'
    error.value = null
    try {
      await getSSOClient().handleCallback(url, { redirectUri: SSO_NATIVE_REDIRECT_URI })
      try {
        await Browser.close()
      } catch (browserError) {
        console.warn('[sso-native] Could not close the external browser:', browserError)
      }
      status.value = 'success'
    } catch (callbackError) {
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
    removeListener = () => {
      void handle.remove()
    }
  }

  return { status, error, start, handleAppUrl }
}
