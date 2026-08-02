export interface AuthGuardOptions {
    publicRoutes?: string[];
    loginRedirect?: boolean;
    redirectUri?: string;
}
export interface RouteLike {
    name?: string | symbol | null;
    path: string;
}
export interface NavigationGuardNext {
    (path?: string | {
        path: string;
    }): void;
}
export interface SSOClientLike {
    readonly isAuthenticated: boolean;
    loginWithRedirect(options?: {
        redirectUri?: string;
        screenHint?: "login" | "register";
    }): Promise<void>;
}
export declare function createAuthGuard(ssoClient: SSOClientLike, options?: AuthGuardOptions): (to: RouteLike, _from: RouteLike, next: NavigationGuardNext) => Promise<void>;
//# sourceMappingURL=createAuthGuard.d.ts.map