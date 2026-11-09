// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// LBDS-273 (GitLab #13): sync push coverage for the two new fields.
// `toApiFormat` pushes row → API payload. The back stores `time` as MySQL
// TIME (returns "HH:MM:SS") but its `date_format:H:i` rule only accepts
// "HH:MM", so the push normalizes to "HH:MM" to keep the roundtrip safe.
// The `category` contract is device-local: both sides carry the id as a
// string.
//
// GitLab #17 (P4): the pull side is covered where it actually runs —
// `SyncQueueService.mapServerItemToRow` (see
// `src/services/sync/__tests__/mapServerItemToRow.test.ts`). The parallel
// pull mapper that used to live in this file was removed: it was never
// wired into the merge/upsert flow, so its coverage proved nothing about
// production behaviour.

import { describe, it, expect } from 'vitest'
import { toApiFormat } from '../entityMappers'

describe('entityMappers - budget_entry time field (LBDS-273)', () => {
  describe('toApiFormat (push)', () => {
    it('includes time in payload when set', () => {
      const row = {
        sync_id: 'test-1',
        name: 'Test Entry',
        amount: 100,
        date: '2026-10-18',
        entryType: 'egreso',
        time: '14:30',
      }
      const result = toApiFormat('budget_entry', row)
      expect(result).not.toBeNull()
      expect(result?.time).toBe('14:30')
    })

    it('sends time as null when the entry has none (the key is always present)', () => {
      const row = {
        sync_id: 'test-1',
        name: 'Test Entry',
        amount: 100,
        date: '2026-10-18',
        entryType: 'egreso',
      }
      const result = toApiFormat('budget_entry', row)
      expect(result).not.toBeNull()
      // The key must always be present: the server's conflict-detection
      // hash includes a nullable column when the column is present in the
      // stored row, so a payload that omits the key hashes differently and
      // would raise a phantom conflict on every push.
      expect('time' in result!).toBe(true)
      expect(result?.time).toBeNull()
    })

    it('normalizes a single-digit hour to the zero-padded shape', () => {
      const row = {
        sync_id: 'test-1',
        name: 'Test Entry',
        amount: 100,
        date: '2026-10-18',
        entryType: 'egreso',
        time: '9:00',
      }
      const result = toApiFormat('budget_entry', row)
      expect(result).not.toBeNull()
      // MySQL zero-pads the hour when it stores a TIME, and the server
      // hashes over the padded value. Sending the padded shape keeps the
      // client and server hashes identical.
      expect(result?.time).toBe('09:00')
    })

    it('drops a malformed time instead of sending it', () => {
      const row = {
        sync_id: 'test-1',
        name: 'Test Entry',
        amount: 100,
        date: '2026-10-18',
        entryType: 'egreso',
        time: '99:99',
      }
      const result = toApiFormat('budget_entry', row)
      expect(result).not.toBeNull()
      expect(result?.time).toBeNull()
    })

    it('sends an empty string time as null', () => {
      const row = {
        sync_id: 'test-1',
        name: 'Test Entry',
        amount: 100,
        date: '2026-10-18',
        entryType: 'egreso',
        time: '',
      }
      const result = toApiFormat('budget_entry', row)
      expect(result).not.toBeNull()
      expect(result?.time).toBeNull()
    })
  })

})

describe('entityMappers - recurring_record category field (LBDS-273)', () => {
  describe('toApiFormat (push)', () => {
    it('includes category in payload when set', () => {
      const row = {
        sync_id: 'rec-1',
        name: 'Recurring',
        type: 'cargo',
        entryType: 'egreso',
        repeatFrequency: 'month',
        repeatInterval: 1,
        autoInsert: true,
        startDate: '2026-01-01',
        status: 'active',
        category: 'groceries',
      }
      const result = toApiFormat('recurring_record', row)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('groceries')
    })

    it('sends category as null when the recurring has none (the key is always present)', () => {
      const row = {
        sync_id: 'rec-1',
        name: 'Recurring',
        type: 'cargo',
        entryType: 'egreso',
        repeatFrequency: 'month',
        repeatInterval: 1,
        autoInsert: true,
        startDate: '2026-01-01',
        status: 'active',
      }
      const result = toApiFormat('recurring_record', row)
      expect(result).not.toBeNull()
      // Always present, for the same reason as `time`: the server's field
      // hash includes the column when the stored row has it.
      expect('category' in result!).toBe(true)
      expect(result?.category).toBeNull()
    })

    it('sends an empty string category as null', () => {
      const row = {
        sync_id: 'rec-1',
        name: 'Recurring',
        type: 'cargo',
        entryType: 'egreso',
        repeatFrequency: 'month',
        repeatInterval: 1,
        autoInsert: true,
        startDate: '2026-01-01',
        status: 'active',
        category: '',
      }
      const result = toApiFormat('recurring_record', row)
      expect(result).not.toBeNull()
      expect(result?.category).toBeNull()
    })
  })

})
