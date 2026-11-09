// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// Round-trip test for the `notes` field on budget entries (LBDS-275). The
// field must survive the full chain the front uses to persist and synchronise
// an entry: row → toApiFormat → mapServerItemToRow → toBudgetEntryRow, plus
// the store-layer mapEntryRow. None of those steps may drop the note, and a
// row without notes must stay clean (undefined) instead of becoming ''.
//
// GitLab #17 (P4): the pull step is the LIVE mapper
// (`SyncQueueService.mapServerItemToRow`), the one the merge/upsert flow
// actually runs — not a parallel pull mapper that only the tests used.

import { describe, it, expect } from 'vitest'
import { toApiFormat } from '@/services/sync/entityMappers'
import { mapServerItemToRow } from '@/services/sync/SyncQueueService'
import { toBudgetEntryRow } from '@/db/mappers'
import { mapEntryRow } from '@/stores/budgetEntriesStore'
import type { BudgetEntryRow } from '@/db/types'

function makeRow(overrides: Partial<BudgetEntryRow> = {}): BudgetEntryRow {
  return {
    sync_id: 'entry-notes-1',
    name: 'Almuerzo',
    amount: 850,
    date: '2026-10-12',
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

describe('budget_entry notes round-trip (LBDS-275)', () => {
  it('preserves notes through toApiFormat → mapServerItemToRow → toBudgetEntryRow', async () => {
    const row = makeRow({ notes: 'Pagué en efectivo, dejar recibo' })
    const api = toApiFormat('budget_entry', row) as Record<string, unknown>

    expect(api.notes).toBe('Pagué en efectivo, dejar recibo')

    const parsed = await mapServerItemToRow({
      entityType: 'budget_entry',
      item: { id: 'entry-notes-1', ...api } as any,
      base: { sync_id: 'entry-notes-1' },
      ...emptyMaps(),
    })

    expect(parsed.notes).toBe('Pagué en efectivo, dejar recibo')

    const back = toBudgetEntryRow(parsed)
    expect(back.notes).toBe('Pagué en efectivo, dejar recibo')
  })

  it('leaves notes undefined when the row has none', async () => {
    const row = makeRow()
    const api = toApiFormat('budget_entry', row) as Record<string, unknown>
    expect(api.notes).toBeUndefined()

    const parsed = await mapServerItemToRow({
      entityType: 'budget_entry',
      item: { id: 'entry-notes-1', ...api } as any,
      base: { sync_id: 'entry-notes-1' },
      ...emptyMaps(),
    })

    const back = toBudgetEntryRow(parsed)
    expect(back.notes).toBeUndefined()
  })

  it('maps notes from an incoming API item (live pull mapper)', async () => {
    const parsed = await mapServerItemToRow({
      entityType: 'budget_entry',
      item: {
        id: 'entry-notes-2',
        name: 'Sueldo',
        amount: 1500,
        date: '2026-10-01',
        entry_type: 'ingreso',
        notes: 'Liquidación septiembre',
      } as any,
      base: { sync_id: 'entry-notes-2' },
      ...emptyMaps(),
    })

    expect(parsed.notes).toBe('Liquidación septiembre')
    const back = toBudgetEntryRow(parsed)
    expect(back.notes).toBe('Liquidación septiembre')
  })

  it('copies notes through the store-layer mapEntryRow', () => {
    const row = makeRow({ notes: 'nota del store' })
    const income = mapEntryRow(row)
    expect(income.notes).toBe('nota del store')

    const empty = mapEntryRow(makeRow())
    expect(empty.notes).toBeUndefined()
  })
})
