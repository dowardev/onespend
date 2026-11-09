<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Support;

/**
 * Canonical form of a time of day in the sync protocol.
 *
 * GitLab #17 (P1): the `time` column of `budget_entries` and
 * `recurring_records` is a MySQL TIME, so the database stores "14:30:00",
 * while the wire format (and the local Dexie row) is the zero-padded
 * "HH:MM". The client and the server have to agree on the exact string
 * they hash, or the conflict detector sees a phantom difference on every
 * push of that row.
 *
 * The rule has to match the client's `front/src/utils/timeFormat.ts`
 * `normalizeTime` character for character, and it is the single place
 * where it lives on the back: the model accessors that read the column
 * and the sync processors that write it.
 */
final class CanonicalTime
{
    /**
     * Canonical "HH:MM" for the given time of day, or null when the value
     * is not a usable time of day (null, empty string, garbage, an
     * out-of-range hour or minute).
     */
    public static function normalize(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $parts = explode(':', trim((string) $value));
        if (count($parts) < 2) {
            return null;
        }

        $hours = trim($parts[0]);
        $minutes = trim($parts[1]);
        if (! preg_match('/^\d{1,2}$/', $hours) || ! preg_match('/^\d{1,2}$/', $minutes)) {
            return null;
        }

        $hourValue = (int) $hours;
        $minuteValue = (int) $minutes;
        if ($hourValue > 23 || $minuteValue > 59) {
            return null;
        }

        return sprintf('%02d:%02d', $hourValue, $minuteValue);
    }
}
