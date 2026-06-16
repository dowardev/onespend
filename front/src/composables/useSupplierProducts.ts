import supplierProductsController from '@/controllers/supplierProductsController';

export function useSupplierProducts() {
  async function add(params: { supplierId: string | number; product: any }) {
    return await supplierProductsController.addProduct(params);
  }

  async function update(params: { product: any }) {
    return await supplierProductsController.updateProduct(params);
  }

  async function remove(params: { syncId: string }) {
    return await supplierProductsController.deleteProduct(params);
  }

  return { add, update, remove };
}
