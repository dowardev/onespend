// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { BudgetEntryRow } from '@/db/types'

/**
 * LBDS-273 (GitLab #13): combine `date` + `time` into a single JS Date.
 * Column-apart approach (D1=C): `date` stays as legacy YYYY-MM-DD for
 * every existing consumer (Historial, today badge, day close, sync
 * payload, date picker); this helper provides the full instant for the
 * few features that need it (agenda, reports, recurrences).
 *
 * When `row.time` is missing (legacy rows, daily "no specific time" UX),
 * time defaults to "00:00" — result is a valid Date at the start of the
 * entry's day.
 *
 * Returns a Date in LOCAL timezone (not UTC): a "2026-10-18 14:30" entry
 * happened at 14:30 in the user's tz, not 14:30 UTC. Consumers needing
 * UTC must apply their own conversion.
 *
 * @param row - Object with `date` (YYYY-MM-DD or ISO string) and optional `time` (HH:MM or H:MM)
 * @returns Date in local timezone, or Invalid Date (NaN) if `date` is empty/missing
 */
export function entryTimestamp(row: { date: BudgetEntryRow['date']; time?: string }): Date {
  const dateStr = row.date?.slice(0, 10)
  if (!dateStr) {
    return new Date(NaN)
  }
  let timeStr = row.time ?? '00:00'
  // Normalize single-digit hour (H:MM → HH:MM) so Date constructor parses correctly
  if (timeStr && /^\d:\d{2}$/.test(timeStr)) {
    timeStr = `0${timeStr}`
  }
  return new Date(`${dateStr}T${timeStr}:00`)
}