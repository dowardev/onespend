// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { getToken } from '../tokenStorage';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

export class AuthExpiredError extends Error {
  constructor() {
    super('Authentication expired');
    this.name = 'AuthExpiredError';
  }
}

export class SyncApiService {
  private activeAbortController: AbortController | null = null;
  private authExpiredListeners: Set<() => void> = new Set();

  onAuthExpired(callback: () => void): () => void {
    this.authExpiredListeners.add(callback);
    return () => this.authExpiredListeners.delete(callback);
  }

  private notifyAuthExpired(): void {
    this.authExpiredListeners.forEach(listener => listener());
  }

  private async request(params: {
    url: string
    options: RequestInit
    timeoutMs: number
    signal?: AbortSignal
  }): Promise<Response> {
    const response = await fetchWithTimeout(params);
    if (response.status === 401) this.notifyAuthExpired();
    return response;
  }

  cancelActiveRequests() {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }

  async getAuthHeaders(contentType = 'application/json'): Promise<HeadersInit> {
    const token = await getToken();
    const headers: HeadersInit = { Authorization: `Bearer ${token}` };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    (headers as Record<string, string>)['X-Sync-Protocol-Version'] = '2';
    return headers;
  }

  async merge(params: { data: Record<string, unknown[]>; timeoutMs?: number; async?: boolean }): Promise<Response> {
    const { data, timeoutMs = 30000, async = false } = params;
    const headers = await this.getAuthHeaders();
    if (async) {
      (headers as Record<string, string>)['X-Async-Merge'] = 'true';
    }
    this.activeAbortController = new AbortController();
    try {
      return this.request({
        url: `${API_URL}/api/sync/merge`,
        options: {
          method: 'POST',
          headers,
          body: JSON.stringify({ data }),
        },
        timeoutMs,
        signal: this.activeAbortController.signal,
      });
    } finally {
      this.activeAbortController = null;
    }
  }

  async resolveConflict(params: { body: Record<string, unknown>; timeoutMs?: number }): Promise<Response> {
    const { body, timeoutMs = 15000 } = params;
    const headers = await this.getAuthHeaders();
    return this.request({
      url: `${API_URL}/api/sync/resolve-conflict`,
      options: {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      },
      timeoutMs,
    });
  }

  async getChanges(params: { lastSync: string; cursor?: string | null; limit?: number; types?: string[] }): Promise<Response> {
    const { lastSync, cursor, limit = 200, types } = params;
    const headers = await this.getAuthHeaders();
    const searchParams = new URLSearchParams({ last_sync: lastSync, limit: String(limit) });
    if (cursor) searchParams.set('cursor', cursor);
    if (types) types.forEach(t => searchParams.append('types[]', t));
    this.activeAbortController = new AbortController();
    try {
      return this.request({
        url: `${API_URL}/api/sync/changes?${searchParams}`,
        options: { method: 'GET', headers },
        timeoutMs: 30000,
        signal: this.activeAbortController.signal,
      });
    } finally {
      this.activeAbortController = null;
    }
  }

  async fullSync(params: { types?: string[]; since?: number; etag?: string | null } = {}): Promise<Response> {
    const { types, since, etag } = params;
    const headers = await this.getAuthHeaders();
    if (etag) {
      (headers as Record<string, string>)['If-None-Match'] = etag;
    }
    const searchParams = new URLSearchParams();
    if (types && types.length > 0) {
      types.forEach(t => searchParams.append('types[]', t));
    }
    if (since) {
      searchParams.set('since', String(since));
    }
    const queryString = searchParams.toString();
    const url = queryString ? `${API_URL}/api/sync/full?${queryString}` : `${API_URL}/api/sync/full`;
    this.activeAbortController = new AbortController();
    try {
      return this.request({
        url,
        options: { method: 'GET', headers },
        timeoutMs: 60000,
        signal: this.activeAbortController.signal,
      });
    } finally {
      this.activeAbortController = null;
    }
  }

  async resolveConflictsBatch(params: { resolutions: Array<{ entity_type: string; entity_id: string; resolution: string; client_data?: Record<string, unknown> }>; timeoutMs?: number }): Promise<Response> {
    const { resolutions, timeoutMs = 30000 } = params;
    const headers = await this.getAuthHeaders();
    return this.request({
      url: `${API_URL}/api/sync/resolve-conflicts-batch`,
      options: {
        method: 'POST',
        headers,
        body: JSON.stringify({ resolutions }),
      },
      timeoutMs,
    });
  }

  async getActiveConflicts(params: { entityType?: string; timeoutMs?: number } = {}): Promise<Response> {
    const { entityType, timeoutMs = 15000 } = params;
    const headers = await this.getAuthHeaders();
    const searchParams = new URLSearchParams();
    if (entityType) searchParams.set('entity_type', entityType);
    const queryString = searchParams.toString();
    const url = queryString
      ? `${API_URL}/api/sync/active-conflicts?${queryString}`
      : `${API_URL}/api/sync/active-conflicts`;
    return this.request({
      url,
      options: { method: 'GET', headers },
      timeoutMs,
    });
  }

  async getResolvedConflicts(params: { timeoutMs?: number } = {}): Promise<Response> {
    const { timeoutMs = 15000 } = params;
    const headers = await this.getAuthHeaders();
    return this.request({
      url: `${API_URL}/api/sync/conflicts`,
      options: { method: 'GET', headers },
      timeoutMs,
    });
  }

  async mergeStatus(params: { jobId: number; timeoutMs?: number }): Promise<Response> {
    const { jobId, timeoutMs = 15000 } = params;
    const headers = await this.getAuthHeaders();
    return this.request({
      url: `${API_URL}/api/sync/merge-status/${jobId}`,
      options: { method: 'GET', headers },
      timeoutMs,
    });
  }

  async pollMergeUntilComplete(params: { jobId: number; intervalMs?: number; maxAttempts?: number }): Promise<Response> {
    const { jobId, intervalMs = 1000, maxAttempts = 60 } = params;
    for (let i = 0; i < maxAttempts; i++) {
      const response = await this.mergeStatus({ jobId });
      if (!response.ok) {
        return response;
      }
      const body = await response.clone().json();
      if (body.status === 'completed' || body.status === 'error') {
        return response;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    return new Response(JSON.stringify({ error: 'Polling timeout' }), { status: 408 });
  }
}

export const syncApiService = new SyncApiService();
