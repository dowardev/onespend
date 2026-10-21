// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// App-level background processor for recurring charges.
// Auto-inserts due recurring records into local storage regardless of which
// screen is active, so any view (Budget, Reports, etc.) sees them as legitimate entries.

import { ref, watch } from 'vue';
import { formatLocalDate } from '@/utils/date';
import {
  recurringRecordsController,
  recurringRecordsChangeSignal,
  type RecurringRecord,
} from '@/controllers/recurringRecordsController';
import budgetEntriesController from '@/controllers/budgetEntriesController';
import budgetProvidersController from '@/controllers/budgetProvidersController';
import { useBudgetDayStore } from '@/stores/budgetDayStore';
import { isDueOnDate, shouldAutoInsert } from '@/composables/useRecurrence';

// Shared reactive list of pending (non-auto-inserted) due records, used by BudgetView's modal.
export const pendingRecurringRecords = ref<RecurringRecord[]>([]);

let checkTimer: ReturnType<typeof setTimeout> | null = null;
let signalStop: (() => void) | null = null;
let inflightProcess: Promise<void> | null = null;

function getTodayDateStr(): string {
  return formatLocalDate({ d: new Date() });
}

function clearCheckTimer(): void {
  if (checkTimer) {
    clearTimeout(checkTimer);
    checkTimer = null;
  }
}

// Schedules the next auto-insert check at the exact moment the soonest time-gated pending
// charge becomes due (instead of a fixed 60s poll), so charges insert on time and without
// drifting a full minute late.
function scheduleRecurringCheck(pendientes: RecurringRecord[]): void {
  clearCheckTimer();
  const timeGated = pendientes.filter((r) => r.autoInsert && r.time);
  if (timeGated.length === 0) return;
  const now = new Date();
  let soonestMs = Infinity;
  for (const r of timeGated) {
    const [h, m] = String(r.time).split(':').map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    let diff = target.getTime() - now.getTime();
    if (diff < 0) diff = 0;
    if (diff < soonestMs) soonestMs = diff;
  }
  const delay = Math.min(soonestMs, 60 * 60 * 1000);
  checkTimer = setTimeout(() => {
    void processRecurringForDate();
  }, delay);
}

async function deduplicateRecurringEntries(): Promise<void> {
  const existingEntries = budgetEntriesController.getEntries();
  const existingProviders = budgetProvidersController.getProviders();
  const entryRecurringIds = new Set<string>();
  const providerRecurringIds = new Set<string>();
  let hadDuplicates = false;

  for (const e of existingEntries) {
    if (e._fromRecurringId) {
      if (entryRecurringIds.has(e._fromRecurringId)) {
        budgetEntriesController.removeEntry({ id: e.id });
        console.warn('[recurring] dedup: removed duplicate entry', e.id, e._fromRecurringId);
        hadDuplicates = true;
      } else {
        entryRecurringIds.add(e._fromRecurringId);
      }
    }
  }
  for (const p of existingProviders) {
    if (p._fromRecurringId) {
      if (providerRecurringIds.has(p._fromRecurringId)) {
        budgetProvidersController.removeProvider({ id: p.id });
        console.warn('[recurring] dedup: removed duplicate provider', p.id, p._fromRecurringId);
        hadDuplicates = true;
      } else {
        providerRecurringIds.add(p._fromRecurringId);
      }
    }
  }

  if (hadDuplicates) {
    // Duplicates were removed above (logged per entry); nothing else to do here yet.
  }
}

