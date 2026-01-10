import { useBudgetStore, type Income, type Provider } from '@/stores/budgetStore';
import dixieController from '@/controllers/dixie';
import { formatLocalDate } from '@/utils/date';

class BudgetController {
  private _store: ReturnType<typeof useBudgetStore> | null = null;

  private get store(): ReturnType<typeof useBudgetStore> {
    if (!this._store) {
      this._store = useBudgetStore();
    }
    return this._store;
  }

  getSelectedDate() {
    return this.store.selectedDate;
  }

  getEntries() {
    return this.store.entries;
  }

  getProviders() {
    return this.store.providers;
  }

  getIsDayClosed() {
    return this.store.isDayClosed;
  }

  getFinishDayData() {
    return this.store.finishDayData;
  }

  getIngresos() {
    return this.store.ingresos;
  }

  getEgresos() {
    return this.store.egresos;
  }

  getTotalIngresos() {
    return this.store.totalIngresos;
  }

  getTotalEgresos() {
    return this.store.totalEgresos;
  }

  getNetTotal() {
    return this.store.netTotal;
  }

  getTotalEfectivo() {
    return this.store.totalEfectivo;
  }

  getTotalTarjeta() {
    return this.store.totalTarjeta;
  }

  getTotalCredito() {
    return this.store.totalCredito;
  }

  getTotalEstimacion() {
    return this.store.totalEstimacion;
  }

  getFaltante() {
    return this.store.faltante;
  }

  getIngresosEfectivo() {
    return this.store.ingresosEfectivo;
  }

  getIngresosTarjeta() {
    return this.store.ingresosTarjeta;
  }

  getEgresosEfectivo() {
    return this.store.egresosEfectivo;
  }

  getEgresosTarjeta() {
    return this.store.egresosTarjeta;
  }

  getProviderIdsWithEntries() {
    return this.store.providerIdsWithEntries;
  }

  getIsLoading() {
    return this.store.isLoading;
  }

  async loadDataForDate(date: string) {
    this.store.setIsLoading(true);
    try {
      const dateKey = `budget:${date}`;
      console.log('[BudgetController.loadDataForDate] Loading data for:', dateKey);
      const data = (await dixieController.getBackup(dateKey)) as any;
      console.log('[BudgetController.loadDataForDate] Raw data from DB:', data);

      if (data && data.data) {
        const d = data.data;
        console.log('[BudgetController.loadDataForDate] Parsed data:', {
          entriesCount: d.entries?.length || 0,
          providersCount: d.proveedores?.length || 0,
          entries: d.entries,
          providers: d.proveedores,
        });
        this.store.setEntries(d.entries || []);
        this.store.setProviders(d.proveedores || []);
        this.store.setFinishDayData(d.finishDayData || {
          totalSalesEfectivo: 0,
          totalSalesTarjeta: 0,
          totalSalesCredito: 0,
          type: '%',
          margin: 0,
        });
        this.store.setIsDayClosed(!!d.isDayClosed);
      } else {
        console.log('[BudgetController.loadDataForDate] No data found, clearing store');
        this.store.clearAll();
      }
    } catch (e) {
      console.error('loadDataForDate error', e);
      this.store.clearAll();
    } finally {
      this.store.setIsLoading(false);
    }
  }

  async loadDataForCurrentDate() {
    await this.loadDataForDate(this.store.selectedDate);
  }

  setDate(date: string) {
    if (date === this.store.selectedDate) return;
    this.store.setSelectedDate(date);
    this.loadDataForDate(date);
  }

  changeDate(days: number) {
    const d = new Date(this.store.selectedDate);
    d.setDate(d.getDate() + days);
    this.setDate(formatLocalDate(d));
  }

  addIngreso(params: {
    name?: string;
    amount?: number;
    paymentType?: 'cash' | 'digital';
    accountId?: string | number | null;
    groups?: Array<{ amount: number; accountId: string | number | null }>;
  }) {
    const {
      name = '',
      amount = 0,
      paymentType = 'cash',
      accountId = null,
      groups = [],
    } = params;

    const newIngreso: Income = {
      id: Date.now() + Math.random(),
      name,
      amount: Number(amount) || 0,
      date: this.store.selectedDate,
      paymentType,
      entryType: 'ingreso',
      accountId,
      groups,
      createdAt: Date.now(),
    };

    this.store.addEntry(newIngreso);
  }

