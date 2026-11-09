// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// LBDS-273 (GitLab #13) / GitLab #17 (P4): coverage for the LIVE pull path.
//
// `SyncQueueService.mapServerItemToRow` is the ONE pull mapper the
// merge/upsert flow uses. There used to be a second, parallel pull mapper
// (`entityMappers.fromApiFormat`) that was covered by tests but never ran
// in production, which gave false confidence: the fields could be threaded
// correctly through the unused mapper and still be dropped by the live
// one. These tests pin the live mapper, and the coverage that used to sit
// on the dead mapper was migrated here.

import { describe, it, expect } from 'vitest'
import { mapServerItemToRow } from '../SyncQueueService'

const emptyMaps = () => ({
  accountIdMap: new Map<number, string>(),
  providerIdMap: new Map<number, string>(),
  supplierProductIdMap: new Map<number, string>(),
  recurringRecordIdMap: new Map<number, string>(),
})

describe('mapServerItemToRow — budget_entry time (LBDS-273)', () => {
  it('restores the time, normalizing the MySQL TIME shape to HH:MM', async () => {
    const row = await mapServerItemToRow({
      entityType: 'budget_entry',
      item: {
        id: 'sync-1',
        name: 'Café',
        amount: 5,
        date: '2026-10-18',
        entry_type: 'egreso',
        payment_type: 'cash',
        time: '14:30:00',
      } as any,
      base: { sync_id: 'sync-1' },
      ...emptyMaps(),
    })

    expect(row.time).toBe('14:30')
  })

  it('keeps a zero-padded hour as the server sent it', async () => {
    const row = await mapServerItemToRow({
      entityType: 'budget_entry',
      item: {
        id: 'sync-2',
        name: 'Desayuno',
        amount: 5,
        date: '2026-10-18',
        entry_type: 'egreso',
        payment_type: 'cash',
        time: '09:00:00',
      } as any,
      base: { sync_id: 'sync-2' },
      ...emptyMaps(),
    })

    expect(row.time).toBe('09:00')
  })

  it('falls back to the local base value when the server sends no time', async () => {
    const row = await mapServerItemToRow({
      entityType: 'budget_entry',
      item: {
        id: 'sync-3',
        name: 'Sin hora',
        amount: 5,
        date: '2026-10-18',
        entry_type: 'egreso',
        payment_type: 'cash',
      } as any,
      base: { sync_id: 'sync-3', time: '08:00' },
      ...emptyMaps(),
    })

    expect(row.time).toBe('08:00')
  })

  it('leaves the time undefined when neither the server nor the base has one', async () => {
    const row = await mapServerItemToRow({
      entityType: 'budget_entry',
      item: {
        id: 'sync-4',
        name: 'Nada',
        amount: 5,
        date: '2026-10-18',
        entry_type: 'egreso',
        payment_type: 'cash',
      } as any,
      base: { sync_id: 'sync-4' },
      ...emptyMaps(),
    })

    expect(row.time).toBeUndefined()
  })

  it('is idempotent when the server already sends the canonical HH:MM', async () => {
    const row = await mapServerItemToRow({
      entityType: 'budget_entry',
      item: {
        id: 'sync-5',
        name: 'Café',
        amount: 5,
        date: '2026-10-18',
        entry_type: 'egreso',
        payment_type: 'cash',
        time: '14:30',
      } as any,
      base: { sync_id: 'sync-5' },
      ...emptyMaps(),
    })

    expect(row.time).toBe('14:30')
  })
})

describe('mapServerItemToRow — recurring_record time (GitLab #17, P1)', () => {
  const recurringItem = (extra: Record<string, any>) => ({
    id: 'rec-time-1',
    name: 'Suscripción',
    type: 'cargo',
    entry_type: 'egreso',
    amount: 100,
    repeat_frequency: 'month',
    repeat_interval: 1,
    start_date: '2026-01-01',
    status: 'active',
    ...extra,
  })

  it('restores the time, normalizing the MySQL TIME shape to HH:MM', async () => {
    const row = await mapServerItemToRow({
      entityType: 'recurring_record',
      item: recurringItem({ time: '14:30:00' }) as any,
      base: { sync_id: 'rec-time-1' },
      ...emptyMaps(),
    })

    expect(row.time).toBe('14:30')
  })

  it('zero-pads a single-digit hour', async () => {
    const row = await mapServerItemToRow({
      entityType: 'recurring_record',
      item: recurringItem({ time: '9:00:00' }) as any,
      base: { sync_id: 'rec-time-1' },
      ...emptyMaps(),
    })

    expect(row.time).toBe('09:00')
  })

  it('falls back to the local base value when the server sends no time', async () => {
    const row = await mapServerItemToRow({
      entityType: 'recurring_record',
      item: recurringItem({}) as any,
      base: { sync_id: 'rec-time-1', time: '08:00' },
      ...emptyMaps(),
    })

    expect(row.time).toBe('08:00')
  })

  it('leaves the time undefined when neither the server nor the base has one', async () => {
    const row = await mapServerItemToRow({
      entityType: 'recurring_record',
      item: recurringItem({}) as any,
      base: { sync_id: 'rec-time-1' },
      ...emptyMaps(),
    })

    expect(row.time).toBeUndefined()
  })
})

describe('mapServerItemToRow — recurring_record category (LBDS-273)', () => {
  it('restores the category id from the server payload', async () => {
    const row = await mapServerItemToRow({
      entityType: 'recurring_record',
      item: {
        id: 'rec-1',
        name: 'Netflix',
        type: 'cargo',
        entry_type: 'egreso',
        repeat_frequency: 'month',
        repeat_interval: 1,
        start_date: '2026-01-01',
        status: 'active',
        category: 'streaming',
      } as any,
      base: { sync_id: 'rec-1' },
      ...emptyMaps(),
    })

    expect(row.category).toBe('streaming')
  })

  it('coerces a numeric category id to a string', async () => {
    const row = await mapServerItemToRow({
      entityType: 'recurring_record',
      item: {
        id: 'rec-2',
        name: 'Suscripción',
        type: 'cargo',
        entry_type: 'egreso',
        repeat_frequency: 'month',
        repeat_interval: 1,
        start_date: '2026-01-01',
        status: 'active',
        category: 123,
      } as any,
      base: { sync_id: 'rec-2' },
      ...emptyMaps(),
    })

    expect(row.category).toBe('123')
  })

  it('falls back to the local base value when the server sends no category', async () => {
    const row = await mapServerItemToRow({
      entityType: 'recurring_record',
      item: {
        id: 'rec-3',
        name: 'Sin categoría',
        type: 'cargo',
        entry_type: 'egreso',
        repeat_frequency: 'month',
        repeat_interval: 1,
        start_date: '2026-01-01',
        status: 'active',
      } as any,
      base: { sync_id: 'rec-3', category: 'hogar' },
      ...emptyMaps(),
    })

    expect(row.category).toBe('hogar')
  })

  it('leaves the category undefined when neither the server nor the base has one', async () => {
    const row = await mapServerItemToRow({
      entityType: 'recurring_record',
      item: {
        id: 'rec-4',
        name: 'Sin categoría',
        type: 'cargo',
        entry_type: 'egreso',
        repeat_frequency: 'month',
        repeat_interval: 1,
        start_date: '2026-01-01',
        status: 'active',
      } as any,
      base: { sync_id: 'rec-4' },
      ...emptyMaps(),
    })

    expect(row.category).toBeUndefined()
  })
})
