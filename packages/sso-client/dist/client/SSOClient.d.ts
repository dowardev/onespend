import { HttpClient } from '../http/HttpClient';
import { AuthState, AuthResponse, RegisterParams, LoginParams, User } from '../types';
interface SSOClientConfig {
    ssoUrl: string;
    ssoFrontendUrl: string;
    apiBaseUrl: string;
    clientId: string;
}
export declare class SSOClient {
    private configService;
    private baseUrl;
    private ssoFrontendUrl;
    private clientId;
    private dpopService;
    private authService;
    private tokenStorage;
    private tokenRefreshManager;
    private authStateListeners;
    private currentUser;
    private _isAuthenticated;
    private readonly AUTO_REFRESH_INTERVAL;
    readonly http: HttpClient;
    constructor(config: SSOClientConfig);
    get isAuthenticated(): boolean;
    init(): Promise<void>;
    login(params: LoginParams): Promise<AuthResponse>;
    loginWithRedirect(options?: {
        redirectUri?: string;
        screenHint?: "login" | "register";
    }): Promise<void>;
    handleCallback(url: string): Promise<{
        user: User;
    }>;
    register(params: RegisterParams): Promise<void>;
    logout(options?: {
        redirectUri?: string;
    }): Promise<void>;
    refreshToken(refreshToken: string): Promise<AuthResponse>;
    recoverPassword(params: {
        email: string;
    }): Promise<void>;
    resetPassword(params: {
        email: string;
        code: number | string;
        password: string;
    }): Promise<void>;
    resendEmailVerification(email: string): Promise<void>;
    getUser(): Promise<User | null>;
    onAuthStateChange(callback: (state: AuthState) => void): () => void;
    private startAutoRefresh;
    private stopAutoRefresh;
    private handleAuthResponse;
    private handleRefreshFailed;
    private emitAuthState;
    private getFullUrl;
    private internalPost;
}
export {};
//# sourceMappingURL=SSOClient.d.ts.map