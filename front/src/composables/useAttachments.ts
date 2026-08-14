// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ref, type Ref } from 'vue';
import attachmentService, { type AttachmentData } from '@/services/attachmentService';
import pendingAttachmentsService, {
  type AttachmentEntityType,
} from '@/services/pendingAttachmentsService';

export function useAttachments(params: {
  entityType: AttachmentEntityType;
  syncId: Ref<string | null>;
}) {
  const { entityType, syncId } = params;

  const showAttachmentsModal = ref(false);
  const pendingAttachments = ref<File[]>([]);
  const existingAttachments = ref<AttachmentData[]>([]);
  const deletedAttachments = ref<number[]>([]);

  async function openAttachments() {
    existingAttachments.value = [];
    if (!syncId.value) {
      showAttachmentsModal.value = true;
      return;
    }

    try {
      const response =
        entityType === 'providers'
          ? await attachmentService.listProviderAttachments(syncId.value)
          : await attachmentService.listAttachments(syncId.value);
      existingAttachments.value = response.data;
    } catch (error) {
      console.error('Failed to load existing attachments:', error);
    }

    try {
      const pending = await pendingAttachmentsService.getPendingAttachment(syncId.value, entityType);
      if (pending?.files.length) {
        pending.files.forEach((file, index) => {
          existingAttachments.value.push({
            id: -(index + 1),
            name: file.name,
            size: file.size,
            sync_id: '',
            mime_type: '',
            download_url: '',
            created_at: '',
          });
        });
      }
    } catch (error) {
      console.error('Failed to load pending attachments:', error);
    }

    showAttachmentsModal.value = true;
  }

  async function handleAttachmentsSave(params: { newFiles: File[]; deletedIds: number[] }) {
    const { newFiles, deletedIds } = params;
    pendingAttachments.value = newFiles;

    const serverIds = deletedIds.filter((id) => id > 0);
    deletedAttachments.value = serverIds;

    const pendingDeleteIndexes = deletedIds
      .filter((id) => id <= 0)
      .map((id) => Math.abs(id) - 1);

    if (pendingDeleteIndexes.length > 0 && syncId.value) {
      const sorted = [...pendingDeleteIndexes].sort((a, b) => b - a);
    for (const index of sorted) {
      await pendingAttachmentsService.removeFileFromPending(syncId.value, entityType, index);
    }
    }
  }

  async function saveAttachments(params: { isSynced: boolean }) {
    const { isSynced } = params;

    if (!syncId.value) return;

    if (deletedAttachments.value.length > 0) {
      try {
        await attachmentService.deleteAttachments(deletedAttachments.value);
      } catch (error) {
        console.error('Failed to delete some attachments:', error);
      }
    }

    if (pendingAttachments.value.length > 0) {
      if (isSynced && navigator.onLine) {
        try {
          if (entityType === 'providers') {
            await attachmentService.uploadProviderAttachments(syncId.value, pendingAttachments.value);
          } else {
            await attachmentService.uploadAttachments(syncId.value, pendingAttachments.value);
          }
        } catch (error) {
          console.error('Failed to upload, saving to pending:', error);
          await pendingAttachmentsService.addPendingAttachment(
            syncId.value,
            pendingAttachments.value,
            entityType,
          );
        }
      } else {
        await pendingAttachmentsService.addPendingAttachment(
          syncId.value,
          pendingAttachments.value,
          entityType,
        );
      }
    }

    pendingAttachments.value = [];
    deletedAttachments.value = [];
  }

  async function deleteAllAttachments() {
    if (!syncId.value) return;

    try {
      const response =
        entityType === 'providers'
          ? await attachmentService.listProviderAttachments(syncId.value)
          : await attachmentService.listAttachments(syncId.value);
      const ids = response.data.map((a) => a.id);
      if (ids.length > 0) {
        await attachmentService.deleteAttachments(ids);
      }
    } catch (error) {
      console.error(`Failed to delete ${entityType} attachments:`, error);
    }

    await pendingAttachmentsService.removePendingAttachment(syncId.value, entityType);
  }

  function dismissModal() {
    showAttachmentsModal.value = false;
  }

  return {
    showAttachmentsModal,
    pendingAttachments,
    existingAttachments,
    deletedAttachments,
    openAttachments,
    handleAttachmentsSave,
    saveAttachments,
    deleteAllAttachments,
    dismissModal,
  };
}
