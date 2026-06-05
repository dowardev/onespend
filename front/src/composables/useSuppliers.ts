import suppliersController from '@/controllers/suppliersController';

export function useSuppliers() {
  async function loadAll() {
    return await suppliersController.listSuppliers();
  }

  async function add(params: { s: Parameters<typeof suppliersController.addSupplier>[0]['s'] }) {
    return await suppliersController.addSupplier(params);
  }

  async function update(params: { s: Parameters<typeof suppliersController.updateSupplier>[0]['s'] }) {
    return await suppliersController.updateSupplier(params);
  }

  async function remove(params: { id: string | number }) {
    return await suppliersController.deleteSupplier(params);
  }

  function getAll() {
    return suppliersController.getSuppliers();
  }

  return { loadAll, add, update, remove, getAll };
}
