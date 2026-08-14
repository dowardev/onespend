// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { RecurringRecord } from '@/controllers/recurringRecordsController';
import { format, getDate, getDaysInMonth } from 'date-fns';
import { parseLocalDate } from '@/utils/date';

function isDueOnDate(params: { record: RecurringRecord; dateStr: string }): boolean {
  const { record, dateStr } = params;
  const date = parseLocalDate({ d: dateStr });
  const start = parseLocalDate({ d: record.startDate });
  const interval = record.repeatInterval || 1;

  if (date < start) return false;
  if (record.endDate) {
    const end = parseLocalDate({ d: record.endDate });
    if (date > end) return false;
  }

  switch (record.repeatFrequency) {
    case 'day': {
      const diffDays = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays % interval === 0;
    }

    case 'week': {
      if (!record.repeatDays || record.repeatDays.length === 0) return false;
      const dayOfWeek = date.getDay();
      if (!record.repeatDays.includes(dayOfWeek)) return false;
      const weeksSinceStart = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
      return weeksSinceStart >= 0 && weeksSinceStart % interval === 0;
    }

    case 'month': {
      if (record.repeatMonthWeekdayMode) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== (record.repeatMonthWeekday ?? -1)) return false;
        const monthsSinceStart = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
        if (monthsSinceStart < 0 || monthsSinceStart % interval !== 0) return false;
        if (record.repeatMonthWeekdayOrdinal != null) {
          const ordinal = record.repeatMonthWeekdayOrdinal;
          const dayOfMonth = date.getDate();
          if (ordinal === -1) {
            const lastDay = getDaysInMonth(date);
            if (dayOfMonth < lastDay - 6) return false;
          } else {
            const expectedDay = ordinal * 7 - 6;
            if (dayOfMonth < expectedDay || dayOfMonth >= expectedDay + 7) return false;
          }
        }
        return true;
      }
      const targetMonthDay = record.repeatMonthDay ?? getDate(start);
      if (getDate(date) !== Math.min(targetMonthDay, getDaysInMonth(date))) return false;
      const monthsSinceStart = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
      return monthsSinceStart >= 0 && monthsSinceStart % interval === 0;
    }

    case 'year': {
      const targetYearMonth = record.repeatYearMonth ?? (start.getMonth() + 1);
      const targetYearDay = record.repeatYearDay ?? getDate(start);
      if (date.getMonth() + 1 !== targetYearMonth) return false;
      if (getDate(date) !== Math.min(targetYearDay, getDaysInMonth(date))) return false;
      const yearsSinceStart = date.getFullYear() - start.getFullYear();
      return yearsSinceStart >= 0 && yearsSinceStart % interval === 0;
    }

    default:
      return false;
  }
}

function getNextOccurrence(params: { record: RecurringRecord; fromDate?: Date }): string | null {
  const { record, fromDate = new Date() } = params;
  const maxIterations = 730;
  let checkDate = fromDate;

  for (let i = 0; i < maxIterations; i++) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    if (isDueOnDate({ record, dateStr })) {
      return dateStr;
    }
    checkDate = new Date(checkDate.getTime() + 24 * 60 * 60 * 1000);
  }
  return null;
}

function hasTimeElapsed(params: { time: string }): boolean {
  const { time } = params;
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = h * 60 + m;
  return nowMinutes >= targetMinutes;
}

function isDateToday(params: { dateStr: string }): boolean {
  const { dateStr } = params;
  const target = parseLocalDate({ d: dateStr });
  const now = new Date();
  return (
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate()
  );
}

function shouldAutoInsert(params: {
  record: RecurringRecord;
  dateStr: string;
}): boolean {
  const { record, dateStr } = params;
  if (record.status !== 'active') {
    return false;
  }
  if (!record.autoInsert) {
    return false;
  }

  if (!isDateToday({ dateStr })) {
    return true;
  }

  if (!record.time) {
    return false;
  }

  const elapsed = hasTimeElapsed({ time: record.time });
  return elapsed;
}

function getDueRecordsForDate(params: {
  records: RecurringRecord[];
  dateStr: string;
}): { autoInsert: RecurringRecord[]; pending: RecurringRecord[] } {
  const { records, dateStr } = params;
  const autoInsert: RecurringRecord[] = [];
  const pending: RecurringRecord[] = [];

  for (const record of records) {
    if (record.status !== 'active') continue;
    if (!isDueOnDate({ record, dateStr })) continue;
    if (shouldAutoInsert({ record, dateStr })) {
      autoInsert.push(record);
    } else {
      pending.push(record);
    }
  }

  return { autoInsert, pending };
}

export { isDueOnDate, getNextOccurrence, getDueRecordsForDate, hasTimeElapsed, shouldAutoInsert };

export function useRecurrence() {
  return {
    isDueOnDate,
    getNextOccurrence,
    getDueRecordsForDate,
    shouldAutoInsert,
  };
}

export default useRecurrence;
