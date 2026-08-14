// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { SyncItemData } from '@/services/syncService'

export interface FieldDiff {
  field: string
  server_value: unknown
  client_value: unknown
  changed_in: 'server' | 'client' | 'both'
}

const SKIP_FIELDS = new Set([
  'sync_id', 'id', 'created_at', 'updated_at', 'user_id', 'version',
  '_conflict', '_deleted', '_original', 'server_id',
])

function normalizeValue(val: unknown): unknown {
  if (typeof val === 'number' && !Number.isInteger(val)) {
    return parseFloat(val.toFixed(2))
  }
  if (typeof val === 'string' && val !== '' && !isNaN(Number(val))) {
    return normalizeValue(Number(val))
  }
  return val
}

export function computeConflictDiff(params: {
  server_data?: SyncItemData
  client_data: SyncItemData
}): FieldDiff[] {
  const { server_data, client_data } = params

  if (!server_data) {
    return Object.entries(client_data)
      .filter(([key]) => !SKIP_FIELDS.has(key))
      .map(([field, client_value]) => ({
        field,
        server_value: undefined,
        client_value,
        changed_in: 'client' as const,
      }))
  }

  const allKeys = new Set([
    ...Object.keys(server_data),
    ...Object.keys(client_data),
  ])

  const diffs: FieldDiff[] = []

  for (const field of allKeys) {
    if (SKIP_FIELDS.has(field)) continue
    if (field.startsWith('_')) continue

    const sv = normalizeValue(server_data[field])
    const cv = normalizeValue(client_data[field])

    if (sv === cv) continue

    const serverHas = field in server_data
    const clientHas = field in client_data

    if (!serverHas) {
      diffs.push({ field, server_value: undefined, client_value: cv, changed_in: 'client' })
    } else if (!clientHas) {
      diffs.push({ field, server_value: sv, client_value: undefined, changed_in: 'server' })
    } else {
      diffs.push({ field, server_value: sv, client_value: cv, changed_in: 'both' })
    }
  }

  return diffs
}
