import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Supplier } from '../controllers/suppliersController';

export const useSuppliersStore = defineStore('suppliers', () => {
  const suppliers = ref<Supplier[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  // Remove manual subscription pattern - use watchEffect in components instead

  return {
    suppliers,
    loading,
    error,
  };
});
