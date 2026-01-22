import { useBudgetStore, type Income, type Provider } from '@/stores/budgetStore';
import dixieController from '@/controllers/dixie';
import { formatLocalDate } from '@/utils/date';
import { useSync } from '@/composables/useSync';

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

  async loadDataForDate(params: { date: string }) {
    const { date } = params;
    this.store.setIsLoading(true);
    try {
      const dateKey = `budget:${date}`;
      console.log('[BudgetController.loadDataForDate] Loading data for:', dateKey);
      const data = (await dixieController.getBackup({ id: dateKey })) as any;
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
    await this.loadDataForDate({ date: this.store.selectedDate });
  }

  setDate(params: { date: string }) {
    const { date } = params;
    if (date === this.store.selectedDate) return;
    this.store.setSelectedDate(date);
    this.loadDataForDate({ date });
  }

  changeDate(params: { days: number }) {
    const { days } = params;
    const d = new Date(this.store.selectedDate);
    d.setDate(d.getDate() + days);
    this.setDate({ date: formatLocalDate({ d }) });
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
      sync_id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    
    const { syncEntry } = useSync();
    syncEntry(newIngreso, 'create');
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
      sync_id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    
    const { syncEntry } = useSync();
    syncEntry(newEgreso, 'create');
  }

  addProviderEgresos(params: { provider: Provider }) {
    const { provider } = params;
    const now = Date.now();
    const amount = Number(provider.estimated || 0);

    if (amount <= 0) return;

    const newEntry: Income = {
      id: Date.now() + Math.random(),
      sync_id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    
    const { syncEntry } = useSync();
    syncEntry(newEntry, 'create');
  }

  updateIngreso(params: { id: string | number; changes: Partial<Income> }) {
    const { id, changes } = params;
    this.store.updateEntry(id, changes);
    
    const entry = this.store.entries.find(e => e.id === id);
    if (entry) {
      const { syncEntry } = useSync();
      syncEntry(entry, 'update');
    }
  }

  removeIngreso(params: { id: string | number }) {
    const { id } = params;
    const entry = this.store.entries.find(e => e.id === id);
    this.store.removeEntry(id);
    
    if (entry) {
      const { syncEntry } = useSync();
      syncEntry(entry, 'delete');
    }
  }

  removeEgresosGroup(params: { groupId: string | number }) {
    const { groupId } = params;
    this.store.removeEgresosGroup(groupId);
  }

  addProvider(params: {
    name?: string;
    estimated?: number;
    accountId?: number;
    allowEmpty?: boolean;
    _supplierId?: string | number;
    _supplierName?: string;
    products?: Array<{ supplierProductId: string | number; productName: string; productPrice: number; quantity: number }>;
  }) {
    const {
      name = '',
      estimated = 0,
      accountId = 0,
      allowEmpty = false,
      _supplierId,
      _supplierName,
      products,
    } = params;
    if (!name && !allowEmpty) return;

    const localId = Date.now() + Math.random();
    
    const supplierSyncId = _supplierId as string | undefined;
    console.log('budgetController.addProvider - _supplierId:', _supplierId, 'supplierSyncId:', supplierSyncId);
    
    const newProvider: Provider = {
      id: localId,
      sync_id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
      _supplierId: supplierSyncId,
      _supplierName,
      _pendingProducts: products,
      products,
    };

    this.store.addProvider(newProvider);
    
    const { syncBudgetProvider } = useSync();
    console.log('budgetController.addProvider - sincronizando provider con productos');
    syncBudgetProvider(newProvider, 'create', products, supplierSyncId);

      setTimeout(() => {
        const provider = this.store.providers.find(p => p.id === newProvider.id);
        if (provider) {
          this.updateProvider({ id: provider.id, changes: { _justAdded: false } });
        }
      }, 400);
  }

  updateProvider(params: { id: string | number; changes: Partial<Provider> }) {
    const { id, changes } = params;
    console.log('budgetController.updateProvider - id:', id, 'changes:', JSON.stringify(changes, null, 2));
    
    const provider = this.store.providers.find(p => p.id === id);
    const productsToSync = changes.products || (provider?.products || []);
    const supplierSyncId = (provider?._supplierId || changes._supplierId) as string | undefined;
    
    this.store.updateProvider(id, changes);
    
    if (provider) {
      const { syncBudgetProvider } = useSync();
      
      syncBudgetProvider({ ...provider, ...changes }, 'update', productsToSync, supplierSyncId);
    }
  }

  removeProvider(params: { id: string | number }) {
    const { id } = params;
    const provider = this.store.providers.find(p => p.id === id);
    this.store.removeProvider(id);
    
    if (provider) {
      const { syncBudgetProvider } = useSync();
      syncBudgetProvider(provider, 'delete');
    }
  }

  clearAllProviders() {
    this.store.setProviders([]);
  }

  clearDay() {
    this.store.clearDay();
  }

  toggleDayClosed(params: { value: boolean }) {
    const { value } = params;
    this.store.setIsDayClosed(value);
  }

  async saveData() {
    try {
      const entriesData = this.toPlainObject(this.store.entries);
      const providersData = this.toPlainObject(this.store.providers);
      const finishDayDataPlain = this.toPlainObject({ ...this.store.finishDayData });

      const dateKey = `budget:${this.store.selectedDate}`;
      console.log('[BudgetController.saveData] Guardando datos...', {
        dateKey,
        isDayClosed: this.store.isDayClosed,
        finishDayData: finishDayDataPlain,
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
      
      console.log('[BudgetController.saveData] Datos guardados correctamente');
      
      const { syncBudget } = useSync();
      syncBudget({
        id: dateKey,
        date: this.store.selectedDate,
        isDayClosed: this.store.isDayClosed,
        finishDayData: finishDayDataPlain,
      }, this.store.isDayClosed ? 'update' : 'update');
      
      if (this.store.isDayClosed) {
        console.log('[BudgetController.saveData] Creando instantánea congelada...');
        this.createFrozenSnapshot();
      }
      
      console.log('[BudgetController.saveData] Proceso completado');
    } catch (e) {
      console.error('[BudgetController.saveData] Error:', e);
    }
  }

  private createFrozenSnapshot() {
    const snapshot = {
      entries: this.toPlainObject(this.store.entries),
      providers: this.toPlainObject(this.store.providers),
      finishDayData: this.toPlainObject({ ...this.store.finishDayData }),
      timestamp: Date.now(),
    };
    
    this.store.setFrozenSnapshot(snapshot);
  }

  getFrozenSnapshot() {
    return this.store.frozenSnapshot;
  }

  syncProvidersWithSuppliers(params: { suppliers: any[] }) {
    const { suppliers } = params;
    return this.store.syncProvidersWithSuppliers(suppliers);
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
