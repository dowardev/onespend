import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { Supplier } from '../controllers/suppliersController';

export const useSuppliersStore = defineStore('suppliers', () => {
  const suppliers = ref<Supplier[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const onChangeCallbacks: Array<(suppliers: Supplier[]) => void> = [];

  function subscribeToChanges(callback: (suppliers: Supplier[]) => void) {
    onChangeCallbacks.push(callback);
    return () => {
      const idx = onChangeCallbacks.indexOf(callback);
      if (idx >= 0) onChangeCallbacks.splice(idx, 1);
    };
  }

  function notifyChange() {
    onChangeCallbacks.forEach(cb => cb(suppliers.value));
  }

  return {
    suppliers,
    loading,
    error,
    subscribeToChanges,
    notifyChange,
  };
});
