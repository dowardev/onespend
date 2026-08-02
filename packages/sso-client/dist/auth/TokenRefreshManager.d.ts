import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { TokenStorage } from '../storage/TokenStorage';
import { DpopService } from '../dpop/DpopService';
interface SsoRequester {
    post<T>(url: string, data: object): Promise<T>;
    getSsoUrl(): string;
    getClientId(): string;
    onRefreshFailed(): void;
}
export declare class TokenRefreshManager {
    private tokenStorage;
    private dpopService;
    private ssoRequester;
    private isRefreshing;
    private autoRefreshTimer;
    private pendingRequests;
    constructor(tokenStorage: TokenStorage, dpopService: DpopService, ssoRequester: SsoRequester);
    handle401Error(failedRequest: AxiosError, recreateRequest: (config: InternalAxiosRequestConfig, token: string) => Promise<unknown>): Promise<unknown>;
    private refreshToken;
    private processPendingRequests;
    private rejectPendingRequests;
    startAutoRefresh(params: {
        intervalMs: number;
        onRefreshSuccess: (token: string) => void;
        onRefreshFailed: () => void;
    }): void;
    stopAutoRefresh(): void;
}
export {};
//# sourceMappingURL=TokenRefreshManager.d.ts.map