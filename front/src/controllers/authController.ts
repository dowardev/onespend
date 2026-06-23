import { useAuthStore, type User } from '@/stores/authStore'
import { getSSOClient } from '@/ssoClientAccessor'
import { clearAllUserData } from '@/services/dataClearService'
import { syncService } from '@/services/syncService'

class AuthController {
  private _store: ReturnType<typeof useAuthStore> | null = null

  private get store(): ReturnType<typeof useAuthStore> {
    if (!this._store) {
      this._store = useAuthStore()
    }
    return this._store
  }

  async login(_params?: { login?: string; password?: string }): Promise<void> {
    await getSSOClient().loginWithRedirect({
      redirectUri: `${window.location.origin}/auth/callback`,
    })
  }

  async register(_params?: Record<string, unknown>): Promise<void> {
    await getSSOClient().loginWithRedirect({
      redirectUri: `${window.location.origin}/auth/callback`,
      screenHint: 'register',
    })
  }

  async logout(): Promise<boolean> {
    const pendingItems = await syncService.getQueueCount()

    if (pendingItems > 0) {
      const confirmed = window.confirm(
        `Tienes ${pendingItems} cambio(s) pendiente(s) de sincronizar. ` +
          `Si cierras sesión ahora, estos datos se perderán. ¿Deseas continuar?`,
      )

      if (!confirmed) {
        return false
      }
    }

    this.store.setIsLoading(true)

    try {
      await getSSOClient().logout()
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

  async checkAuth(): Promise<boolean> {
    const isAuth = getSSOClient().isAuthenticated
    if (isAuth) {
      const user = await getSSOClient().getUser()
      if (user) {
        this.store.setUser({
          id: Number(user.id),
          name: user.name || '',
          user: user.user || '',
          email: user.email || '',
        })
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
        return {
          id: Number(user.id),
          name: user.name || '',
          user: user.user || '',
          email: user.email || '',
        }
      }
    } catch {
      // ignore
    }
    return null
  }

  clearError(): void {
    this.store.clearError()
  }
}

const authController = new AuthController()
export default authController
export { AuthController }
