import { DixieController } from './dixie';
import { useSync } from '@/composables/useSync';
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
  private getController(): DixieController {
    return new DixieController({ name: 'ABOgazDB', storeName: 'backups' });
  }

  async getAll(): Promise<BudgetEntryGroup[]> {
    try {
      const ctrl = this.getController();
      const all = (await ctrl.listBackups()) as any[];
      return all.filter((item) => String(item.id)?.startsWith('entryGroup:'));
    } catch (e) {
      console.error('budgetEntryGroupsController.getAll error', e);
      return [];
    }
  }

  async getByEntryId(params: { entryId: string | number }): Promise<BudgetEntryGroup[]> {
    const { entryId } = params;
    const all = await this.getAll();
    return all.filter((g) => String(g.entryId) === String(entryId));
  }

  async addGroup(params: { group: Omit<BudgetEntryGroup, 'id' | 'sync_id'> }) {
    const { group } = params;
    const newGroup: BudgetEntryGroup = {
      ...group,
      sync_id: generateSyncId(),
    };

    const ctrl = this.getController();
    const id = await ctrl.addEntry({ entry: { ...newGroup, id: `entryGroup:${generateSyncId()}` } });

    const { syncEntry } = useSync();
    syncEntry({ entry: newGroup as any, operation: 'create' });

    return { ...newGroup, id };
  }

  async removeGroupsByEntryId(params: { entryId: string | number }) {
    const { entryId } = params;
    const groups = await this.getByEntryId({ entryId });
    const ctrl = this.getController();

    for (const group of groups) {
      if (group.id != null) {
        const { syncEntry } = useSync();
        syncEntry({ entry: group as any, operation: 'delete' });
        await ctrl.deleteBackup({ id: group.id as IDBValidKey });
      }
    }
  }
}

const budgetEntryGroupsController = new BudgetEntryGroupsController();
export default budgetEntryGroupsController;
export { BudgetEntryGroupsController };
