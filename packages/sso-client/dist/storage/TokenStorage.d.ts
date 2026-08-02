export declare class TokenStorage {
    private readonly TOKEN_KEY;
    private readonly REFRESH_KEY;
    private readonly PKCE_PREFIX;
    private readonly REMEMBER_KEY;
    getToken(): Promise<string | null>;
    setToken(token: string): Promise<void>;
    getRefreshToken(): Promise<string | null>;
    setRefreshToken(token: string): Promise<void>;
    getPkceVerifier(state: string): Promise<string | null>;
    setPkceVerifier(state: string, verifier: string): Promise<void>;
    removePkceVerifier(state: string): Promise<void>;
    getRememberMe(): Promise<boolean>;
    setRememberMe(value: boolean): Promise<void>;
    removeRememberMe(): Promise<void>;
    clear(): Promise<void>;
}
//# sourceMappingURL=TokenStorage.d.ts.map