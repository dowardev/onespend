// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { getToken } from './tokenStorage';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import { resolveApiBaseUrl, readSyncConfig } from './sync/syncConfig';

// LBDS-289: the API URL is no longer a build-time constant. Every public
// function reads it through `resolveApiBaseUrl()` so the user's Settings
// choice (and the disabled flag) are honored at request time. The
// build-time env var is only used as a placeholder in the Settings UI —
// when the URL is empty or sync is off, the service throws
// SyncDisabledError and never touches the network.

// SyncDisabledError shape matches the one SyncApiService throws — callers
// (SyncQueueService.processPendingAttachments) catch it the same way.
export class SyncDisabledError extends Error {
  constructor() {
    super('Sync is disabled in Settings');
    this.name = 'SyncDisabledError';
  }
}

async function requireApiBaseUrl(): Promise<string> {
  const url = await resolveApiBaseUrl();
  if (!url) throw new SyncDisabledError();
  return url;
}

// Convenience guard for callers that want a "can I upload at all?" check
// without doing the network round-trip — used by the SyncSettingsPage to
// surface whether attachments are reachable from the saved URL.
export async function canSyncAttachments(): Promise<boolean> {
  const cfg = await readSyncConfig();
  return cfg.enabled && cfg.hasServerUrl;
}

export interface AttachmentData {
  id: number;
  sync_id: string;
  name: string;
  mime_type: string;
  size: number;
  download_url: string;
  created_at: string;
}

export interface AttachmentListResponse {
  data: AttachmentData[];
  total: number;
}

export interface AttachmentUploadResponse {
  uploaded: AttachmentData[];
  errors: Array<{ index: number; name: string; error: string }>;
  total_uploaded: number;
  total_errors: number;
}

async function getHeaders(): Promise<HeadersInit> {
  const token = await getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function listAttachments(entrySyncId: string): Promise<AttachmentListResponse> {
  const apiBaseUrl = await requireApiBaseUrl();
  const headers = await getHeaders();
  const response = await fetch(`${apiBaseUrl}/api/budget-entries/${entrySyncId}/attachments`, {
    method: 'GET',
    headers,
  });
  return handleResponse<AttachmentListResponse>(response);
}

export async function uploadAttachments(
  entrySyncId: string,
  files: File[],
  timeoutMs = 120000,
): Promise<AttachmentUploadResponse> {
  const apiBaseUrl = await requireApiBaseUrl();
  const headers = await getHeaders();
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetchWithTimeout({
    url: `${apiBaseUrl}/api/budget-entries/${entrySyncId}/attachments`,
    options: { method: 'POST', headers, body: formData },
    timeoutMs,
  });
  return handleResponse<AttachmentUploadResponse>(response);
}

export async function listProviderAttachments(providerSyncId: string): Promise<AttachmentListResponse> {
  const apiBaseUrl = await requireApiBaseUrl();
  const headers = await getHeaders();
  const response = await fetch(`${apiBaseUrl}/api/budget-providers/${providerSyncId}/attachments`, {
    method: 'GET',
    headers,
  });
  return handleResponse<AttachmentListResponse>(response);
}

export async function uploadProviderAttachments(
  providerSyncId: string,
  files: File[],
  timeoutMs = 120000,
): Promise<AttachmentUploadResponse> {
  const apiBaseUrl = await requireApiBaseUrl();
  const headers = await getHeaders();
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetchWithTimeout({
    url: `${apiBaseUrl}/api/budget-providers/${providerSyncId}/attachments`,
    options: { method: 'POST', headers, body: formData },
    timeoutMs,
  });
  return handleResponse<AttachmentUploadResponse>(response);
}

export async function downloadAttachment(attachmentId: number): Promise<Blob> {
  const apiBaseUrl = await requireApiBaseUrl();
  const headers = await getHeaders();
  const response = await fetch(`${apiBaseUrl}/api/attachments/${attachmentId}/download`, {
    method: 'GET',
    headers,
  });
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status}`);
  }
  return response.blob();
}

export async function deleteAttachment(attachmentId: number): Promise<void> {
  const apiBaseUrl = await requireApiBaseUrl();
  const headers = await getHeaders();
  const response = await fetch(`${apiBaseUrl}/api/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Delete failed' }));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }
}

export async function deleteAttachments(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const apiBaseUrl = await requireApiBaseUrl();
  const headers = await getHeaders();
  const response = await fetch(`${apiBaseUrl}/api/attachments/batch-delete`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Batch delete failed' }));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }
}

export default {
  listAttachments,
  uploadAttachments,
  listProviderAttachments,
  uploadProviderAttachments,
  downloadAttachment,
  deleteAttachment,
  deleteAttachments,
};