// Processes recurring records for the given date (defaults to today) and inserts the
// auto-insertable ones into local storage on that date. Time-gated records go to the pending
// list and a one-shot timer is scheduled for the exact moment their time arrives.
async function runProcess(dateStr?: string): Promise<void> {
  try {
    const targetDateStr = dateStr || getTodayDateStr();
    if (!targetDateStr) return;

    await deduplicateRecurringEntries();

    const existingEntries = budgetEntriesController.getEntriesForDate({ date: targetDateStr });
    const existingProviders = budgetProvidersController.getProvidersForDate({ date: targetDateStr });
    const records = await recurringRecordsController.getActiveRecords();
    const pendientes: RecurringRecord[] = [];

    for (const record of records) {
      if (!isDueOnDate({ record, dateStr: targetDateStr })) continue;

      const auto = shouldAutoInsert({ record, dateStr: targetDateStr });

      if (auto) {
        const syncId = record.sync_id;
        if (!syncId) {
          console.warn('[recurring] SKIP — missing sync_id for', record.name);
          pendientes.push(record);
          continue;
        }

        // Pause rule: a record resumed today at/after its due time was paused during
        // that day's occurrence, so skip today and continue the schedule from the next
        // occurrence instead of backfilling the paused day.
        if (record.resumedAt && record.time) {
          const resumedDateStr = formatLocalDate({ d: new Date(record.resumedAt) });
          if (resumedDateStr === targetDateStr) {
            const [rh, rm] = String(record.time).split(':').map(Number);
            const resumedMins = new Date(record.resumedAt).getHours() * 60 + new Date(record.resumedAt).getMinutes();
            const dueMins = rh * 60 + rm;
            if (resumedMins >= dueMins) {
              continue;
            }
          }
        }

        if (record.type === 'cargo') {
          const alreadyExists = existingEntries.some((e) => e._fromRecurringId === syncId);
          if (alreadyExists) continue;
          if (record.entryType === 'ingreso') {
            await budgetEntriesController.addIngreso({
              name: record.name,
              amount: record.amount || 0,
              accountId: record.accountId,
              date: targetDateStr,
              _fromRecurringId: syncId,
              category: record.category,
            });
          } else {
            await budgetEntriesController.addEgreso({
              name: record.name,
              amount: record.amount || 0,
              accountId: record.accountId,
              date: targetDateStr,
              _fromRecurringId: syncId,
              category: record.category,
            });
          }
        } else {
          const alreadyExists = existingProviders.some((p) => p._fromRecurringId === syncId);
          if (alreadyExists) continue;
          await budgetProvidersController.addProvider({
            name: record.name,
            estimated: record.estimated,
            accountId: record.accountId ? Number(record.accountId) : null,
            date: targetDateStr,
            _fromRecurringId: syncId,
            products: record.products?.map((p) => ({
              id: p.supplierProductId ? String(p.supplierProductId) : undefined,
              productName: p.productName,
              productPrice: p.productPrice,
              quantity: p.quantity,
            })),
            items: record.items?.map((i) => ({
              amount: Number(i.amount),
              accountId:
                typeof i.accountId === 'object' && i.accountId
                  ? (i.accountId as { id: string | number }).id
                  : ((i.accountId ?? null) as string | number | null),
            })),
          });
        }
      } else {
        pendientes.push(record);
      }
    }

    // Only publish the pending list when we processed the date the user is viewing
    // (the modal applies at budgetDayStore.selectedDate). Background today-processing
    // (boot, timer, change signal) must not clobber the list for a different viewed day.
    const viewedDateStr = useBudgetDayStore().selectedDate || getTodayDateStr();
    if (viewedDateStr === targetDateStr) {
      pendingRecurringRecords.value = pendientes;
    }
    scheduleRecurringCheck(pendientes);
  } catch (error) {
    console.error('Failed to process recurring records:', error);
  }
}

// Serialized public entry point: concurrent callers (app boot, Budget navigation, the
// one-shot timer, and the recurringRecordsChangeSignal watcher) share a single in-flight
// run. A call that arrives while another is running waits for it and then processes its
// own date, so two overlapping runs can never both see `alreadyExists === false` and
// double-insert the same occurrence.
export async function processRecurringForDate(dateStr?: string): Promise<void> {
  if (inflightProcess) {
    await inflightProcess.catch(() => undefined);
  }
  const p = runProcess(dateStr);
  inflightProcess = p;
  try {
    await p;
  } finally {
    if (inflightProcess === p) inflightProcess = null;
  }
}

// Initializes the background processor: normalizes records, processes today, keeps a
// one-shot timer aligned to the next due time, and re-processes whenever the recurring
// records set changes.
export async function initRecurringProcessor(): Promise<void> {
  try {
    await recurringRecordsController.repairRecords();
  } catch {
    // repair is best-effort; continue processing
  }
  await processRecurringForDate();
  if (!signalStop) {
    signalStop = watch(recurringRecordsChangeSignal, () => {
      void processRecurringForDate();
    });
  }
}

export function stopRecurringProcessor(): void {
  clearCheckTimer();
  signalStop?.();
  signalStop = null;
}