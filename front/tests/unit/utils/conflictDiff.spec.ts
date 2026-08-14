// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest'
import { computeConflictDiff } from '@/utils/conflictDiff'

describe('computeConflictDiff', () => {
  it('returns empty array when data matches', () => {
    const diff = computeConflictDiff({
      server_data: { name: 'A', amount: 100 },
      client_data: { name: 'A', amount: 100 }
    })
    expect(diff).toEqual([])
  })

  it('detects differences in multiple fields', () => {
    const diff = computeConflictDiff({
      server_data: { name: 'Server', amount: 200 },
      client_data: { name: 'Client', amount: 100 }
    })
    expect(diff).toHaveLength(2)
    expect(diff).toContainEqual({
      field: 'name',
      server_value: 'Server',
      client_value: 'Client',
      changed_in: 'both'
    })
  })

  it('detects new client fields', () => {
    const diff = computeConflictDiff({
      server_data: {},
      client_data: { note: 'New' }
    })
    expect(diff).toHaveLength(1)
    expect(diff[0].field).toBe('note')
  })

  it('handles server-only fields', () => {
    const diff = computeConflictDiff({
      server_data: { amount: 100 },
      client_data: {}
    })
    expect(diff).toHaveLength(1)
    expect(diff[0].field).toBe('amount')
  })

  it('ignores technical fields', () => {
    const diff = computeConflictDiff({
      server_data: { sync_id: 'a', version: 2, 
        name: 'X', _origin: 'svc' },
      client_data: { sync_id: 'a', version: 1, 
        name: 'X', _origin: 'cli' }
    })
    expect(diff).toEqual([])
  })

  it('normalizes numbers', () => {
    const diff = computeConflictDiff({
      server_data: { amount: 100.005 },
      client_data: { amount: '100.01' }
    })
    expect(diff).toHaveLength(1)
  })

  it('handles client-only creation', () => {
    const diff = computeConflictDiff({
      server_data: undefined,
      client_data: { name: 'New', amount: 50 }
    })
    expect(diff).toHaveLength(2)
  })
})