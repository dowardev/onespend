// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ref, computed, type Ref, type ComputedRef } from 'vue';
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfYear,
} from 'date-fns';
import { translate } from '@/i18n';

export type PeriodType = 'day' | 'week' | 'month' | 'year';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface UsePeriodRangeOptions {
  initialDate?: Date;
  weekStartDay?: Ref<number>;
}

export interface UsePeriodRangeReturn {
  referenceDate: Ref<Date>;
  weekStartDay: Ref<number>;
  dateLabel: ComputedRef<string>;
  currentDateFormatted: ComputedRef<string>;
  previousDateFormatted: ComputedRef<string>;
  getBaseDate: () => Date;
  getBudgetDateRange: () => DateRange;
  getPreviousPeriodDateRange: () => DateRange;
  prevPeriod: () => void;
  nextPeriod: () => void;
  resetToToday: () => void;
  startOfWeekWithConfig: (date: Date) => Date;
  endOfWeekWithConfig: (date: Date) => Date;
}

export function usePeriodRange(
  period: Ref<PeriodType> | ComputedRef<PeriodType>,
  options: UsePeriodRangeOptions = {},
): UsePeriodRangeReturn {
  const referenceDate = ref(options.initialDate ?? new Date());
  const weekStartDay = options.weekStartDay ?? ref(1);

  const _periodLabels: Record<PeriodType, string> = {
    day: translate('common.periodDay'),
    week: translate('common.periodWeek'),
    month: translate('common.periodMonth'),
    year: translate('common.periodYear'),
  };

  function startOfWeekWithConfig(date: Date): Date {
    const currentDay = date.getDay();
    const weekStart = weekStartDay.value;
    let diff = currentDay - weekStart;
    if (diff < 0) {
      diff += 7;
    }
    const result = new Date(date);
    result.setDate(date.getDate() - diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function endOfWeekWithConfig(date: Date): Date {
    const start = startOfWeekWithConfig(date);
    const result = new Date(start);
    result.setDate(start.getDate() + 6);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  function getBaseDate(): Date {
    const refDate = new Date(referenceDate.value);
    switch (period.value) {
      case 'day':
        return refDate;
      case 'week':
        return startOfWeekWithConfig(refDate);
      case 'month':
        return startOfMonth(refDate);
      case 'year':
        return startOfYear(refDate);
      default:
        return refDate;
    }
  }

  function getBudgetDateRange(): DateRange {
    const baseDate = getBaseDate();
    let start: Date;
    let end: Date;

    switch (period.value) {
      case 'day':
        start = new Date(baseDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(baseDate);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start = startOfWeekWithConfig(baseDate);
        end = endOfWeekWithConfig(baseDate);
        break;
      case 'month':
        start = startOfMonth(baseDate);
        end = endOfMonth(baseDate);
        break;
      case 'year':
        start = startOfYear(baseDate);
        end = endOfYear(baseDate);
        break;
      default:
        start = new Date(baseDate);
        end = new Date(baseDate);
    }

    return { start, end };
  }

  function getPreviousPeriodDateRange(): DateRange {
    const baseDate = getBaseDate();
    let start: Date;
    let end: Date;

    switch (period.value) {
      case 'day': {
        const prevDay = addDays(baseDate, -1);
        start = new Date(prevDay);
        start.setHours(0, 0, 0, 0);
        end = new Date(prevDay);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'week': {
        const prevWeekStart = addWeeks(startOfWeekWithConfig(baseDate), -1);
        start = prevWeekStart;
        end = endOfWeekWithConfig(prevWeekStart);
        break;
      }
      case 'month': {
        const prevMonthStart = addMonths(startOfMonth(baseDate), -1);
        start = prevMonthStart;
        end = endOfMonth(prevMonthStart);
        break;
      }
      case 'year': {
        const prevYearStart = addYears(startOfYear(baseDate), -1);
        start = prevYearStart;
        end = endOfYear(prevYearStart);
        break;
      }
      default:
        start = new Date(baseDate);
        end = new Date(baseDate);
    }

    return { start, end };
  }

  function prevPeriod(): void {
    const refDate = new Date(referenceDate.value);
    switch (period.value) {
      case 'day':
        referenceDate.value = addDays(refDate, -1);
        break;
      case 'week':
        referenceDate.value = addWeeks(refDate, -1);
        break;
      case 'month':
        referenceDate.value = addMonths(refDate, -1);
        break;
      case 'year':
        referenceDate.value = addYears(refDate, -1);
        break;
    }
  }

  function nextPeriod(): void {
    const refDate = new Date(referenceDate.value);
    switch (period.value) {
      case 'day':
        referenceDate.value = addDays(refDate, 1);
        break;
      case 'week':
        referenceDate.value = addWeeks(refDate, 1);
        break;
      case 'month':
        referenceDate.value = addMonths(refDate, 1);
        break;
      case 'year':
        referenceDate.value = addYears(refDate, 1);
        break;
    }
  }

  function resetToToday(): void {
    referenceDate.value = new Date();
  }

  const dateLabel = computed(() => {
    const baseDate = getBaseDate();
    switch (period.value) {
      case 'day':
        return format(baseDate, 'dd MMM yyyy');
      case 'week':
        return `${format(startOfWeekWithConfig(baseDate), 'dd')} - ${format(endOfWeekWithConfig(baseDate), 'dd MMM yyyy')}`;
      case 'month':
        return format(baseDate, 'MMMM yyyy');
      case 'year':
        return format(baseDate, 'yyyy');
      default:
        return '';
    }
  });

  const currentDateFormatted = computed(() => {
    const baseDate = getBaseDate();
    switch (period.value) {
      case 'day':
        return format(baseDate, 'yyyy-MM-dd');
      case 'week':
        return `${format(startOfWeek(baseDate), 'dd MMM')} - ${format(endOfWeek(baseDate), 'dd MMM')}`;
      case 'month':
        return format(baseDate, 'MMMM yyyy');
      case 'year':
        return format(baseDate, 'yyyy');
      default:
        return '';
    }
  });

  const previousDateFormatted = computed(() => {
    const { start: prevStart, end: _prevEnd } = getPreviousPeriodDateRange();
    switch (period.value) {
      case 'day':
        return format(prevStart, 'yyyy-MM-dd');
      case 'week':
        return `${format(startOfWeek(prevStart), 'dd MMM')} - ${format(endOfWeek(prevStart), 'dd MMM')}`;
      case 'month':
        return format(prevStart, 'MMMM yyyy');
      case 'year':
        return format(prevStart, 'yyyy');
      default:
        return '';
    }
  });

  return {
    referenceDate,
    weekStartDay,
    dateLabel,
    currentDateFormatted,
    previousDateFormatted,
    getBaseDate,
    getBudgetDateRange,
    getPreviousPeriodDateRange,
    prevPeriod,
    nextPeriod,
    resetToToday,
    startOfWeekWithConfig,
    endOfWeekWithConfig,
  };
}
