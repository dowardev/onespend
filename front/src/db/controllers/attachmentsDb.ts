// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import db from '../OneSpendDB'
import type { AttachmentRow } from '../types'
import type { AttachmentEntityType } from '@/services/pendingAttachmentsService'

export interface AttachmentListEntry {
  id: number
  sync_id: string
  name: string
  mime_type: string
  size: number
  download_url: string
  created_at: string
}

/**
 * LBDS-280: typed wrapper around the local Dexie `attachments` table.
 *
 * The mirror is what lets `useAttachments.deleteAllAttachments` run with no
 * HTTP call: the composable reads the rows for the current entity, marks the
 * non-pending ones `pendingDelete: true`, and enqueues one
 * `syncQueue.syncAttachment({ operation: 'delete' })` per row. The data flow
 * is local-only from here; the queue drains in the background.
 */
export const attachmentsDb = {
  async put(params: { entry: AttachmentRow }): Promise<void> {
    await db.attachments.put(params.entry)
  },

  async bulkPut(params: { entries: AttachmentRow[] }): Promise<void> {
    if (params.entries.length === 0) return
    await db.attachments.bulkPut(params.entries)
  },

  async getById(params: { syncId: string }): Promise<AttachmentRow | null> {
    const row = await db.attachments.get(params.syncId)
    return row ?? null
  },

  async getByIds(params: { syncIds: string[] }): Promise<AttachmentRow[]> {
    if (params.syncIds.length === 0) return []
    const rows = await db.attachments.bulkGet(params.syncIds)
    return rows.filter((row): row is AttachmentRow => row !== undefined)
  },

  async listForEntity(params: {
    entitySyncId: string
    entityType: AttachmentEntityType
  }): Promise<AttachmentRow[]> {
    return db.attachments
      .where('entitySyncId').equals(params.entitySyncId)
      .filter((row) => row.entityType === params.entityType)
      .toArray()
  },

  async markPendingDelete(params: { syncIds: string[] }): Promise<void> {
    if (params.syncIds.length === 0) return
    await db.attachments
      .where('sync_id').anyOf(params.syncIds)
      .modify({ pendingDelete: true })
  },

  async clearPendingDelete(params: { syncIds: string[] }): Promise<void> {
    if (params.syncIds.length === 0) return
    await db.attachments
      .where('sync_id').anyOf(params.syncIds)
      .modify({ pendingDelete: false })
  },

  async delete(params: { syncIds: string[] }): Promise<void> {
    if (params.syncIds.length === 0) return
    await db.attachments.bulkDelete(params.syncIds)
  },

  async clearForEntity(params: {
    entitySyncId: string
    entityType: AttachmentEntityType
  }): Promise<void> {
    await db.attachments
      .where('entitySyncId').equals(params.entitySyncId)
      .filter((row) => row.entityType === params.entityType)
      .delete()
  },

  /**
   * Replace the visible attachments for a given entity with the server
   * response. Concretely: drop rows that are NOT marked `pendingDelete` and
   * upsert the new list. Pending deletes survive so the user does not see an
   * attachment reappear in the modal just because the sync queue has not
   * drained yet.
   */
  async syncFromServerList(params: {
    entitySyncId: string
    entityType: AttachmentEntityType
    serverList: AttachmentListEntry[]
  }): Promise<void> {
    const { entitySyncId, entityType, serverList } = params
    await db.transaction('rw', db.attachments, async () => {
      const existing = await db.attachments
        .where('entitySyncId').equals(entitySyncId)
        .filter((row) => row.entityType === entityType)
        .toArray()

      const serverSyncIds = new Set(serverList.map((a) => a.sync_id))
      const staleSyncIds = existing
        .filter((row) => !row.pendingDelete && !serverSyncIds.has(row.sync_id))
        .map((row) => row.sync_id)
      if (staleSyncIds.length > 0) {
        await db.attachments.bulkDelete(staleSyncIds)
      }

      const now = Date.now()
      const freshRows: AttachmentRow[] = serverList.map((a) => ({
        sync_id: a.sync_id,
        serverId: a.id,
        entitySyncId,
        entityType,
        name: a.name,
        mimeType: a.mime_type,
        size: a.size,
        downloadUrl: a.download_url,
        pendingDelete: false,
        syncedAt: now,
      }))

      if (freshRows.length > 0) {
        await db.attachments.bulkPut(freshRows)
      }
    })
  },
}

export default attachmentsDb