  addEgreso(params: {
    name?: string;
    amount?: number;
    paymentType?: 'cash' | 'digital';
    accountId?: string | number | null;
    groups?: Array<{ amount: number; accountId: string | number | null }>;
  }) {
    const {
      name = '',
      amount = 0,
      paymentType = 'cash',
      accountId = null,
      groups = [],
    } = params;

    const newEgreso: Income = {
      id: Date.now() + Math.random(),
      name,
      amount: Number(amount) || 0,
      date: this.store.selectedDate,
      paymentType,
      entryType: 'egreso',
      accountId,
      groups,
      createdAt: Date.now(),
    };

    this.store.addEntry(newEgreso);
  }

  addProviderEgresos(provider: Provider) {
    const now = Date.now();
    const amount = Number(provider.estimated || 0);

    if (amount <= 0) return;

    const newEntry: Income = {
      id: Date.now() + Math.random(),
      name: provider.name,
      amount,
      date: this.store.selectedDate,
      paymentType: 'cash',
      entryType: 'egreso',
      createdAt: now,
      accountId: provider.accountId,
      _providerName: provider.name,
      _fromProviderGroupId: `prov-${provider.id}-${Date.now()}`,
    };

    this.store.addEntry(newEntry);
  }

  updateIngreso(id: string | number, changes: Partial<Income>) {
    this.store.updateEntry(id, changes);
  }

  removeIngreso(id: string | number) {
    this.store.removeEntry(id);
  }

  removeEgresosGroup(groupId: string | number) {
    this.store.removeEgresosGroup(groupId);
  }

  addProvider(params: {
    name?: string;
    estimated?: number;
    accountId?: number;
    allowEmpty?: boolean;
    _supplierId?: string | number;
    _supplierName?: string;
  }) {
    const {
      name = '',
      estimated = 0,
      accountId = 0,
      allowEmpty = false,
      _supplierId,
      _supplierName,
    } = params;
    if (!name && !allowEmpty) return;

    const newProvider: Provider = {
      id: Date.now() + Math.random(),
      name,
      date: this.store.selectedDate,
      estimated: Number(estimated) || 0,
      accountId: Number(accountId) || 0,
      efectivo: 0,
      tarjeta: 0,
      credito: 0,
      notes: '',
      visited: false,
      _justAdded: true,
      _supplierId,
      _supplierName,
    };

    this.store.addProvider(newProvider);

    setTimeout(() => {
      const provider = this.store.providers.find(p => p.id === newProvider.id);
      if (provider) {
        this.store.updateProvider(provider.id, { _justAdded: false });
      }
    }, 400);
  }

  updateProvider(id: string | number, changes: Partial<Provider>) {
    this.store.updateProvider(id, changes);
  }

  removeProvider(id: string | number) {
    this.store.removeProvider(id);
  }

  clearAllProviders() {
    this.store.setProviders([]);
  }

  clearDay() {
    this.store.clearDay();
  }

  toggleDayClosed(value: boolean) {
    this.store.setIsDayClosed(value);
  }

  async saveData() {
    try {
      const entriesData = this.toPlainObject(this.store.entries);
      const providersData = this.toPlainObject(this.store.providers);
      const finishDayDataPlain = this.toPlainObject({ ...this.store.finishDayData });

      const dateKey = `budget:${this.store.selectedDate}`;
      console.log('[BudgetController.saveData] Saving data:', {
        dateKey,
        entriesCount: entriesData.length,
        providersCount: providersData.length,
        entries: entriesData,
        providers: providersData,
      });
      await dixieController.putEntry({
        entry: {
          id: dateKey,
          data: {
            entries: entriesData,
            proveedores: providersData,
            isDayClosed: this.store.isDayClosed,
            finishDayData: finishDayDataPlain,
          },
        },
      });
      console.log('[BudgetController.saveData] Data saved successfully');
    } catch (e) {
      console.error('saveData error', e);
    }
  }

  private toPlainObject(obj: any): any {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      return {};
    }
  }
}

const budgetController = new BudgetController();
export default budgetController;
export { BudgetController };
