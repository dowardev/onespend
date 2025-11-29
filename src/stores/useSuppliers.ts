import { ref, computed } from 'vue';
import suppliersController from '../controllers/suppliersController';
// Use a lightweight local Supplier alias to avoid deep TypeScript instantiation
type Supplier = any;

const suppliers = ref<Supplier[]>([]);
const loading = ref(false);
const error = ref<Error | null>(null);

export function useSuppliers() {
  async function loadAll() {
    loading.value = true;
    error.value = null;
    try {
      suppliers.value =
        (await suppliersController.listSuppliers()) as Supplier[];
    } catch (_e) {
      error.value = _e as Error;
    } finally {
      loading.value = false;
    }
  }

  async function createSupplier(
    data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>
  ) {
    loading.value = true;
    error.value = null;
    try {
      const s = await suppliersController.addSupplier(data);
      suppliers.value = [s, ...suppliers.value];
      return s;
    } catch (e) {
      error.value = e as Error;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updateSupplier(s: Supplier) {
    loading.value = true;
    error.value = null;
    try {
      const updated = await suppliersController.updateSupplier(s);
      suppliers.value = suppliers.value.map(x =>
        x.id === updated.id ? updated : x
      );
      return updated;
    } catch (e) {
      error.value = e as Error;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function deleteSupplier(id: IDBValidKey) {
    loading.value = true;
    error.value = null;
    try {
      await suppliersController.deleteSupplier(id);
      suppliers.value = suppliers.value.filter(s => s.id !== id);
    } catch (e) {
      error.value = e as Error;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return {
    suppliers: computed(() => suppliers.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    loadAll,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  };
}
