import { DixieController } from './dixie';
import { useSync } from '@/composables/useSync';
import { generateSyncId } from '@/utils/generateSyncId';

export type Product = {
  id?: string | number;
  sync_id?: string;
  serverId?: number | null;
  name: string;
  price: number;
  imageBase64?: string | null;
  synced_at?: number;
};

class SupplierProductsController {
  private getController(): DixieController {
    return new DixieController({ name: 'ABOgazDB', storeName: 'suppliers' });
  }

  async addProduct(params: { supplierId: string | number; product: Omit<Product, 'id' | 'sync_id'> }) {
    const { supplierId, product } = params;
    const ctrl = this.getController();
    const now = Date.now();
    const syncId = generateSyncId();
    const entry = {
      ...product,
      sync_id: syncId,
      supplierId,
      createdAt: now,
      updatedAt: now,
    };

    const { syncSupplierProduct } = useSync();
    syncSupplierProduct({ product: entry, operation: 'create' });

    return await ctrl.addEntry({ entry });
  }

  async updateProduct(params: { product: Product }) {
    const { product } = params;
    const ctrl = this.getController();
    const { syncSupplierProduct } = useSync();
    syncSupplierProduct({ product, operation: 'update' });
    return await ctrl.putEntry({ entry: { ...product, updatedAt: Date.now() } });
  }

  async deleteProduct(params: { id: IDBValidKey }) {
    const { id } = params;
    const ctrl = this.getController();
    const { syncSupplierProduct } = useSync();
    syncSupplierProduct({ product: { id } as any, operation: 'delete' });
    return await ctrl.deleteBackup({ id });
  }
}

const supplierProductsController = new SupplierProductsController();
export default supplierProductsController;
export { SupplierProductsController };
