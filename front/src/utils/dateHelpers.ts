// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { format } from 'date-fns';
import { getIntlLocale } from '@/i18n';

export function parseDateValue(params: { raw: string | number | Date | null | undefined }): string {
  const { raw } = params;
  if (!raw) return format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';

  if (raw instanceof Date) {
    return format(raw, 'yyyy-MM-dd') + 'T00:00:00';
  }

  if (typeof raw === 'string') {
    if (raw.includes('T')) {
      return raw.length >= 19 ? raw.slice(0, 19) : raw + 'T00:00:00';
    }
    return `${raw.slice(0, 10)}T00:00:00`;
  }

  if (typeof raw === 'number') {
    return format(new Date(raw), 'yyyy-MM-dd') + 'T00:00:00';
  }

  return format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';
}

export function toShortDate(params: { isoDate: string | null }): string {
  const { isoDate } = params;
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString(getIntlLocale(), {
      day: '2-digit',
      month: '2-digit',
      // Full year on purpose: a two-digit year is ambiguous ("05/01/26" could
      // be January or May), and this label dates transactions.
      year: 'numeric',
    });
  } catch {
    return String(isoDate).slice(0, 10);
  }
}
