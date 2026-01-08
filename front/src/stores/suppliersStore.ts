import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { Supplier } from '../controllers/suppliersController';

export const useSuppliersStore = defineStore('suppliers', () => {
  const suppliers = ref<Supplier[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  return {
    suppliers,
    loading,
    error,
  };
});
