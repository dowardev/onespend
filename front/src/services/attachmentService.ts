import { getToken } from './tokenStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

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
  const headers = await getHeaders();
  const response = await fetch(`${API_URL}/api/budget-entries/${entrySyncId}/attachments`, {
    method: 'GET',
    headers,
  });
  return handleResponse<AttachmentListResponse>(response);
}

export async function uploadAttachments(
  entrySyncId: string,
  files: File[]
): Promise<AttachmentUploadResponse> {
  const headers = await getHeaders();
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const response = await fetch(`${API_URL}/api/budget-entries/${entrySyncId}/attachments`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return handleResponse<AttachmentUploadResponse>(response);
}

export async function downloadAttachment(attachmentId: number): Promise<Blob> {
  const headers = await getHeaders();
  const response = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, {
    method: 'GET',
    headers,
  });
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status}`);
  }
  return response.blob();
}

export async function deleteAttachment(attachmentId: number): Promise<void> {
  const headers = await getHeaders();
  const response = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Delete failed' }));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }
}

export default {
  listAttachments,
  uploadAttachments,
  downloadAttachment,
  deleteAttachment,
};
