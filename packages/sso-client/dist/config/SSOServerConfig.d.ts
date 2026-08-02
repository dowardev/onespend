export declare class SSOServerConfig {
    private baseUrl;
    private ssoFrontendUrl;
    private apiBaseUrl;
    private clientId;
    private accessToken;
    constructor(params: {
        baseUrl: string;
        ssoFrontendUrl?: string;
        apiBaseUrl?: string;
        clientId?: string;
        accessToken?: string;
    });
    setAccessToken(token: string): void;
    getConfig(): {
        baseUrl: string;
        ssoFrontendUrl: string;
        apiBaseUrl: string;
        clientId: string;
        accessToken: string;
    };
}
//# sourceMappingURL=SSOServerConfig.d.ts.map