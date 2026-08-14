// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { db } from '@/db/OneSpendDB'

const PENDING_ATTACHMENTS_KEY = 'pending_attachments'
const MIGRATION_DONE_KEY = 'pending_attachments_dexie_migrated'

export interface PendingAttachmentFile {
  name: string
  type: string
  size: number
  data: string
}

export type AttachmentEntityType = 'entries' | 'providers'

export interface PendingAttachment {
  entitySyncId: string
  entityType: AttachmentEntityType
  files: PendingAttachmentFile[]
  timestamp: number
}

function pendingKey(entitySyncId: string, entityType: AttachmentEntityType): string {
  return `${entityType}:${entitySyncId}`
}

async function migrateFromLocalStorage(): Promise<void> {
  if (typeof window === 'undefined') return
  const done = localStorage.getItem(MIGRATION_DONE_KEY)
  if (done) return

  try {
    const raw = localStorage.getItem(PENDING_ATTACHMENTS_KEY)
    if (!raw) {
      localStorage.setItem(MIGRATION_DONE_KEY, '1')
      return
    }

    const data: Record<string, PendingAttachment> = JSON.parse(raw)
    const entries = Object.values(data)

    for (const entry of entries) {
      await db.table('pendingAttachments').add({
        syncId: pendingKey(entry.entitySyncId, entry.entityType),
        entitySyncId: entry.entitySyncId,
        entityType: entry.entityType,
        files: entry.files,
        timestamp: entry.timestamp,
      })
    }

    localStorage.removeItem(PENDING_ATTACHMENTS_KEY)
    localStorage.setItem(MIGRATION_DONE_KEY, '1')
  } catch (e) {
    console.error('[pendingAttachmentsService] Failed to migrate from localStorage', e)
  }
}

let migrationPromise: Promise<void> | null = null

async function ensureMigrated(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = migrateFromLocalStorage()
  }
  await migrationPromise
}

export async function addPendingAttachment(
  entitySyncId: string,
  files: File[],
  entityType: AttachmentEntityType = 'entries',
): Promise<void> {
  await ensureMigrated()

  const fileData = await Promise.all(
    files.map(async (file) => {
      const data = await fileToBase64(file)
      return {
        name: file.name,
        type: file.type,
        size: file.size,
        data,
      }
    }),
  )

  const key = pendingKey(entitySyncId, entityType)

  const existing = await db.table('pendingAttachments').where('syncId').equals(key).first()
  const record = {
    syncId: key,
    entitySyncId,
    entityType,
    files: fileData,
    timestamp: Date.now(),
  }

  try {
    if (existing) {
      await db.table('pendingAttachments').update(existing.id!, record)
    } else {
      await db.table('pendingAttachments').add(record)
    }
  } catch (e) {
    console.error('[pendingAttachmentsService] Failed to save pending attachment', e)
  }
}

export async function getPendingAttachment(
  entitySyncId: string,
  entityType: AttachmentEntityType = 'entries',
): Promise<PendingAttachment | null> {
  await ensureMigrated()

  const key = pendingKey(entitySyncId, entityType)
  const row = await db.table('pendingAttachments').where('syncId').equals(key).first()
  if (!row) return null

  return {
    entitySyncId: row.entitySyncId,
    entityType: row.entityType,
    files: row.files,
    timestamp: row.timestamp,
  }
}

export async function getAllPendingAttachments(): Promise<PendingAttachment[]> {
  await ensureMigrated()

  const rows = await db.table('pendingAttachments').toArray()
  return rows.map((row) => ({
    entitySyncId: row.entitySyncId,
    entityType: row.entityType,
    files: row.files,
    timestamp: row.timestamp,
  }))
}

export async function removePendingAttachment(
  entitySyncId: string,
  entityType: AttachmentEntityType = 'entries',
): Promise<void> {
  await ensureMigrated()

  const key = pendingKey(entitySyncId, entityType)
  await db.table('pendingAttachments').where('syncId').equals(key).delete()
}

export async function hasPendingAttachments(): Promise<boolean> {
  await ensureMigrated()

  const count = await db.table('pendingAttachments').count()
  return count > 0
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = (error) => reject(error)
  })
}

export function base64ToFile(base64: string, name: string, type: string): File {
  const byteCharacters = atob(base64)
  const byteArray = new Uint8Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i)
  }
  return new File([byteArray], name, { type })
}

export async function uploadPendingAttachments(
  entitySyncId: string,
  entityType: AttachmentEntityType,
  uploadFn: (id: string, files: File[]) => Promise<unknown>,
): Promise<boolean> {
  const pending = await getPendingAttachment(entitySyncId, entityType)
  if (!pending) return true

  const files = pending.files.map((f) => base64ToFile(f.data, f.name, f.type))

  try {
    await uploadFn(entitySyncId, files)
    await removePendingAttachment(entitySyncId, entityType)
    return true
  } catch (error) {
    console.error('Failed to upload pending attachments:', error)
    return false
  }
}

export async function removeFileFromPending(
  entitySyncId: string,
  entityType: AttachmentEntityType,
  fileIndex: number,
): Promise<void> {
  await ensureMigrated()

  const key = pendingKey(entitySyncId, entityType)
  const row = await db.table('pendingAttachments').where('syncId').equals(key).first()
  if (!row) return

  const files = [...row.files]
  files.splice(fileIndex, 1)

  if (files.length === 0) {
    await db.table('pendingAttachments').where('syncId').equals(key).delete()
  } else {
    await db.table('pendingAttachments').update(row.id!, { files })
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
}
