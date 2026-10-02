// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ref, type Ref } from 'vue';
import attachmentService, { type AttachmentData } from '@/services/attachmentService';
import pendingAttachmentsService, {
  type AttachmentEntityType,
} from '@/services/pendingAttachmentsService';
import attachmentsDb from '@/db/controllers/attachmentsDb';
import { syncQueue } from '@/services/syncQueue';

/**
 * LBDS-280: the two server reads that used to live in `deleteAllAttachments`
 * (`listAttachments` + `deleteAttachments`) made the entry-delete path
 * dependent on the network, froze the UI for ~6 s on slow backends, and
 * skipped the retry/DLQ safety net. The route through `syncQueue` keeps
 * the same UX shape every other delete in the app has: instant local
 * delete, server delete in background, with the same retry/backoff/DLQ
 * machinery that drains the rest of the offline-first queue.
 */
export function useAttachments(params: {
  entityType: AttachmentEntityType;
  syncId: Ref<string | null>;
}) {
  const { entityType, syncId } = params;

  const showAttachmentsModal = ref(false);
  const pendingAttachments = ref<File[]>([]);
  const existingAttachments = ref<AttachmentData[]>([]);
  const deletedAttachments = ref<number[]>([]);

  function attachmentRowToData(params: {
    row: {
      sync_id: string;
      serverId?: number | null;
      name: string;
      size?: number;
      mimeType?: string;
      downloadUrl?: string;
    };
    fallbackId: number;
  }): AttachmentData {
    return {
      id: params.row.serverId ?? params.fallbackId,
      sync_id: params.row.sync_id,
      name: params.row.name,
      mime_type: params.row.mimeType ?? '',
      size: params.row.size ?? 0,
      download_url: params.row.downloadUrl ?? '',
      created_at: '',
    }
  }

  async function refreshMirrorFromServer(params: { entitySyncId: string }): Promise<void> {
    try {
      const response = entityType === 'providers'
        ? await attachmentService.listProviderAttachments(params.entitySyncId)
        : await attachmentService.listAttachments(params.entitySyncId);

      // syncFromServerList keeps rows flagged `pendingDelete` so the modal
      // does not flash deleted attachments back into view while the queue
      // has not yet drained them.
      await attachmentsDb.syncFromServerList({
        entitySyncId: params.entitySyncId,
        entityType,
        serverList: response.data,
      });
    } catch (error) {
      console.error('Failed to refresh attachments from server:', error);
    }
  }

  async function openAttachments() {
    existingAttachments.value = [];
    if (!syncId.value) {
      showAttachmentsModal.value = true;
      return;
    }

    await refreshMirrorFromServer({ entitySyncId: syncId.value });

    const rows = await attachmentsDb.listForEntity({
      entitySyncId: syncId.value,
      entityType,
    });

    // Mirror is the source of truth for visible attachments. Rows flagged
    // pendingDelete (e.g. the user just tapped Delete on the parent entity)
    // are hidden until the queue acks the delete and syncFromServerList
    // drops them on the next open.
    const visibleRows = rows.filter((row) => !row.pendingDelete)
    existingAttachments.value = visibleRows.map((row, index) =>
      attachmentRowToData({
        row,
        // Defensive fallback: any row missing serverId gets a synthetic
        // negative id (the modal already uses negative ids for pending
        // uploads, so existing logic handles them gracefully).
        fallbackId: -(index + 1),
      }),
    )

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

  /**
   * LBDS-280: deletes every server-known attachment for the parent entity
   * without making a single HTTP call.
   *
   * Steps:
   *  1. Walk the local Dexie mirror (no HTTP).
   *  2. Mark each server-known row `pendingDelete` so the modal hides it
   *     before the queue has drained.
   *  3. Enqueue one `syncQueue.syncAttachment({ operation: 'delete' })` per
   *     attachment — same shape every other write in the app uses, so
   *     retry/backoff/DLQ apply uniformly.
   *  4. Drop the `pendingAttachmentsService` row (any queued uploads that
   *     never reached the server are orphaned now that the entity is gone).
   *
   * Returns the count of queue ops enqueued. Callers can await it to
   * serialize against the entry delete; the function itself is now
   * non-blocking because there is no HTTP.
   */
  async function deleteAllAttachments(): Promise<{ deletedCount: number }> {
    if (!syncId.value) {
      return { deletedCount: 0 }
    }

    const rows = await attachmentsDb.listForEntity({
      entitySyncId: syncId.value,
      entityType,
    })

    const toDelete = rows.filter((row) => !row.pendingDelete && row.sync_id)

    if (toDelete.length > 0) {
      await attachmentsDb.markPendingDelete({ syncIds: toDelete.map((row) => row.sync_id) })

      for (const row of toDelete) {
        // LBDS-280: enqueue the delete so the queue's existing
        // retry/backoff/DLQ machinery handles it. No special-cased
        // offline path, no synchronous HTTP.
        await syncQueue.syncAttachment({ attachment: row, operation: 'delete' })
      }
    }

    await pendingAttachmentsService.removePendingAttachment(syncId.value, entityType)

    return { deletedCount: toDelete.length }
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
