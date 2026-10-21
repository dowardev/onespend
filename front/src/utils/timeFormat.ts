// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * LBDS-273 (GitLab #13): canonical "HH:MM" for the optional time field.
 *
 * The time travels through three systems that each represent it
 * differently:
 *
 * - the client stores and sends it as "HH:MM" ("14:30");
 * - the server stores it in a MySQL TIME column, which hands back
 *   "HH:MM:SS" and zero-pads the hour ("9:00" comes back as "09:00:00");
 * - the sync payload must be a single canonical shape, because the server
 *   computes the conflict-detection field hash over the value it receives
 *   and compares it against the hash of the stored row. If the client sent
 *   "9:00" and the server stored "09:00", the two hashes differ and every
 *   push of that row would raise a phantom conflict.
 *
 * So the client normalizes to zero-padded "HH:MM" on the way out, and the
 * server normalizes to the same shape on the way in (the model accessor
 * does it there). Both sides then agree byte for byte.
 */

/**
 * Normalize any time-ish value to the canonical "HH:MM" shape.
 *
 * Returns `undefined` for anything that is not a usable time of day:
 * null, undefined, the empty string, a non-numeric hour or minute, or an
 * out-of-range value. A value that cannot be represented as a time of day
 * is dropped rather than pushed, so a malformed client payload cannot
 * poison the row.
 *
 * The rule has to match the server's two normalizers character for
 * character — the model's `BudgetEntry::getTimeAttribute` and the
 * processor's `BudgetEntryProcessor::normalizeTime` — because the client
 * and the server have to agree on the exact string they hash. A tolerance
 * that only one of the three has would reintroduce the phantom conflict
 * this shape exists to prevent.
 *
 * The shared rule: trim the value, split on ":", take the first two
 * parts, each part must be one or two digits, the hour must be 0-23 and
 * the minute 0-59.
 */
export function normalizeTime(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const parts = String(value).trim().split(':');
  if (parts.length < 2) {
    return undefined;
  }

  const hours = parts[0].trim();
  const minutes = parts[1].trim();
  if (!/^\d{1,2}$/.test(hours) || !/^\d{1,2}$/.test(minutes)) {
    return undefined;
  }

  const hourValue = Number(hours);
  const minuteValue = Number(minutes);
  if (hourValue > 23 || minuteValue > 59) {
    return undefined;
  }

  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}
