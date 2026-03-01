import { useBudgetStore, type Income, type Provider } from '@/stores/budgetStore';
import dixieController from '@/controllers/dixie';
import { formatLocalDate } from '@/utils/date';
import { useSync } from '@/composables/useSync';
import type { Supplier } from './suppliersController';

interface BudgetData {
  entries: Income[];
  proveedores: Provider[];
  finishDayData: {
    totalSalesEfectivo: number;
    totalSalesTarjeta: number;
    totalSalesCredito: number;
    type: 'fixed' | '%' | string;
    margin: number;
  };
}

function generateSyncId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

class BudgetController {
  private _store: ReturnType<typeof useBudgetStore> | null = null;
  private pendingTimeouts: Set<NodeJS.Timeout> | null = null;

  private get store(): ReturnType<typeof useBudgetStore> {
    if (!this._store) {
      this._store = useBudgetStore();
    }
    return this._store;
  }

  // Developer-only manual entries. Edit this map to add hardcoded entries that
  // should appear on reload during development. Keys are dates in YYYY-MM-DD.
  // WARNING: only used in dev builds.
  private DEV_MANUAL_ENTRIES: Record<string, Partial<BudgetData>> = {
    // Example: '2026-01-23': { entries: [ { id: 1, name: 'Entrada manual', amount: 200, date: '2026-01-23', paymentType: 'cash', entryType: 'ingreso', accountId: null, createdAt: Date.now() } ], proveedores: [] }
  };

  getSelectedDate() {
    return this.store.selectedDate;
  }

  getEntries() {
    return this.store.entries;
  }

  getProviders() {
    return this.store.providers;
  }

