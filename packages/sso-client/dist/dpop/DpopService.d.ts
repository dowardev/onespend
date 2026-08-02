export declare class DpopService {
    private privateKey;
    private publicKeyJwk;
    private jkt;
    initialize(): Promise<void>;
    generateKeyPair(): Promise<void>;
    getPublicKeyJwk(): JsonWebKey | null;
    getJwkThumbprint(): string | null;
    createDpopProof(htm: string, htu: string, accessToken?: string): Promise<string>;
    clearKeys(): Promise<void>;
    private computeJwkThumbprint;
    private base64UrlEncode;
    private saveToIndexedDB;
    private loadFromIndexedDB;
    private deleteFromIndexedDB;
}
//# sourceMappingURL=DpopService.d.ts.map