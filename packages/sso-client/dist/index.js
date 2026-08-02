var S = Object.defineProperty;
var w = (c, e, t) => e in c ? S(c, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : c[e] = t;
var o = (c, e, t) => w(c, typeof e != "symbol" ? e + "" : e, t);
import d from "axios";
class R {
  constructor(e) {
    o(this, "baseUrl", "");
    o(this, "ssoFrontendUrl", "");
    o(this, "apiBaseUrl", "");
    o(this, "clientId", "");
    o(this, "accessToken", "");
    e && (this.baseUrl = e.baseUrl ?? "", this.ssoFrontendUrl = e.ssoFrontendUrl ?? "", this.apiBaseUrl = e.apiBaseUrl ?? "", this.clientId = e.clientId ?? "", this.accessToken = e.accessToken ?? "");
  }
  setAccessToken(e) {
    this.accessToken = e;
  }
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      ssoFrontendUrl: this.ssoFrontendUrl,
      apiBaseUrl: this.apiBaseUrl,
      clientId: this.clientId,
      accessToken: this.accessToken
    };
  }
}
class m {
  constructor() {
    o(this, "privateKey", null);
    o(this, "publicKeyJwk", null);
    o(this, "jkt", null);
  }
  async initialize() {
    const e = await this.loadFromIndexedDB();
    if (e) {
      this.privateKey = e.privateKey, this.publicKeyJwk = e.publicKeyJwk, this.jkt = e.jkt;
      return;
    }
    await this.generateKeyPair();
  }
  async generateKeyPair() {
    const e = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256"
      },
      !0,
      ["sign", "verify"]
    );
    this.privateKey = e.privateKey, this.publicKeyJwk = await crypto.subtle.exportKey("jwk", e.publicKey), this.publicKeyJwk = {
      kty: "RSA",
      n: this.publicKeyJwk.n,
      e: this.publicKeyJwk.e
    }, this.jkt = await this.computeJwkThumbprint(this.publicKeyJwk), await this.saveToIndexedDB();
  }
  getPublicKeyJwk() {
    return this.publicKeyJwk;
  }
  getJwkThumbprint() {
    return this.jkt;
  }
  async createDpopProof(e, t, s) {
    if (!this.privateKey || !this.publicKeyJwk)
      throw new Error("DPoP key pair not initialized");
    if (!e || !t)
      throw new Error("htm and htu are required for DPoP proof");
    const r = Math.floor(Date.now() / 1e3), n = crypto.randomUUID(), i = new TextEncoder(), a = {
      typ: "dpop+jwt",
      alg: "RS256",
      jwk: {
        kty: this.publicKeyJwk.kty,
        n: this.publicKeyJwk.n,
        e: this.publicKeyJwk.e
      }
    }, h = {
      htm: e,
      htu: t,
      iat: r,
      jti: n
    };
    if (s) {
      const y = await crypto.subtle.digest(
        "SHA-256",
        i.encode(s)
      );
      h.ath = this.base64UrlEncode(new Uint8Array(y));
    }
    const l = this.base64UrlEncode(
      i.encode(JSON.stringify(a))
    ), u = this.base64UrlEncode(
      i.encode(JSON.stringify(h))
    ), p = `${l}.${u}`, f = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      this.privateKey,
      i.encode(p)
    ), k = this.base64UrlEncode(
      new Uint8Array(f)
    );
    return `${p}.${k}`;
  }
  async clearKeys() {
    this.privateKey = null, this.publicKeyJwk = null, this.jkt = null, await this.deleteFromIndexedDB();
  }
  async computeJwkThumbprint(e) {
    const t = JSON.stringify({
      kty: e.kty,
      n: e.n,
      e: e.e
    }), s = new TextEncoder(), r = await crypto.subtle.digest(
      "SHA-256",
      s.encode(t)
    );
    return this.base64UrlEncode(new Uint8Array(r));
  }
  base64UrlEncode(e) {
    const t = e instanceof ArrayBuffer ? new Uint8Array(e) : e;
    let s = "";
    for (let r = 0; r < t.length; r++)
      s += String.fromCharCode(t[r]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  async saveToIndexedDB() {
    if (!this.privateKey || !this.publicKeyJwk || !this.jkt) return;
    const t = {
      privateKeyJwk: await crypto.subtle.exportKey("jwk", this.privateKey),
      publicKeyJwk: this.publicKeyJwk,
      jkt: this.jkt
    };
    return new Promise((s, r) => {
      const n = indexedDB.open("dpop_keys", 1);
      n.onupgradeneeded = () => {
        const i = n.result;
        i.objectStoreNames.contains("keys") || i.createObjectStore("keys");
      }, n.onsuccess = () => {
        const a = n.result.transaction("keys", "readwrite");
        a.objectStore("keys").put(t, "dpop"), a.oncomplete = () => s(), a.onerror = () => r(a.error);
      }, n.onerror = () => r(n.error);
    });
  }
  async loadFromIndexedDB() {
    return new Promise((e) => {
      const t = indexedDB.open("dpop_keys", 1);
      t.onupgradeneeded = () => {
        const s = t.result;
        s.objectStoreNames.contains("keys") || s.createObjectStore("keys");
      }, t.onsuccess = async () => {
        const s = t.result;
        if (!s.objectStoreNames.contains("keys")) {
          e(null);
          return;
        }
        const i = s.transaction("keys", "readonly").objectStore("keys").get("dpop");
        i.onsuccess = async () => {
          const a = i.result;
          if (!a) {
            e(null);
            return;
          }
          try {
            const h = await crypto.subtle.importKey(
              "jwk",
              a.privateKeyJwk,
              { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
              !0,
              ["sign"]
            );
            e({
              privateKey: h,
              publicKeyJwk: a.publicKeyJwk,
              jkt: a.jkt
            });
          } catch {
            e(null);
          }
        }, i.onerror = () => e(null);
      }, t.onerror = () => e(null);
    });
  }
  async deleteFromIndexedDB() {
    return new Promise((e) => {
      const t = indexedDB.deleteDatabase("dpop_keys");
      t.onsuccess = () => e(), t.onerror = () => e();
    });
  }
}
class b {
  constructor(e) {
    o(this, "ssoClient");
    o(this, "dpopService", null);
    this.ssoClient = e;
  }
  setDpopService(e) {
    this.dpopService = e;
  }
  async login(e) {
    const { email: t, password: s, rememberMe: r } = e, n = this.ssoClient.getClientId(), i = {
      email: t,
      password: s,
      client_id: n
    };
    return r && (i.remember_me = !0), await this.ssoClient.post({
      url: "login",
      data: i
    });
  }
  async register(e) {
    var r;
    const t = (r = this.dpopService) == null ? void 0 : r.getPublicKeyJwk(), s = {
      ...e,
      client_id: this.ssoClient.getClientId()
    };
    t && (s.dpop_public_key = JSON.stringify(t)), await this.ssoClient.post({
      url: "register",
      data: s
    });
  }
  async logout() {
    var e;
    await ((e = this.dpopService) == null ? void 0 : e.clearKeys());
  }
  async refreshToken(e) {
    return await this.ssoClient.post({
      url: "refresh-token",
      data: { refreshToken: e.refreshToken }
    });
  }
  async recoverPassword(e) {
    await this.ssoClient.post({
      url: "recover-password",
      data: { email: e.email }
    });
  }
  async resetPassword(e) {
    const { email: t, code: s, password: r } = e;
    await this.ssoClient.post({
      url: "reset-password",
      data: { email: t, code: s, password: r }
    });
  }
  async resendEmailVerification(e) {
    await this.ssoClient.post({
      url: "resend-confirmation-email",
      data: { email: e }
    });
  }
  async getUser() {
    var t;
    const e = this.getClientId();
    if (!e)
      return console.warn("SSO Client: client_id not configured"), null;
    try {
      return await this.ssoClient.get(
        `user-auth?client_id=${e}`
      );
    } catch (s) {
      const r = s;
      if (r.errorDetail === "Unauthenticated." || ((t = r.response) == null ? void 0 : t.status) === 401)
        return null;
      throw s;
    }
  }
  getClientId() {
    return this.ssoClient.getClientId() || null;
  }
}
class U {
  constructor() {
    o(this, "TOKEN_KEY", "@dowardev/sso-client:token");
    o(this, "REFRESH_KEY", "@dowardev/sso-client:refresh-token");
    o(this, "PKCE_PREFIX", "@dowardev/sso-client:pkce:");
    o(this, "REMEMBER_KEY", "@dowardev/sso-client:remember-me");
  }
  async getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }
  async setToken(e) {
    localStorage.setItem(this.TOKEN_KEY, e);
  }
  async getRefreshToken() {
    return localStorage.getItem(this.REFRESH_KEY);
  }
  async setRefreshToken(e) {
    localStorage.setItem(this.REFRESH_KEY, e);
  }
  async getPkceVerifier(e) {
    return sessionStorage.getItem(`${this.PKCE_PREFIX}${e}`);
  }
  async setPkceVerifier(e, t) {
    sessionStorage.setItem(`${this.PKCE_PREFIX}${e}`, t);
  }
  async removePkceVerifier(e) {
    sessionStorage.removeItem(`${this.PKCE_PREFIX}${e}`);
  }
  async getRememberMe() {
    return localStorage.getItem(this.REMEMBER_KEY) === "true";
  }
  async setRememberMe(e) {
    localStorage.setItem(this.REMEMBER_KEY, String(e));
  }
  async removeRememberMe() {
    localStorage.removeItem(this.REMEMBER_KEY);
  }
  async clear() {
    localStorage.removeItem(this.TOKEN_KEY), localStorage.removeItem(this.REFRESH_KEY), localStorage.removeItem(this.REMEMBER_KEY);
    for (let e = sessionStorage.length - 1; e >= 0; e--) {
      const t = sessionStorage.key(e);
      t != null && t.startsWith(this.PKCE_PREFIX) && sessionStorage.removeItem(t);
    }
  }
}
class v {
  constructor(e, t, s) {
    o(this, "tokenStorage");
    o(this, "dpopService");
    o(this, "ssoRequester");
    o(this, "isRefreshing", !1);
    o(this, "autoRefreshTimer", null);
    o(this, "pendingRequests", []);
    this.tokenStorage = e, this.dpopService = t, this.ssoRequester = s;
  }
  async handle401Error(e, t) {
    const s = e.config;
    if (s._retry || (s._retry = !0, !await this.tokenStorage.getRefreshToken()))
      return Promise.reject(e);
    if (this.isRefreshing)
      return new Promise((n, i) => {
        this.pendingRequests.push({
          resolve: (a) => {
            t(s, a).then(n).catch(i);
          },
          reject: i
        });
      });
    this.isRefreshing = !0;
    try {
      const n = await this.refreshToken();
      return this.processPendingRequests(n), await t(s, n);
    } catch (n) {
      return this.rejectPendingRequests(n), this.ssoRequester.onRefreshFailed(), Promise.reject(n);
    } finally {
      this.isRefreshing = !1;
    }
  }
  async refreshToken() {
    const e = await this.tokenStorage.getRefreshToken();
    if (!e)
      throw new Error("No refresh token available");
    const t = this.ssoRequester.getSsoUrl(), s = this.ssoRequester.getClientId(), r = `${t.replace(/\/$/, "")}/refresh-token`, n = await this.tokenStorage.getToken(), i = (n == null ? void 0 : n.replace(/^Bearer\s+/i, "")) || "", a = i ? await this.dpopService.createDpopProof("POST", r, i) : void 0, h = await d.request({
      url: r,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...i ? { Authorization: `Bearer ${i}` } : {},
        ...a ? { DPoP: a } : {}
      },
      data: {
        refreshToken: e,
        client_id: s
      }
    }), { token: l, refreshToken: u } = h.data;
    return await this.tokenStorage.setToken(l), u && await this.tokenStorage.setRefreshToken(u), l;
  }
  processPendingRequests(e) {
    for (const t of this.pendingRequests)
      t.resolve(e);
    this.pendingRequests = [];
  }
  rejectPendingRequests(e) {
    for (const t of this.pendingRequests)
      t.reject(e);
    this.pendingRequests = [];
  }
  startAutoRefresh(e) {
    this.stopAutoRefresh(), this.autoRefreshTimer = setInterval(async () => {
      try {
        const t = await this.refreshToken();
        e.onRefreshSuccess(t);
      } catch {
        this.stopAutoRefresh(), e.onRefreshFailed();
      }
    }, e.intervalMs);
  }
  stopAutoRefresh() {
    this.autoRefreshTimer !== null && (clearInterval(this.autoRefreshTimer), this.autoRefreshTimer = null);
  }
}
class P {
  constructor(e) {
    o(this, "axiosInstance");
    o(this, "tokenStorage");
    o(this, "dpopService");
    o(this, "tokenRefreshManager");
    this.tokenStorage = e.tokenStorage, this.dpopService = e.dpopService, this.tokenRefreshManager = e.tokenRefreshManager, this.axiosInstance = d.create({
      baseURL: e.apiBaseUrl
    }), this.setupInterceptors();
  }
  async get(e, t) {
    return (await this.axiosInstance.get(e, t)).data;
  }
  async post(e, t, s) {
    return (await this.axiosInstance.post(e, t, s)).data;
  }
  async put(e, t, s) {
    return (await this.axiosInstance.put(e, t, s)).data;
  }
  async patch(e, t, s) {
    return (await this.axiosInstance.patch(e, t, s)).data;
  }
  async delete(e, t) {
    return (await this.axiosInstance.delete(e, t)).data;
  }
  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(
      async (e) => {
        if (e.skipAuth) return e;
        const s = await this.tokenStorage.getToken();
        if (!s) return e;
        const r = s.replace(/^Bearer\s+/i, "");
        e.headers.set("Authorization", `Bearer ${r}`);
        const n = this.buildFullUrl(e.baseURL, e.url);
        try {
          const i = await this.dpopService.createDpopProof(
            (e.method || "GET").toUpperCase(),
            n,
            r
          );
          e.headers.set("DPoP", i);
        } catch {
        }
        return e;
      }
    ), this.axiosInstance.interceptors.response.use(
      (e) => e,
      async (e) => {
        var t;
        if (((t = e.response) == null ? void 0 : t.status) === 401) {
          const s = e.config;
          return s.skipAuth || s._retry ? Promise.reject(e) : this.tokenRefreshManager.handle401Error(
            e,
            async (r, n) => {
              const i = n.replace(/^Bearer\s+/i, "");
              r.headers.set("Authorization", `Bearer ${i}`);
              const a = this.buildFullUrl(
                r.baseURL,
                r.url
              );
              try {
                const h = await this.dpopService.createDpopProof(
                  (r.method || "GET").toUpperCase(),
                  a,
                  i
                );
                r.headers.set("DPoP", h);
              } catch {
              }
              return this.axiosInstance.request(r);
            }
          );
        }
        return Promise.reject(e);
      }
    );
  }
  buildFullUrl(e, t) {
    return t ? t.startsWith("http") ? t : `${(e || "").replace(/\/$/, "")}/${t.replace(/^\//, "")}` : e || "";
  }
}
function T() {
  const c = new Uint8Array(32);
  return crypto.getRandomValues(c), g(c);
}
async function A(c) {
  const t = new TextEncoder().encode(c), s = await crypto.subtle.digest("SHA-256", t);
  return g(new Uint8Array(s));
}
function g(c) {
  const e = c instanceof ArrayBuffer ? new Uint8Array(c) : c;
  let t = "";
  for (let s = 0; s < e.length; s++)
    t += String.fromCharCode(e[s]);
  return btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
class _ {
  constructor(e) {
    o(this, "configService");
    o(this, "baseUrl", "");
    o(this, "ssoFrontendUrl", "");
    o(this, "clientId", "");
    o(this, "dpopService");
    o(this, "authService");
    o(this, "tokenStorage");
    o(this, "tokenRefreshManager");
    o(this, "authStateListeners", []);
    o(this, "currentUser", null);
    o(this, "_isAuthenticated", !1);
    o(this, "AUTO_REFRESH_INTERVAL", 3e6);
    o(this, "http");
    this.configService = new R({
      baseUrl: e.ssoUrl,
      ssoFrontendUrl: e.ssoFrontendUrl,
      apiBaseUrl: e.apiBaseUrl,
      clientId: e.clientId
    });
    const t = this.configService.getConfig();
    this.baseUrl = t.baseUrl, this.ssoFrontendUrl = t.ssoFrontendUrl, this.clientId = t.clientId, this.dpopService = new m(), this.tokenStorage = new U(), this.authService = new b(
      new E(this.configService, this.dpopService)
    ), this.authService.setDpopService(this.dpopService), this.tokenRefreshManager = new v(
      this.tokenStorage,
      this.dpopService,
      {
        post: (s, r) => this.internalPost(s, r),
        getSsoUrl: () => this.baseUrl,
        getClientId: () => this.clientId,
        onRefreshFailed: () => this.handleRefreshFailed()
      }
    ), this.http = new P({
      apiBaseUrl: t.apiBaseUrl,
      tokenStorage: this.tokenStorage,
      dpopService: this.dpopService,
      tokenRefreshManager: this.tokenRefreshManager
    });
  }
  get isAuthenticated() {
    return this._isAuthenticated;
  }
  async init() {
    await this.dpopService.initialize();
    const e = await this.tokenStorage.getToken();
    if (e) {
      this.configService.setAccessToken(e);
      try {
        const t = await this.authService.getUser();
        if (t) {
          this.currentUser = t, this._isAuthenticated = !0, this.emitAuthState({
            isAuthenticated: !0,
            user: t
          }), await this.tokenStorage.getRememberMe() && this.startAutoRefresh();
          return;
        }
      } catch {
      }
    }
    this._isAuthenticated = !1, this.emitAuthState({
      isAuthenticated: !1,
      user: null
    });
  }
  async login(e) {
    const t = await this.authService.login(e);
    await this.handleAuthResponse(t);
    const s = e.rememberMe ?? !1;
    return await this.tokenStorage.setRememberMe(s), s && this.startAutoRefresh(), t;
  }
  async loginWithRedirect(e) {
    const t = (e == null ? void 0 : e.redirectUri) || `${window.location.origin}/auth/callback`, s = T(), r = await A(s), n = crypto.randomUUID();
    await this.tokenStorage.setPkceVerifier(n, s);
    const i = new URL(
      (e == null ? void 0 : e.screenHint) === "register" ? "/auth/register" : "/auth/login",
      this.ssoFrontendUrl
    );
    i.searchParams.set("client_id", this.clientId), i.searchParams.set("redirect_uri", t), i.searchParams.set("response_type", "code"), i.searchParams.set("state", n), i.searchParams.set("code_challenge", r), i.searchParams.set("code_challenge_method", "S256"), window.location.href = i.toString();
  }
  async handleCallback(e) {
    const s = new URL(e).searchParams, r = s.get("code"), n = s.get("state");
    if (!r)
      throw new Error("No authorization code provided in callback");
    const i = n ? await this.tokenStorage.getPkceVerifier(n) : null, a = {
      grant_type: "authorization_code",
      code: r,
      client_id: this.clientId,
      redirect_uri: `${window.location.origin}/auth/callback`
    };
    i && (a.code_verifier = i);
    const h = this.dpopService.getPublicKeyJwk();
    h && (a.dpop_public_key = JSON.stringify(h));
    const l = await this.internalPost("oauth/token", a);
    return n && await this.tokenStorage.removePkceVerifier(n), await this.handleAuthResponse({
      token: l.token,
      refreshToken: l.refreshToken,
      user: l.user
    }), { user: l.user };
  }
  async register(e) {
    await this.authService.register(e);
  }
  async logout(e) {
    this.stopAutoRefresh(), await this.tokenStorage.removeRememberMe();
    try {
      await this.internalPost("logout", {});
    } catch {
    }
    await this.authService.logout(), await this.tokenStorage.clear(), this.configService.setAccessToken(""), this.currentUser = null, this._isAuthenticated = !1, this.emitAuthState({
      isAuthenticated: !1,
      user: null
    });
    const t = (e == null ? void 0 : e.redirectUri) || `${window.location.origin}/auth/callback`, s = new URL("/auth/logout", this.ssoFrontendUrl);
    s.searchParams.set("client_id", this.clientId), s.searchParams.set("redirect_uri", t), window.location.href = s.toString();
  }
  async refreshToken(e) {
    const t = await this.authService.refreshToken({ refreshToken: e });
    return await this.handleAuthResponse(t), t;
  }
  async recoverPassword(e) {
    await this.authService.recoverPassword(e);
  }
  async resetPassword(e) {
    await this.authService.resetPassword(e);
  }
  async resendEmailVerification(e) {
    await this.authService.resendEmailVerification(e);
  }
  async getUser() {
    if (this.currentUser) return this.currentUser;
    const e = await this.authService.getUser();
    return e && (this.currentUser = e), e;
  }
  onAuthStateChange(e) {
    return this.authStateListeners.push(e), e({
      isAuthenticated: this._isAuthenticated,
      user: this.currentUser
    }), () => {
      const t = this.authStateListeners.indexOf(e);
      t >= 0 && this.authStateListeners.splice(t, 1);
    };
  }
  async startAutoRefresh() {
    this.tokenRefreshManager.startAutoRefresh({
      intervalMs: this.AUTO_REFRESH_INTERVAL,
      onRefreshSuccess: (e) => {
        this.configService.setAccessToken(e);
      },
      onRefreshFailed: () => {
        this.handleRefreshFailed();
      }
    });
  }
  stopAutoRefresh() {
    this.tokenRefreshManager.stopAutoRefresh();
  }
  async handleAuthResponse(e) {
    if (e.token && (await this.tokenStorage.setToken(e.token), this.configService.setAccessToken(e.token)), e.refreshToken && await this.tokenStorage.setRefreshToken(e.refreshToken), e.user)
      this.currentUser = e.user;
    else
      try {
        const t = await this.authService.getUser();
        t && (this.currentUser = t);
      } catch {
      }
    this._isAuthenticated = !!this.currentUser, this.emitAuthState({
      isAuthenticated: this._isAuthenticated,
      user: this.currentUser
    });
  }
  async handleRefreshFailed() {
    this.currentUser = null, this._isAuthenticated = !1, await this.tokenStorage.getRefreshToken() && (await this.tokenStorage.clear(), this.configService.setAccessToken("")), this.emitAuthState({
      isAuthenticated: !1,
      user: null
    });
  }
  emitAuthState(e) {
    for (const t of this.authStateListeners)
      t(e);
  }
  getFullUrl(e) {
    return `${this.baseUrl.endsWith("/") ? this.baseUrl.slice(0, -1) : this.baseUrl}/${e}`;
  }
  async internalPost(e, t) {
    const s = this.configService.getConfig().accessToken, r = s.replace(/^Bearer\s+/i, ""), n = s ? await this.dpopService.createDpopProof("POST", this.getFullUrl(e), r) : void 0;
    return (await d.request({
      url: this.getFullUrl(e),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...s ? { Authorization: `Bearer ${r}` } : {},
        ...n ? { DPoP: n } : {}
      },
      data: t
    })).data;
  }
}
class E {
  constructor(e, t) {
    o(this, "configService");
    o(this, "dpopService");
    this.configService = e, this.dpopService = t;
  }
  getClientId() {
    return this.configService.getConfig().clientId;
  }
  async get(e) {
    return this.request("GET", e);
  }
  async post(e) {
    return this.request("POST", e.url, e.data);
  }
  async request(e, t, s) {
    const r = this.configService.getConfig().accessToken, n = r.replace(/^Bearer\s+/i, ""), i = this.getFullUrl(t), a = r ? await this.dpopService.createDpopProof(
      e.toUpperCase(),
      i,
      n
    ) : void 0;
    return (await d.request({
      url: i,
      method: e,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...r ? { Authorization: `Bearer ${n}` } : {},
        ...a ? { DPoP: a } : {}
      },
      ...s ? { data: s } : {},
      ...e === "GET" && s ? { params: s } : {}
    })).data;
  }
  getFullUrl(e) {
    return `${this.configService.getConfig().baseUrl.replace(/\/$/, "")}/${e}`;
  }
}
function C(c, e = {}) {
  const { publicRoutes: t = [], loginRedirect: s = !0, redirectUri: r } = e;
  return async (n, i, a) => {
    const h = n.name ? String(n.name) : null;
    if (t.includes(h || "") || c.isAuthenticated)
      return a();
    if (s) {
      const l = r || `${window.location.origin}/auth/callback`;
      return await c.loginWithRedirect({ redirectUri: l }), a("/");
    }
    return a("/");
  };
}
export {
  P as HttpClient,
  _ as SSOClient,
  C as createAuthGuard
};