  // removed day-closed getters

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
      const data = (await dixieController.getBackup({ id: dateKey })) as unknown as { data: BudgetData } | null;
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
        try {
          // eslint-disable-next-line no-console
          console.log('[BudgetController.loadDataForDate] Store entries count after setEntries:', this.store.entries.length);
        } catch (e) {}
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
    date?: string;
  }) {
    const {
      name = '',
      amount = 0,
      paymentType = 'cash',
      accountId = null,
      groups = [],
      date,
    } = params;

    const finalDate = date || this.store.selectedDate;
    console.log('💰 budgetController.addIngreso - date received:', date, 'selectedDate:', this.store.selectedDate, 'finalDate:', finalDate);

    const newIngreso: Income = {
      id: Date.now() + Math.random(),
      sync_id: generateSyncId(),
      name,
      amount: Number(amount) || 0,
      date: finalDate,
      paymentType,
      entryType: 'ingreso',
      accountId,
      groups,
      createdAt: Date.now(),
    };

    // If date is different from selectedDate, save to the correct bucket
    if (date && date !== this.store.selectedDate) {
      console.log('💾 Saving entry to different date bucket:', date);
      this.saveEntryToDate(newIngreso, date);
    } else {
      this.store.addEntry(newIngreso);
      this.saveData();
    }
    
    const { syncEntry } = useSync();
    syncEntry({ entry: newIngreso, operation: 'create' });

    return newIngreso;
  }

  addEgreso(params: {
    name?: string;
    amount?: number;
    paymentType?: 'cash' | 'digital';
    accountId?: string | number | null;
    groups?: Array<{ amount: number; accountId: string | number | null }>;
    date?: string;
  }) {
    const {
      name = '',
      amount = 0,
      paymentType = 'cash',
      accountId = null,
      groups = [],
      date,
    } = params;

    const newEgreso: Income = {
      id: Date.now() + Math.random(),
      sync_id: generateSyncId(),
      name,
      amount: Number(amount) || 0,
      date: date || this.store.selectedDate,
      paymentType,
      entryType: 'egreso',
      accountId,
      groups,
      createdAt: Date.now(),
    };

    // If date is different from selectedDate, save to the correct bucket
    if (date && date !== this.store.selectedDate) {
      console.log('💾 Saving entry to different date bucket:', date);
      this.saveEntryToDate(newEgreso, date);
    } else {
      this.store.addEntry(newEgreso);
      this.saveData();
    }
    
    const { syncEntry } = useSync();
    syncEntry({ entry: newEgreso, operation: 'create' });

    return newEgreso;
  }

  addProviderEgresos(params: { provider: Provider }) {
    const { provider } = params;
    const now = Date.now();
    const amount = Number(provider.estimated || 0);

    if (amount <= 0) return;

    const newEntry: Income = {
      id: Date.now() + Math.random(),
      sync_id: generateSyncId(),
      name: provider.name,
      amount,
      date: this.store.selectedDate,
      paymentType: 'cash',
      entryType: 'egreso',
      createdAt: now,
      accountId: provider.accountId,
      supplierId: provider._supplierId || String(provider.id),
      supplierName: provider.name,
    };

    this.store.addEntry(newEntry);
    
    const { syncEntry } = useSync();
    syncEntry({ entry: newEntry, operation: 'create' });
  }

  updateIngreso(params: { id: string | number; changes: Partial<Income> }) {
    const { id, changes } = params;
    this.store.updateEntry(id, changes);
    
    const entry = this.store.entries.find(e => e.id === id);
    if (entry) {
      const { syncEntry } = useSync();
      syncEntry({ entry, operation: 'update' });
    }
  }

  removeIngreso(params: { id: string | number }) {
    const { id } = params;
    const entry = this.store.entries.find(e => e.id === id);
    this.store.removeEntry(id);
    
    if (entry) {
      const { syncEntry } = useSync();
      syncEntry({ entry, operation: 'delete' });
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
    _supplier?: Supplier;
    products?: Array<{ supplierProductId: string | number; productName: string; productPrice: number; quantity: number }>;
    items?: Array<{ amount: number; accountId: string | number | null }>;
  }) {
    const {
      name = '',
      estimated = 0,
      accountId = 0,
      allowEmpty = false,
      _supplierId,
      _supplierName,
      _supplier,
      products,
      items,
    } = params;
    if (!name && !allowEmpty) return;

    const localId = Date.now() + Math.random();
    
    const supplierSyncId = _supplierId as string | undefined;
    console.log('budgetController.addProvider - _supplierId:', _supplierId, 'supplierSyncId:', supplierSyncId);
    
    const newProvider: Provider = {
      id: localId,
      sync_id: generateSyncId(),
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
      items,
      _supplier: _supplier ? JSON.parse(JSON.stringify(_supplier)) : undefined,
    };

    this.store.addProvider(newProvider);
    
    const { syncBudgetProvider } = useSync();
    console.log('budgetController.addProvider - sincronizando provider con productos');
    syncBudgetProvider({ provider: newProvider, operation: 'create', products, supplierSyncId });

      const timeoutId = setTimeout(() => {
        const provider = this.store.providers.find(p => p.id === newProvider.id);
        if (provider) {
          this.updateProvider({ id: provider.id, changes: { _justAdded: false } });
        }
      }, 400);
      
      // Store timeout ID for potential cleanup
      if (!this.pendingTimeouts) {
        this.pendingTimeouts = new Set<NodeJS.Timeout>();
      }
      this.pendingTimeouts.add(timeoutId);
      setTimeout(() => {
        this.pendingTimeouts?.delete(timeoutId);
      }, 500);
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
      
      syncBudgetProvider({ provider: { ...provider, ...changes }, operation: 'update', products: productsToSync, supplierSyncId });
    }
  }

  removeProvider(params: { id: string | number }) {
    const { id } = params;
    const provider = this.store.providers.find(p => p.id === id);
    this.store.removeProvider(id);
    
    if (provider) {
      const { syncBudgetProvider } = useSync();
      syncBudgetProvider({ provider, operation: 'delete' });
    }
  }

  clearAllProviders() {
    this.store.setProviders([]);
  }

  clearDay() {
    this.store.clearDay();
  }

  // removed toggleDayClosed

  async saveData() {
    try {
      // Pinia/vue reactive proxies can serialize oddly with structuredClone.
      // Convert to plain JSON arrays/objects first to ensure proper persistence.
      const entriesData = Array.isArray(this.store.entries)
        ? JSON.parse(JSON.stringify(this.store.entries))
        : JSON.parse(JSON.stringify(Array.from(this.store.entries || [])));
      const providersData = Array.isArray(this.store.providers)
        ? JSON.parse(JSON.stringify(this.store.providers))
        : JSON.parse(JSON.stringify(Array.from(this.store.providers || [])));
      const finishDayDataPlain = JSON.parse(JSON.stringify({ ...this.store.finishDayData }));

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
      
      // Note: syncBudget removed - budget table no longer exists
      
      if (this.store.isDayClosed) {
        console.log('[BudgetController.saveData] Creando instantánea congelada...');
        this.createFrozenSnapshot();
      }
      
      console.log('[BudgetController.saveData] Proceso completado');
    } catch (e) {
      console.error('[BudgetController.saveData] Error:', e);
    }
  }

  // Save an entry to a specific date bucket (different from current selected date)
  private async saveEntryToDate(entry: Income, targetDate: string) {
    try {
      const dateKey = `budget:${targetDate}`;
      console.log('[BudgetController.saveEntryToDate] Saving to:', dateKey);
      
      // Convert entry to plain object to avoid Proxy serialization issues
      const plainEntry = JSON.parse(JSON.stringify(entry));
      
      // Load existing data for target date
      const existing = await dixieController.getEntry(dateKey);
      // Convert to plain objects to avoid Proxy issues
      const entries = existing?.data?.entries ? JSON.parse(JSON.stringify(existing.data.entries)) : [];
      const providers = existing?.data?.proveedores ? JSON.parse(JSON.stringify(existing.data.proveedores)) : [];
      const isDayClosed = existing?.data?.isDayClosed || false;
      const finishDayData = existing?.data?.finishDayData || {};
      
      // Add new entry
      entries.push(plainEntry);
      
      // Save updated data
      await dixieController.putEntry({
        entry: {
          id: dateKey,
          data: {
            entries,
            proveedores: providers,
            isDayClosed,
            finishDayData,
          },
        },
      });
      
      console.log('[BudgetController.saveEntryToDate] Entry saved to:', dateKey);
    } catch (e) {
      console.error('[BudgetController.saveEntryToDate] Error:', e);
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

  syncProvidersWithSuppliers(params: { suppliers: Array<Supplier> }) {
    const { suppliers } = params;
    return this.store.syncProvidersWithSuppliers(suppliers);
  }

  private toPlainObject(obj: unknown): unknown {
    try {
      return structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
    } catch {
      return {};
    }
  }

  // Cleanup method for timeouts
  cleanup() {
    if (this.pendingTimeouts) {
      this.pendingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      this.pendingTimeouts.clear();
    }
  }
}

const budgetController = new BudgetController();
export default budgetController;
export { BudgetController };
