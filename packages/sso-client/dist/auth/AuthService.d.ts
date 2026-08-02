import { DpopService } from '../dpop/DpopService';
import { AuthResponse, RegisterParams, LoginParams, RefreshTokenParams, RecoverPasswordParams, ResetPasswordParams, User } from '../types';
interface InternalClient {
    post<T>(params: {
        url: string;
        data?: object;
    }): Promise<T>;
    get<T>(url: string): Promise<T>;
    getClientId(): string;
}
export declare class AuthService {
    private ssoClient;
    private dpopService;
    constructor(ssoClient: InternalClient);
    setDpopService(service: DpopService): void;
    login(params: LoginParams): Promise<AuthResponse>;
    register(params: RegisterParams): Promise<void>;
    logout(): Promise<void>;
    refreshToken(params: RefreshTokenParams): Promise<AuthResponse>;
    recoverPassword(params: RecoverPasswordParams): Promise<void>;
    resetPassword(params: ResetPasswordParams): Promise<void>;
    resendEmailVerification(email: string): Promise<void>;
    getUser(): Promise<User | null>;
    private getClientId;
}
export {};
//# sourceMappingURL=AuthService.d.ts.map