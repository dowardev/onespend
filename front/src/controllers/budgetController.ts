import { useBudgetStore } from '@/stores/budgetStore';
import type { Income, Provider } from '@/stores/budgetStore';

class BudgetController {
  getSelectedDate() {
    const store = useBudgetStore();
    return store.selectedDate;
  }

  getEntries() {
    const store = useBudgetStore();
    return store.entries;
  }

  getProviders() {
    const store = useBudgetStore();
    return store.providers;
  }

  getIsDayClosed() {
    const store = useBudgetStore();
    return store.isDayClosed;
  }

  getFinishDayData() {
    const store = useBudgetStore();
    return store.finishDayData;
  }

  getIngresos() {
    const store = useBudgetStore();
    return store.ingresos;
  }

  getEgresos() {
    const store = useBudgetStore();
    return store.egresos;
  }

  getTotalIngresos() {
    const store = useBudgetStore();
    return store.totalIngresos;
  }

  getTotalEgresos() {
    const store = useBudgetStore();
    return store.totalEgresos;
  }

  getNetTotal() {
    const store = useBudgetStore();
    return store.netTotal;
  }

  getTotalEfectivo() {
    const store = useBudgetStore();
    return store.totalEfectivo;
  }

  getTotalTarjeta() {
    const store = useBudgetStore();
    return store.totalTarjeta;
  }

  getTotalCredito() {
    const store = useBudgetStore();
    return store.totalCredito;
  }

  getTotalEstimacion() {
    const store = useBudgetStore();
    return store.totalEstimacion;
  }

  getFaltante() {
    const store = useBudgetStore();
    return store.faltante;
  }

  getIngresosEfectivo() {
    const store = useBudgetStore();
    return store.ingresosEfectivo;
  }

  getIngresosTarjeta() {
    const store = useBudgetStore();
    return store.ingresosTarjeta;
  }

  getEgresosEfectivo() {
    const store = useBudgetStore();
    return store.egresosEfectivo;
  }

  getEgresosTarjeta() {
    const store = useBudgetStore();
    return store.egresosTarjeta;
  }

  getProviderIdsWithEntries() {
    const store = useBudgetStore();
    return store.providerIdsWithEntries;
  }

  getIsLoading() {
    const store = useBudgetStore();
    return store.isLoading;
  }

  async loadDataForDate(date: string) {
    const store = useBudgetStore();
    await store.loadDataForDate(date);
  }

  setDate(date: string) {
    const store = useBudgetStore();
    store.setDate(date);
  }

  changeDate(days: number) {
    const store = useBudgetStore();
    store.changeDate(days);
  }

  addIngreso(params: {
    name?: string;
    amount?: number;
    paymentType?: 'cash' | 'digital';
    accountId?: string | number | null;
    groups?: Array<{ amount: number; accountId: string | number | null }>;
  }) {
    const store = useBudgetStore();
    store.addIngreso(params);
  }

  addEgreso(params: {
    name?: string;
    amount?: number;
    paymentType?: 'cash' | 'digital';
    accountId?: string | number | null;
    groups?: Array<{ amount: number; accountId: string | number | null }>;
  }) {
    const store = useBudgetStore();
    store.addEgreso(params);
  }

  addProviderEgresos(provider: Provider) {
    const store = useBudgetStore();
    store.addProviderEgresos(provider);
  }

  updateIngreso(id: string | number, changes: Partial<Income>) {
    const store = useBudgetStore();
    store.updateIngreso(id, changes);
  }

  removeIngreso(id: string | number) {
    const store = useBudgetStore();
    store.removeIngreso(id);
  }

  removeEgresosGroup(groupId: string | number) {
    const store = useBudgetStore();
    store.removeEgresosGroup(groupId);
  }

  addProvider(params: {
    name?: string;
    estimated?: number;
    dollar?: number;
    allowEmpty?: boolean;
  }) {
    const store = useBudgetStore();
    store.addProvider(params);
  }

  updateProvider(id: string | number, changes: Partial<Provider>) {
    const store = useBudgetStore();
    store.updateProvider(id, changes);
  }

  removeProvider(id: string | number) {
    const store = useBudgetStore();
    store.removeProvider(id);
  }

  clearDay() {
    const store = useBudgetStore();
    store.clearDay();
  }

  toggleDayClosed(value: boolean) {
    const store = useBudgetStore();
    store.toggleDayClosed(value);
  }

  saveData() {
    const store = useBudgetStore();
    store.saveData();
  }
}

const budgetController = new BudgetController();
export default budgetController;
export { BudgetController };
