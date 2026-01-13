import { useAuthStore, type User } from '@/stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface LoginParams {
  login: string;
  password: string;
}

interface RegisterParams {
  name: string;
  user: string;
  email: string;
  password: string;
  password_confirmation: string;
}

interface AuthResponse {
  user?: User;
  error?: string;
}

class AuthController {
  private _store: ReturnType<typeof useAuthStore> | null = null;
  private csrfToken: string | null = null;

  private get store(): ReturnType<typeof useAuthStore> {
    if (!this._store) {
      this._store = useAuthStore();
    }
    return this._store;
  }

  private getCsrfToken(): string | null {
    const match = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'));
    if (match) {
      return decodeURIComponent(match[2]);
    }
    return null;
  }

  private async csrf(): Promise<void> {
    await fetch(`${API_URL}/sanctum/csrf-cookie`, {
      credentials: 'include',
    });
    this.csrfToken = this.getCsrfToken();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.csrfToken) {
      headers['X-XSRF-TOKEN'] = this.csrfToken;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async login(params: LoginParams): Promise<AuthResponse> {
    this.store.setIsLoading(true);
    this.store.setError(null);

    try {
      await this.csrf();
      await this.request('/api/login', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      const user = await this.fetchUser();
      if (user) {
        this.store.setUser(user);
        return { user };
      }
      return { error: 'No se pudo obtener la información del usuario' };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Error al iniciar sesión';
      this.store.setError(errorMessage);
      return { error: errorMessage };
    } finally {
      this.store.setIsLoading(false);
    }
  }

  async register(params: RegisterParams): Promise<AuthResponse> {
    this.store.setIsLoading(true);
    this.store.setError(null);

    try {
      await this.csrf();
      await this.request('/api/register', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      const user = await this.fetchUser();
      if (user) {
        this.store.setUser(user);
        return { user };
      } else {
        this.store.setUser(null);
        return { error: 'No se pudo obtener la información del usuario' };
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Error al registrar';
      this.store.setError(errorMessage);
      return { error: errorMessage };
    } finally {
      this.store.setIsLoading(false);
    }
  }

  async logout(): Promise<void> {
    this.store.setIsLoading(true);

    try {
      await this.csrf();
      await this.request('/api/logout', {
        method: 'POST',
      });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      this.store.logout();
      this.store.setIsLoading(false);
    }
  }

  async fetchUser(): Promise<User | null> {
    try {
      const user = await this.request<User>('/api/user', {
        method: 'GET',
      });
      return user;
    } catch (e) {
      console.error('fetchUser error:', e);
      return null;
    }
  }

  async checkAuth(): Promise<boolean> {
    this.store.setIsLoading(true);

    try {
      await this.csrf();
      const user = await this.fetchUser();
      if (user) {
        this.store.setUser(user);
        return true;
      }
      this.store.setUser(null);
      return false;
    } catch (e) {
      this.store.setUser(null);
      return false;
    } finally {
      this.store.setIsLoading(false);
    }
  }

  getIsLoading(): boolean {
    return this.store.isLoading;
  }

  getError(): string | null {
    return this.store.error;
  }

  getIsAuthenticated(): boolean {
    return this.store.isAuthenticated;
  }

  getUser(): User | null {
    return this.store.user;
  }

  getUserName(): string {
    return this.store.userUsername;
  }

  getUserEmail(): string {
    return this.store.userEmail;
  }

  clearError(): void {
    this.store.clearError();
  }
}

const authController = new AuthController();
export default authController;
export { AuthController };
