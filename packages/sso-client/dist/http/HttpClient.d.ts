import { AxiosRequestConfig } from 'axios';
import { TokenStorage } from '../storage/TokenStorage';
import { DpopService } from '../dpop/DpopService';
import { TokenRefreshManager } from '../auth/TokenRefreshManager';
export interface HttpClientConfig {
    apiBaseUrl: string;
    tokenStorage: TokenStorage;
    dpopService: DpopService;
    tokenRefreshManager: TokenRefreshManager;
}
export declare class HttpClient {
    private axiosInstance;
    private tokenStorage;
    private dpopService;
    private tokenRefreshManager;
    constructor(config: HttpClientConfig);
    get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
    post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
    put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
    patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
    delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
    private setupInterceptors;
    private buildFullUrl;
}
//# sourceMappingURL=HttpClient.d.ts.map