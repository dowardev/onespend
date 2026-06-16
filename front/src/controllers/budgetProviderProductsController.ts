import { budgetProviderProductsDb } from '@/db/controllers/budgetProviderProductsDb'
import { syncQueue } from '@/services/syncQueue';
import type { BudgetProviderProduct } from '@/stores/budgetProvidersStore';
import { generateSyncId } from '@/utils/generateSyncId';

export type { BudgetProviderProduct };

class BudgetProviderProductsController {
  async getAll(): Promise<BudgetProviderProduct[]> {
    try {
      return await budgetProviderProductsDb.getAll() as any;
    } catch (e) {
      console.error('budgetProviderProductsController.getAll error', e);
      return [];
    }
  }

  async getByProviderId(params: { providerId: string | number }): Promise<BudgetProviderProduct[]> {
    const { providerId } = params;
    return await budgetProviderProductsDb.getByProviderId({ providerSyncId: String(providerId) }) as any;
  }

  async addProduct(params: { product: Omit<BudgetProviderProduct, 'id' | 'sync_id'> }) {
    const { product } = params;
    const newProduct: BudgetProviderProduct = {
      ...product,
      sync_id: generateSyncId(),
    };

    const id = await budgetProviderProductsDb.add({ entry: newProduct as any });

    syncQueue.syncBudgetProviderProduct({ product: newProduct as any, operation: 'create' });

    return { ...newProduct, id };
  }

  async removeProductsByProviderId(params: { providerId: string | number }) {
    const { providerId } = params;
    const products = await this.getByProviderId({ providerId });
    const ctrl = budgetProviderProductsDb;

    for (const product of products) {
      if (product.sync_id != null) {
        syncQueue.syncBudgetProviderProduct({ product: product as any, operation: 'delete' });
        await ctrl.delete({ syncId: product.sync_id! });
      }
    }
  }
}

const budgetProviderProductsController = new BudgetProviderProductsController();
export default budgetProviderProductsController;
export { BudgetProviderProductsController };
