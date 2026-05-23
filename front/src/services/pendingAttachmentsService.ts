const PENDING_ATTACHMENTS_KEY = 'pending_attachments';

export interface PendingAttachmentFile {
  name: string;
  type: string;
  size: number;
  data: string;
}

export type AttachmentEntityType = 'entries' | 'providers';

export interface PendingAttachment {
  entitySyncId: string;
  entityType: AttachmentEntityType;
  files: PendingAttachmentFile[];
  timestamp: number;
}

function pendingKey(entitySyncId: string, entityType: AttachmentEntityType): string {
  return `${entityType}:${entitySyncId}`;
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
  entitySyncId: string,
  files: File[],
  entityType: AttachmentEntityType = 'entries',
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
    }),
  );

  const key = pendingKey(entitySyncId, entityType);
  pending[key] = {
    entitySyncId,
    entityType,
    files: fileData,
    timestamp: Date.now(),
  };

  try {
    savePending(pending);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error(
        '[pendingAttachmentsService] localStorage quota exceeded, clearing pending attachments',
      );
      localStorage.removeItem(PENDING_ATTACHMENTS_KEY);
      const newPending: Record<string, PendingAttachment> = {};
      newPending[key] = {
        entitySyncId,
        entityType,
        files: fileData,
        timestamp: Date.now(),
      };
      savePending(newPending);
    } else {
      throw error;
    }
  }
}

export function getPendingAttachment(
  entitySyncId: string,
  entityType: AttachmentEntityType = 'entries',
): PendingAttachment | null {
  const pending = loadPending();
  return pending[pendingKey(entitySyncId, entityType)] || null;
}

export function getAllPendingAttachments(): PendingAttachment[] {
  const pending = loadPending();
  return Object.values(pending);
}

export function removePendingAttachment(
  entitySyncId: string,
  entityType: AttachmentEntityType = 'entries',
): void {
  const pending = loadPending();
  delete pending[pendingKey(entitySyncId, entityType)];
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
    reader.onerror = (error) => reject(error);
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
  entitySyncId: string,
  entityType: AttachmentEntityType,
  uploadFn: (id: string, files: File[]) => Promise<unknown>,
): Promise<boolean> {
  const pending = getPendingAttachment(entitySyncId, entityType);
  if (!pending) return true;

  const files = pending.files.map((f) => base64ToFile(f.data, f.name, f.type));

  try {
    await uploadFn(entitySyncId, files);
    removePendingAttachment(entitySyncId, entityType);
    return true;
  } catch (error) {
    console.error('Failed to upload pending attachments:', error);
    return false;
  }
}

export function removeFileFromPending(
  entitySyncId: string,
  entityType: AttachmentEntityType,
  fileIndex: number,
): void {
  const pending = loadPending();
  const key = pendingKey(entitySyncId, entityType);
  const entry = pending[key];
  if (entry && entry.files[fileIndex]) {
    entry.files.splice(fileIndex, 1);
    if (entry.files.length === 0) {
      delete pending[key];
    }
    savePending(pending);
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
  removeFileFromPending,
};
