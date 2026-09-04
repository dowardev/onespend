// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// Round-trip test for the `category` field on budget entries (LBDS-210 RC4 §1,
// REQ-2 AC-2.1 / AC-2.2 / AC-2.5): the field must survive
// row → toApiFormat → fromApiFormat → toBudgetEntryRow without being dropped
// by any whitelist mapper, and stay undefined when absent.

import { describe, it, expect } from 'vitest'
import { toApiFormat, fromApiFormat } from '@/services/sync/entityMappers'
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

describe('budget_entry category round-trip', () => {
  it('preserves category through toApiFormat → fromApiFormat → toBudgetEntryRow', () => {
    const row = makeRow({ category: 'food' })
    const api = toApiFormat('budget_entry', row) as Record<string, unknown>

    expect(api.category).toBe('food')

    const parsed = fromApiFormat('budget_entry', api) as Record<string, unknown>
    expect(parsed.category).toBe('food')

    const back = toBudgetEntryRow(parsed)
    expect(back.category).toBe('food')
  })

  it('leaves category undefined when the row has none', () => {
    const row = makeRow()
    const api = toApiFormat('budget_entry', row) as Record<string, unknown>
    expect(api.category).toBeUndefined()

    const parsed = fromApiFormat('budget_entry', api) as Record<string, unknown>
    const back = toBudgetEntryRow(parsed)
    expect(back.category).toBeUndefined()
  })

  it('maps category from an incoming API item (fromApiFormat)', () => {
    const parsed = fromApiFormat('budget_entry', {
      sync_id: 'entry-2',
      name: 'Netflix',
      amount: 300,
      date: '2026-09-01',
      entry_type: 'egreso',
      category: 'entertainment',
    }) as Record<string, unknown>

    expect(parsed.category).toBe('entertainment')
    const back = toBudgetEntryRow(parsed)
    expect(back.category).toBe('entertainment')
  })
})