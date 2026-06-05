import { DixieController } from './dixie';
import { useSync } from '@/composables/useSync';
import type { BudgetProviderProduct } from '@/stores/budgetProvidersStore';
import { generateSyncId } from '@/utils/generateSyncId';

export type { BudgetProviderProduct };

class BudgetProviderProductsController {
  private getController(): DixieController {
    return new DixieController({ name: 'ABOgazDB', storeName: 'backups' });
  }

  async getAll(): Promise<BudgetProviderProduct[]> {
    try {
      const ctrl = this.getController();
      const all = (await ctrl.listBackups()) as any[];
      return all.filter((item) => String(item.id)?.startsWith('providerProduct:'));
    } catch (e) {
      console.error('budgetProviderProductsController.getAll error', e);
      return [];
    }
  }

  async getByProviderId(params: { providerId: string | number }): Promise<BudgetProviderProduct[]> {
    const { providerId } = params;
    const all = await this.getAll();
    return all.filter((p) => String((p as any).providerId) === String(providerId));
  }

  async addProduct(params: { product: Omit<BudgetProviderProduct, 'id' | 'sync_id'> }) {
    const { product } = params;
    const newProduct: BudgetProviderProduct = {
      ...product,
      sync_id: generateSyncId(),
    };

    const ctrl = this.getController();
    const id = await ctrl.addEntry({ entry: { ...newProduct, id: `providerProduct:${generateSyncId()}` } });

    const { syncBudgetProviderProduct } = useSync();
    syncBudgetProviderProduct({ product: newProduct as any, operation: 'create' });

    return { ...newProduct, id };
  }

  async removeProductsByProviderId(params: { providerId: string | number }) {
    const { providerId } = params;
    const products = await this.getByProviderId({ providerId });
    const ctrl = this.getController();

    for (const product of products) {
      if (product.id != null) {
        const { syncBudgetProviderProduct } = useSync();
        syncBudgetProviderProduct({ product: product as any, operation: 'delete' });
        await ctrl.deleteBackup({ id: product.id as IDBValidKey });
      }
    }
  }
}

const budgetProviderProductsController = new BudgetProviderProductsController();
export default budgetProviderProductsController;
export { BudgetProviderProductsController };
