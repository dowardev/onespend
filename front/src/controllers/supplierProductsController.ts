// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { supplierProductsDb } from '@/db/controllers/supplierProductsDb';
import { syncQueue } from '@/services/syncQueue';
import { generateSyncId } from '@/utils/generateSyncId';

export type Product = {
  id?: string | number;
  sync_id?: string;
  serverId?: number | null;
  name: string;
  price: number;
  imageBase64?: string | null;
  syncedAt?: number;
};

class SupplierProductsController {
  async addProduct(params: { supplierId: string | number; product: Omit<Product, 'id' | 'sync_id'> }) {
    const { supplierId, product } = params;
    const now = Date.now();
    const syncId = generateSyncId();
    const entry = {
      ...product,
      sync_id: syncId,
      supplierId,
      createdAt: now,
      updatedAt: now,
    };

    syncQueue.syncSupplierProduct({ product: entry, operation: 'create' });

    return await supplierProductsDb.add({ entry: entry as any });
  }

  async updateProduct(params: { product: Product }) {
    const { product } = params;
    syncQueue.syncSupplierProduct({ product, operation: 'update' });
    return await supplierProductsDb.put({ entry: { ...product, updatedAt: Date.now() } as any });
  }

  async deleteProduct(params: { syncId: string }) {
    const { syncId } = params;
    syncQueue.syncSupplierProduct({ product: { sync_id: syncId } as any, operation: 'delete' });
    return await supplierProductsDb.delete({ syncId });
  }
}

const supplierProductsController = new SupplierProductsController();
export default supplierProductsController;
export { SupplierProductsController };
