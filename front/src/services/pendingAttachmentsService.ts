const PENDING_ATTACHMENTS_KEY = 'pending_attachments';

export interface PendingAttachmentFile {
  name: string;
  type: string;
  size: number;
  data: string; // Base64 encoded
}

export interface PendingAttachment {
  entrySyncId: string;
  files: PendingAttachmentFile[];
  timestamp: number;
}

function loadPending(): Record<string, PendingAttachment> {
  try {
    const raw = localStorage.getItem(PENDING_ATTACHMENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePending(data: Record<string, PendingAttachment>): void {
  localStorage.setItem(PENDING_ATTACHMENTS_KEY, JSON.stringify(data));
}

export async function addPendingAttachment(
  entrySyncId: string,
  files: File[]
): Promise<void> {
  const pending = loadPending();

  const fileData = await Promise.all(
    files.map(async (file) => {
      const data = await fileToBase64(file);
      return {
        name: file.name,
        type: file.type,
        size: file.size,
        data,
      };
    })
  );

  pending[entrySyncId] = {
    entrySyncId,
    files: fileData,
    timestamp: Date.now(),
  };

  savePending(pending);
}

export function getPendingAttachment(entrySyncId: string): PendingAttachment | null {
  const pending = loadPending();
  return pending[entrySyncId] || null;
}

export function getAllPendingAttachments(): PendingAttachment[] {
  const pending = loadPending();
  return Object.values(pending);
}

export function removePendingAttachment(entrySyncId: string): void {
  const pending = loadPending();
  delete pending[entrySyncId];
  savePending(pending);
}

export function hasPendingAttachments(): boolean {
  const pending = loadPending();
  return Object.keys(pending).length > 0;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
}

export function base64ToFile(base64: string, name: string, type: string): File {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new File([byteArray], name, { type });
}

export async function uploadPendingAttachments(
  entrySyncId: string,
  uploadFn: (entryId: string, files: File[]) => Promise<unknown>
): Promise<boolean> {
  const pending = getPendingAttachment(entrySyncId);
  if (!pending) return true;

  const files = pending.files.map(f => base64ToFile(f.data, f.name, f.type));

  try {
    await uploadFn(entrySyncId, files);
    removePendingAttachment(entrySyncId);
    return true;
  } catch (error) {
    console.error('Failed to upload pending attachments:', error);
    return false;
  }
}

export default {
  addPendingAttachment,
  getPendingAttachment,
  getAllPendingAttachments,
  removePendingAttachment,
  hasPendingAttachments,
  base64ToFile,
  uploadPendingAttachments,
};
