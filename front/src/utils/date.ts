// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { parseISO } from 'date-fns';

// Utility functions for local date formatting

/**
 * formatLocalDate
 * Returns a YYYY-MM-DD string representing the local date portion of the given
 * Date or date-like string. If no argument is provided, returns today's date
 * in local timezone formatted as YYYY-MM-DD.
 */
export function formatLocalDate(
  params: { d?: Date | string | null } | Date | string | null,
): string {
  // Support both shapes: formatLocalDate({ d }) and formatLocalDate(d)
  const d =
    params && typeof params === 'object' && 'd' in (params as any) ? (params as any).d : params;
  try {
    let dateObj: Date;
    if (d == null) {
      dateObj = new Date();
    } else if (d instanceof Date) {
      dateObj = d;
    } else {
      const s = String(d).trim();
      const plainDateMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (plainDateMatch) {
        const year = Number(plainDateMatch[1]);
        const month = Number(plainDateMatch[2]) - 1;
        const day = Number(plainDateMatch[3]);
        dateObj = new Date(year, month, day);
      } else {
        try {
          dateObj = parseISO(s);
          if (isNaN(dateObj.getTime())) throw new Error('invalid');
        } catch {
          const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (m) {
            const year = Number(m[1]);
            const month = Number(m[2]) - 1;
            const day = Number(m[3]);
            dateObj = new Date(year, month, day);
          } else {
            dateObj = new Date();
          }
        }
      }
    }

    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    try {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        '0',
      )}-${String(now.getDate()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  }
}

/**
 * parseLocalDate
 * Parse a date-like string or Date into a Date object representing the local
 * calendar day. If input is a YYYY-MM-DD string, constructs a local Date
 * (avoiding UTC shift). If input is a full ISO with time, parseISO is used.
 */
export function parseLocalDate(params: { d?: Date | string | null } | Date | string | null): Date {
  // Support both shapes: parseLocalDate({ d }) and parseLocalDate(d)
  const d =
    params && typeof params === 'object' && 'd' in (params as any) ? (params as any).d : params;
  if (d == null) return new Date();
  if (d instanceof Date) return d;
  const s = String(d).trim();
  const plainDateMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (plainDateMatch) {
    const year = Number(plainDateMatch[1]);
    const month = Number(plainDateMatch[2]) - 1;
    const day = Number(plainDateMatch[3]);
    return new Date(year, month, day);
  }
  try {
    const parsed = parseISO(s);
    if (!isNaN(parsed.getTime())) return parsed;
  } catch {
    // fallback below
  }
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    return new Date(year, month, day);
  }
  return new Date();
}

/**
 * normalizeName
 * Normalize a supplier/provider name to a compact, lowercase, diacritics-free
 * key suitable for matching and map lookups.
 */
export function normalizeName(params: { name: string | undefined | null }): string {
  const { name } = params;
  try {
    return String(name)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ');
  } catch {
    return String(name).trim().toLowerCase();
  }
}

/**
 * safeIntlFormat
 * Safely format a Date-like value using Intl.DateTimeFormat. Returns an empty
 * string when the input is invalid or formatting fails.
 */
export function safeIntlFormat(
  date: Date | number | string | undefined | null,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  try {
    if (date == null) return '';
    const d = date instanceof Date ? date : new Date(String(date));
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(locale, options as any).format(d);
  } catch {
    return '';
  }
}
