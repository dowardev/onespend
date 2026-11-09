// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// Round-trip test for the `category` field on budget entries (LBDS-210 RC4 §1,
// REQ-2 AC-2.1 / AC-2.2 / AC-2.5): the field must survive
// row → toApiFormat → mapServerItemToRow → toBudgetEntryRow without being
// dropped by any whitelist mapper, and stay undefined when absent.
//
// GitLab #17 (P4): the pull step is the LIVE mapper
// (`SyncQueueService.mapServerItemToRow`), the one the merge/upsert flow
// actually runs. The parallel pull mapper that used to sit in
// `entityMappers` was never wired into production, so a round-trip test
// that only covered it proved nothing about the real flow.

import { describe, it, expect } from 'vitest'
import { toApiFormat } from '@/services/sync/entityMappers'
import { mapServerItemToRow } from '@/services/sync/SyncQueueService'
import { toBudgetEntryRow } from '@/db/mappers'
import type { BudgetEntryRow } from '@/db/types'

function makeRow(overrides: Partial<BudgetEntryRow> = {}): BudgetEntryRow {
  return {
    sync_id: 'entry-1',
    name: 'Supermercado',
    amount: 1200,
    date: '2026-09-01',
    entryType: 'egreso',
    ...overrides,
  }
}

const emptyMaps = () => ({
  accountIdMap: new Map<number, string>(),
  providerIdMap: new Map<number, string>(),
  supplierProductIdMap: new Map<number, string>(),
  recurringRecordIdMap: new Map<number, string>(),
})

describe('budget_entry category round-trip', () => {
  it('preserves category through toApiFormat → mapServerItemToRow → toBudgetEntryRow', async () => {
    const row = makeRow({ category: 'food' })
    const api = toApiFormat('budget_entry', row) as Record<string, unknown>

    expect(api.category).toBe('food')

    const parsed = await mapServerItemToRow({
      entityType: 'budget_entry',
      item: { id: 'entry-1', ...api } as any,
      base: { sync_id: 'entry-1' },
      ...emptyMaps(),
    })

    expect(parsed.category).toBe('food')

    const back = toBudgetEntryRow(parsed)
    expect(back.category).toBe('food')
  })

  it('leaves category undefined when the row has none', async () => {
    const row = makeRow()
    const api = toApiFormat('budget_entry', row) as Record<string, unknown>
    expect(api.category).toBeUndefined()

    const parsed = await mapServerItemToRow({
      entityType: 'budget_entry',
      item: { id: 'entry-1', ...api } as any,
      base: { sync_id: 'entry-1' },
      ...emptyMaps(),
    })

    const back = toBudgetEntryRow(parsed)
    expect(back.category).toBeUndefined()
  })

  it('maps category from an incoming API item (live pull mapper)', async () => {
    const parsed = await mapServerItemToRow({
      entityType: 'budget_entry',
      item: {
        id: 'entry-2',
        name: 'Netflix',
        amount: 300,
        date: '2026-09-01',
        entry_type: 'egreso',
        category: 'entertainment',
      } as any,
      base: { sync_id: 'entry-2' },
      ...emptyMaps(),
    })

    expect(parsed.category).toBe('entertainment')
    const back = toBudgetEntryRow(parsed)
    expect(back.category).toBe('entertainment')
  })
})
