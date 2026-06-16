const SYNC_LOCK_KEY = 'onespend-sync-lock';
const HEARTBEAT_INTERVAL = 10000;
const LOCK_TIMEOUT = 30000;
const WEB_LOCK_NAME = 'onespend-sync';

export class SyncLockService {
  private tabId: string;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private _isLocked = false;
  private webLockHeld = false;
  private lockResolve: (() => void) | null = null;

  constructor() {
    this.tabId = crypto.randomUUID();
  }

  async acquire(params: { timeoutMs?: number }): Promise<boolean> {
    const { timeoutMs = 0 } = params;
    const startTime = Date.now();
    while (true) {
      if (await this.tryAcquire()) return true;
      if (Date.now() - startTime >= timeoutMs) return false;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  private async tryAcquire(): Promise<boolean> {
    if (this._isLocked) return false;

    if (navigator.locks) {
      try {
        let granted = false;
        await navigator.locks.request(WEB_LOCK_NAME, { ifAvailable: true }, async () => {
          this._isLocked = true;
          this.webLockHeld = true;
          granted = true;
          this.startHeartbeat();
          return new Promise<void>((resolve) => {
            this.lockResolve = resolve;
          });
        });
        return granted;
      } catch {
        return false;
      }
    }

    const existing = localStorage.getItem(SYNC_LOCK_KEY);
    if (existing) {
      try {
        const parsed = JSON.parse(existing) as { tabId: string; timestamp: number };
        if (Date.now() - parsed.timestamp < LOCK_TIMEOUT) {
          return false;
        }
      } catch {

      }
    }
    localStorage.setItem(SYNC_LOCK_KEY, JSON.stringify({ tabId: this.tabId, timestamp: Date.now() }));
    this._isLocked = true;
    this.startHeartbeat();
    return true;
  }

  isLocked(): boolean {
    return this._isLocked;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.webLockHeld) return;
      const current = localStorage.getItem(SYNC_LOCK_KEY);
      if (current) {
        try {
          const parsed = JSON.parse(current) as { tabId: string; timestamp: number };
          if (parsed.tabId === this.tabId) {
            localStorage.setItem(SYNC_LOCK_KEY, JSON.stringify({ tabId: this.tabId, timestamp: Date.now() }));
          }
        } catch {

        }
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  release() {
    this.stopHeartbeat();
    this._isLocked = false;
    this.webLockHeld = false;
    if (this.lockResolve) {
      this.lockResolve();
      this.lockResolve = null;
    }
    const current = localStorage.getItem(SYNC_LOCK_KEY);
    if (current) {
      try {
        const parsed = JSON.parse(current) as { tabId: string; timestamp: number };
        if (parsed.tabId === this.tabId) {
          localStorage.removeItem(SYNC_LOCK_KEY);
        }
      } catch {
        localStorage.removeItem(SYNC_LOCK_KEY);
      }
    }
  }
}

export const syncLockService = new SyncLockService();
