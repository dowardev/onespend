// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import budgetEntriesController from '@/controllers/budgetEntriesController';

function toShortDate(d: string | number | Date | undefined | null): string {
  if (!d) return new Date().toISOString().slice(0, 10);
  if (typeof d === 'number') return new Date(d).toISOString().slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d);
  const m = s.match(/\d{4}-\d{2}-\d{2}/);
  if (m) return m[0];
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

export async function reassignEntry(params: {
  entryId: string | number;
  newDate: string | number | Date;
  verbose?: boolean;
}): Promise<{ moved: boolean; id: string | number; error?: any }> {
  const { entryId, newDate, verbose } = params;
  const idToUse = entryId;
  try {
    const destDate = toShortDate(newDate);

    if (verbose) console.log('reassignEntry: destDate ->', destDate, 'entryId ->', entryId);

    await budgetEntriesController.updateEntry({
      id: entryId,
      changes: { date: destDate } as any,
    });

    return { moved: true, id: idToUse };
  } catch (error) {
    try {
      console.error('reassignEntry error', error);
    } catch {}
    return { moved: false, id: idToUse, error };
  }
}

export default { reassignEntry };
