import { useAuthStore, type User } from '@/stores/authStore';
import { saveToken, getToken, removeToken } from '@/services/tokenStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

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

interface ApiAuthResponse {
  user: User;
  token: string;
}

class AuthController {
  private _store: ReturnType<typeof useAuthStore> | null = null;

  private get store(): ReturnType<typeof useAuthStore> {
    if (!this._store) {
      this._store = useAuthStore();
    }
    return this._store;
  }

  /**
   * Realiza una petición HTTP con el token Bearer si está disponible
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await getToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  /**
   * Inicia sesión con email/usuario y contraseña
   */
  async login(params: LoginParams): Promise<AuthResponse> {
    this.store.setIsLoading(true);
    this.store.setError(null);

    try {
      const response = await this.request<ApiAuthResponse>('/api/login', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      await saveToken(response.token);
      this.store.setUser(response.user);
      
      return { user: response.user };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Error al iniciar sesión';
      this.store.setError(errorMessage);
      return { error: errorMessage };
    } finally {
      this.store.setIsLoading(false);
    }
  }

  /**
   * Registra un nuevo usuario
   */
  async register(params: RegisterParams): Promise<AuthResponse> {
    this.store.setIsLoading(true);
    this.store.setError(null);

    try {
      const response = await this.request<ApiAuthResponse>('/api/register', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      await saveToken(response.token);
      this.store.setUser(response.user);
      
      return { user: response.user };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Error al registrar';
      this.store.setError(errorMessage);
      return { error: errorMessage };
    } finally {
      this.store.setIsLoading(false);
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  async logout(): Promise<void> {
    this.store.setIsLoading(true);

    try {
      await this.request('/api/logout', {
        method: 'POST',
      });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      await removeToken();
      this.store.logout();
      this.store.setIsLoading(false);
    }
  }

  /**
   * Obtiene los datos del usuario autenticado
   */
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

  /**
   * Verifica si hay una sesión activa (al iniciar la app)
   */
  async checkAuth(): Promise<boolean> {
    this.store.setIsLoading(true);

    try {
      const token = await getToken();
      if (!token) {
        this.store.setUser(null);
        return false;
      }

      const user = await this.fetchUser();
      if (user) {
        this.store.setUser(user);
        return true;
      }
      
      // Token inválido o expirado
      await removeToken();
      this.store.setUser(null);
      return false;
    } catch (e) {
      await removeToken();
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
