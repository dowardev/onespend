import { budgetEntryGroupsDb } from '@/db/controllers/budgetEntryGroupsDb'
import { budgetEntriesDb } from '@/db/controllers/budgetEntriesDb'
import { syncQueue } from '@/services/syncQueue';
import { generateSyncId } from '@/utils/generateSyncId';

export interface BudgetEntryGroup {
  id?: string | number;
  sync_id?: string;
  serverId?: number | null;
  entryId?: string | number;
  amount: number;
  accountId: string | number | null;
}

class BudgetEntryGroupsController {
  async getAll(): Promise<BudgetEntryGroup[]> {
    try {
      return await budgetEntryGroupsDb.getAll() as any;
    } catch (e) {
      console.error('budgetEntryGroupsController.getAll error', e);
      return [];
    }
  }

  async getByEntryId(params: { entryId: string | number }): Promise<BudgetEntryGroup[]> {
    const { entryId } = params;
    return await budgetEntryGroupsDb.getByEntryId({ entrySyncId: String(entryId) }) as any;
  }

  async addGroup(params: { group: Omit<BudgetEntryGroup, 'id' | 'sync_id'> }) {
    const { group } = params;
    const newGroup: BudgetEntryGroup = {
      ...group,
      sync_id: generateSyncId(),
    };

    const id = await budgetEntryGroupsDb.add({ entry: newGroup as any });

    const allGroups = await budgetEntryGroupsDb.getByEntryId({ entrySyncId: String(newGroup.entryId) });
    const entry = await budgetEntriesDb.getBySyncId({ syncId: String(newGroup.entryId) });
    if (entry) {
      entry.groups = allGroups.map((g: any) => ({ amount: g.amount, accountId: g.account_id || g.accountId }));
      await syncQueue.syncEntry({ entry, operation: 'update' });
    }

    return { ...newGroup, id };
  }

  async removeGroupsByEntryId(params: { entryId: string | number }) {
    const { entryId } = params;
    const groups = await this.getByEntryId({ entryId });

    for (const group of groups) {
      if (group.id != null) {
        await budgetEntryGroupsDb.delete({ id: Number(group.id) });
      }
    }

    const entry = await budgetEntriesDb.getBySyncId({ syncId: String(entryId) });
    if (entry) {
      entry.groups = [];
      await syncQueue.syncEntry({ entry, operation: 'update' });
    }
  }
}

const budgetEntryGroupsController = new BudgetEntryGroupsController();
export default budgetEntryGroupsController;
export { BudgetEntryGroupsController };
