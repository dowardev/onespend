// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useAuthStore, type User } from '@/stores/authStore'
import { translate } from '@/i18n'
import { getSSOClient } from '@/ssoClientAccessor'
import { clearAllUserData } from '@/services/dataClearService'
import { syncService } from '@/services/syncService'
import { syncApiService } from '@/services/sync/SyncApiService'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import {
  SSO_NATIVE_REDIRECT_URI,
  markSsoLoginStarted,
  markSsoLogoutStarted,
} from '@/composables/useSsoNativeReturn'

type SSOUserWithAdmin = {
  id?: string | number;
  name?: string;
  user?: string;
  email?: string;
  is_admin?: boolean;
}

function toStoreUser(user: SSOUserWithAdmin): User {
  return {
    id: Number(user.id),
    name: user.name || '',
    user: user.user || '',
    email: user.email || '',
    isAdmin: Boolean(user.is_admin),
  }
}

class AuthController {
  private _store: ReturnType<typeof useAuthStore> | null = null
  private cleanupAuthExpiredListener: (() => void) | null = null

  private get store(): ReturnType<typeof useAuthStore> {
    if (!this._store) {
      this._store = useAuthStore()
    }
    return this._store
  }

  private async runWithBrowserCancel(params: { task: () => Promise<void> }): Promise<void> {
    let cancelTask: (() => void) | null = null
    const cancelled = new Promise<never>((_, reject) => {
      cancelTask = () => reject(new Error('External browser closed before completing authentication'))
    })
    const cancelHandle = await Browser.addListener('browserFinished', () => {
      window.setTimeout(() => {
        if (!getSSOClient().isAuthenticated) {
          cancelTask?.()
        }
      }, 2000)
    })
    try {
      await Promise.race([params.task(), cancelled])
    } finally {
      try {
        await cancelHandle.remove()
      } catch (removeError) {
        console.warn('[auth] Could not remove browser listener:', removeError)
      }
    }
  }

  async login(_params?: { login?: string; password?: string }): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      // Record the flow before leaving the app: the deep-link return is only
      // honoured while a flow is pending, which is what stops stale or foreign
      // deep links from being processed as if they were ours.
      markSsoLoginStarted()
      await this.runWithBrowserCancel({
        task: async () => {
          await getSSOClient().loginWithRedirect({
            redirectUri: SSO_NATIVE_REDIRECT_URI,
            openUrl: async (params: { url: string }) => {
              await Browser.open(params)
            },
          })
        },
      })
      return
    }
    await getSSOClient().loginWithRedirect({
      redirectUri: `${window.location.origin}/auth/callback`,
    })
  }

  async register(_params?: Record<string, unknown>): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      markSsoLoginStarted()
      await this.runWithBrowserCancel({
        task: async () => {
          await getSSOClient().loginWithRedirect({
            redirectUri: SSO_NATIVE_REDIRECT_URI,
            screenHint: 'register',
            openUrl: async (params: { url: string }) => {
              await Browser.open(params)
            },
          })
        },
      })
      return
    }
    await getSSOClient().loginWithRedirect({
      redirectUri: `${window.location.origin}/auth/callback`,
      screenHint: 'register',
    })
  }

  async logout(): Promise<boolean> {
    const pendingItems = await syncService.getQueueCount()

    if (pendingItems > 0) {
      const confirmed = window.confirm(
        translate('auth.logoutPendingWarning', { count: pendingItems }),
      )

      if (!confirmed) {
        return false
      }
    }

    this.store.setIsLoading(true)

    try {
      if (Capacitor.isNativePlatform()) {
        markSsoLogoutStarted()
        await getSSOClient().logout({
          redirectUri: SSO_NATIVE_REDIRECT_URI,
          openUrl: async ({ url }: { url: string }) => {
            await Browser.open({ url })
          },
        })
      } else {
        await getSSOClient().logout()
      }
    } catch (e) {
      console.error('Logout error:', e)
    } finally {
      await clearAllUserData()
      this.store.logout()
      this.store.setIsLoading(false)
    }

    return true
  }

  getIsLoading(): boolean {
    return this.store.isLoading
  }

  getError(): string | null {
    return this.store.error
  }

  getIsAuthenticated(): boolean {
    return this.store.isAuthenticated
  }

  getUser(): User | null {
    return this.store.user
  }

  getUserName(): string {
    return this.store.userName
  }

  getUserEmail(): string {
    return this.store.userEmail
  }

  getIsAdmin(): boolean {
    return this.store.userIsAdmin
  }

  async checkAuth(): Promise<boolean> {
    const isAuth = getSSOClient().isAuthenticated
    if (isAuth) {
      const user = await getSSOClient().getUser()
      if (user) {
        this.store.setUser(toStoreUser(user))
          }
    } else {
      this.store.logout()
    }
    return isAuth
  }

  async fetchUser(): Promise<User | null> {
    try {
      const user = await getSSOClient().getUser()
      if (user) {
            return toStoreUser(user)
          }
    } catch {
      // ignore
    }
    return null
  }

  clearError(): void {
    this.store.clearError()
  }

  start(): void {
    if (this.cleanupAuthExpiredListener) return

    const DEBOUNCE_MS = 500
    let timer: ReturnType<typeof setTimeout> | null = null

    const unsubscribe = syncApiService.onAuthExpired(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        this.checkAuth()
      }, DEBOUNCE_MS)
    })

    this.cleanupAuthExpiredListener = () => {
      unsubscribe()
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }
  }
}

const authController = new AuthController()
export default authController
export { AuthController }
