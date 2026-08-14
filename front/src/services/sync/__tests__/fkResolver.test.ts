// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest'
import { resolveFk, resolveAccountId } from '../SyncQueueService'

describe('resolveFk', () => {
  const map = new Map<number, string>([
    [1, 'sync-account-1'],
    [42, 'sync-account-42'],
    [100, 'sync-account-100'],
  ])

  it('returns sync_id when map has the key', async () => {
    const result = await resolveFk(map, 42)
    expect(result).toBe('sync-account-42')
  })

  it('returns sync_id when value is numeric string', async () => {
    const result = await resolveFk(map, '42')
    expect(result).toBe('sync-account-42')
  })

  it('returns null when map does NOT have the key (no raw int fallback)', async () => {
    const result = await resolveFk(map, 999)
    expect(result).toBeNull()
  })

  it('returns null when value is null', async () => {
    const result = await resolveFk(map, null)
    expect(result).toBeNull()
  })

  it('returns null when value is undefined', async () => {
    const result = await resolveFk(map, undefined)
    expect(result).toBeNull()
  })

  it('returns null when value is non-numeric string', async () => {
    const result = await resolveFk(map, 'not-a-number')
    expect(result).toBeNull()
  })

  it('returns null with empty map', async () => {
    const emptyMap = new Map<number, string>()
    const result = await resolveFk(emptyMap, 42)
    expect(result).toBeNull()
  })
})

describe('resolveAccountId', () => {
  const map = new Map<number, string>([
    [1, 'uuid-1'],
    [42, 'uuid-42'],
  ])

  it('returns sync_id when map has the int key (server PK format)', async () => {
    const result = await resolveAccountId(map, 42)
    expect(result).toBe('uuid-42')
  })

  it('returns null when int key NOT in map (no raw int fallback)', async () => {
    const result = await resolveAccountId(map, 999)
    expect(result).toBeNull()
  })

  it('returns UUID string directly when value is UUID (legacy group format)', async () => {
    const result = await resolveAccountId(map, 'abc-def-123')
    expect(result).toBe('abc-def-123')
  })

  it('returns null when value is null', async () => {
    const result = await resolveAccountId(map, null)
    expect(result).toBeNull()
  })

  it('returns null when value is undefined', async () => {
    const result = await resolveAccountId(map, undefined)
    expect(result).toBeNull()
  })

  it('returns null when value is non-numeric non-UUID string', async () => {
    const result = await resolveAccountId(map, 'garbage')
    expect(result).toBeNull()
  })

  it('returns null with empty map', async () => {
    const emptyMap = new Map<number, string>()
    const result = await resolveAccountId(emptyMap, 42)
    expect(result).toBeNull()
  })

  it('returns sync_id when string is numeric (stringified int)', async () => {
    const result = await resolveAccountId(map, '42')
    expect(result).toBe('uuid-42')
  })
})
