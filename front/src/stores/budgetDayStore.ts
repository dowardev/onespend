import { defineStore } from 'pinia';
import { ref } from 'vue';
import { formatLocalDate } from '@/utils/date';
import { useBudgetEntriesStore } from './budgetEntriesStore';
import { useBudgetProvidersStore } from './budgetProvidersStore';
import { DixieController } from '@/controllers/dixie';

export interface FinishDayData {
  totalSalesEfectivo: number;
  totalSalesTarjeta: number;
  totalSalesCredito: number;
  type: '%' | 'fixed';
  margin: number;
}

export const useBudgetDayStore = defineStore('budgetDay', () => {
  const selectedDate = ref(formatLocalDate({ d: new Date() }));
  const isDayClosed = ref(false);
  const finishDayData = ref<FinishDayData>({
    totalSalesEfectivo: 0,
    totalSalesTarjeta: 0,
    totalSalesCredito: 0,
    type: '%',
    margin: 0,
  });
  const isLoading = ref(false);
  const frozenSnapshot = ref<{
    entries: any[];
    providers: any[];
    finishDayData: FinishDayData;
    timestamp: number;
  } | null>(null);

  function setSelectedDate(date: string) {
    selectedDate.value = date;
  }

  function setIsLoading(value: boolean) {
    isLoading.value = value;
  }

  function setIsDayClosed(value: boolean) {
    isDayClosed.value = value;
  }

  function setFrozenSnapshot(snapshot: typeof frozenSnapshot.value) {
    frozenSnapshot.value = snapshot;
  }

  function setFinishDayData(data: FinishDayData) {
    finishDayData.value = { ...data };
  }

  function getDixieController(): DixieController {
    return new DixieController({ name: 'ABOgazDB', storeName: 'budget' });
  }

  async function loadBudgetForDate(params: { date: string }) {
    const { date } = params;
    const entriesStore = useBudgetEntriesStore();
    const providersStore = useBudgetProvidersStore();

    isLoading.value = true;
    try {
      const dateKey = `budget:${date}`;
      const result = await getDixieController().getBackup({ id: dateKey }) as {
        data: {
          entries: any[];
          proveedores: any[];
          isDayClosed?: boolean;
          finishDayData?: any;
        };
      } | null;

      if (result && result.data) {
        const d = result.data;
        entriesStore.loadEntries(d.entries || []);
        providersStore.loadProviders(d.proveedores || []);
        finishDayData.value = d.finishDayData || {
          totalSalesEfectivo: 0,
          totalSalesTarjeta: 0,
          totalSalesCredito: 0,
          type: '%',
          margin: 0,
        };
        isDayClosed.value = !!d.isDayClosed;
      } else {
        entriesStore.clearEntries();
        providersStore.clearProviders();
        finishDayData.value = {
          totalSalesEfectivo: 0,
          totalSalesTarjeta: 0,
          totalSalesCredito: 0,
          type: '%',
          margin: 0,
        };
        isDayClosed.value = false;
      }
    } catch (e) {
      console.error('budgetDayStore.loadBudgetForDate error', e);
      entriesStore.clearEntries();
      providersStore.clearProviders();
    } finally {
      isLoading.value = false;
    }
  }

  async function saveBudgetData() {
    const entriesStore = useBudgetEntriesStore();
    const providersStore = useBudgetProvidersStore();

    const ctrl = getDixieController();
    const dateKey = `budget:${selectedDate.value}`;

    await ctrl.putEntry({
      entry: {
        id: dateKey,
        data: {
          entries: JSON.parse(JSON.stringify(entriesStore.entries)),
          proveedores: JSON.parse(JSON.stringify(providersStore.providers)),
          isDayClosed: isDayClosed.value,
          finishDayData: { ...finishDayData.value },
        },
      },
    });
  }

  return {
    selectedDate,
    isDayClosed,
    finishDayData,
    isLoading,
    frozenSnapshot,
    setSelectedDate,
    setIsLoading,
    setIsDayClosed,
    setFrozenSnapshot,
    setFinishDayData,
    loadBudgetForDate,
    saveBudgetData,
  };
});
