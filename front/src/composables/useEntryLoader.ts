import { useBudgetEntriesStore, mapEntryRow } from '@/stores/budgetEntriesStore';
import { budgetEntriesDb } from '@/db/controllers/budgetEntriesDb';
import { dataMediator } from '@/services/dataMediator';
import type { Income } from '@/stores/budgetEntriesStore';

export function useEntryLoader() {
  async function loadEntryFromDb(params: { entryId: string }): Promise<Income | null> {
    const { entryId } = params;

    await dataMediator.reload('entries');

    const idStr = String(entryId);
    const store = useBudgetEntriesStore();
    const inStore = store.entries.find((e) => String(e.id) === idStr);
    if (inStore) return inStore as unknown as Income;

    const row = await budgetEntriesDb.getBySyncId({ syncId: idStr });
    if (!row) return null;

    return mapEntryRow(row) as unknown as Income;
  }

  return { loadEntryFromDb };
}
