// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import recurringRecordsController, { type RecurringProduct } from './recurringRecordsController';

class RecurringRecordProductsController {
  async addProduct(params: { recordId: string | number; product: RecurringProduct }): Promise<void> {
    const { recordId, product } = params;
    const record = await recurringRecordsController.getRecordById({ id: recordId });
    if (!record) return;
    const products = record.products || [];
    products.push(product);
    await recurringRecordsController.updateRecord({ id: recordId, changes: { products } });
  }

  async updateProduct(params: { recordId: string | number; index: number; product: Partial<RecurringProduct> }): Promise<void> {
    const { recordId, index, product } = params;
    const record = await recurringRecordsController.getRecordById({ id: recordId });
    if (!record || !record.products || index >= record.products.length) return;
    record.products[index] = { ...record.products[index], ...product } as RecurringProduct;
    await recurringRecordsController.updateRecord({ id: recordId, changes: { products: record.products } });
  }

  async removeProduct(params: { recordId: string | number; index: number }): Promise<void> {
    const { recordId, index } = params;
    const record = await recurringRecordsController.getRecordById({ id: recordId });
    if (!record || !record.products) return;
    record.products.splice(index, 1);
    await recurringRecordsController.updateRecord({ id: recordId, changes: { products: record.products } });
  }
}

export const recurringRecordProductsController = new RecurringRecordProductsController();
export default recurringRecordProductsController;
export { RecurringRecordProductsController };
