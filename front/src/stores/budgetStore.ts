import { defineStore } from 'pinia';
import { ref, computed, reactive, watch } from 'vue';
import dixieController from '@/controllers/dixie';
import { formatLocalDate } from '@/utils/date';

export type PaymentType = 'cash' | 'digital';
export type EntryType = 'ingreso' | 'egreso';

export interface Income {
  id: string | number;
  name: string;
  amount: number;
  date: string;
  paymentType: PaymentType;
  entryType: EntryType;
  accountId?: string | number | null;
  groups?: Array<{ amount: number; accountId: string | number | null }>;
  createdAt: number;
  _fromProviderGroupId?: string;
  _providerName?: string;
}

export interface Provider {
  id: string | number;
  name: string;
  date: string;
  estimated: number;
  dollar: number;
  efectivo: number;
  tarjeta: number;
  credito: number;
  notes: string;
  visited: boolean;
  _justAdded?: boolean;
  _fromTemplate?: boolean;
  _supplierKey?: string;
}

export const useBudgetStore = defineStore('budget', () => {
  const selectedDate = ref(formatLocalDate(new Date()));

  const entries = reactive<Income[]>([]);
  const providers = reactive<Provider[]>([]);
  const isDayClosed = ref(false);
  const finishDayData = reactive({
    totalSalesEfectivo: 0,
    totalSalesTarjeta: 0,
    totalSalesCredito: 0,
    type: '%',
    margin: 0,
  });

  const isLoading = ref(false);

  const ingresos = computed(() =>
    entries.filter(e => e.entryType === 'ingreso')
  );

  const egresos = computed(() => entries.filter(e => e.entryType === 'egreso'));

  const totalIngresos = computed(() =>
    ingresos.value.reduce((s, i) => s + Number(i.amount || 0), 0)
  );

  const totalEgresos = computed(() =>
    egresos.value.reduce((s, i) => s + Number(i.amount || 0), 0)
  );

  const netTotal = computed(() =>
    entries.reduce(
      (s, i) =>
        s +
        (i.entryType === 'egreso'
          ? -Number(i.amount || 0)
          : Number(i.amount || 0)),
      0
    )
  );

  const totalEfectivo = computed(() =>
    providers.reduce((s, p) => s + Number(p.efectivo || 0), 0)
  );

  const totalTarjeta = computed(() =>
    providers.reduce((s, p) => s + Number(p.tarjeta || 0), 0)
  );

  const totalCredito = computed(() =>
    providers.reduce((s, p) => s + Number(p.credito || 0), 0)
  );

  const totalEstimacion = computed(() =>
    providers.reduce(
      (s, p) => s + Number(p.efectivo || 0) + Number(p.tarjeta || 0),
      0
    )
  );

  const faltante = computed(() => netTotal.value - totalEstimacion.value);

  const ingresosEfectivo = computed(() =>
    entries.reduce(
      (s, i) =>
        s +
        (i.paymentType === 'cash' && i.entryType === 'ingreso'
          ? Number(i.amount || 0)
          : 0),
      0
    )
  );

  const ingresosTarjeta = computed(() =>
    entries.reduce(
      (s, i) =>
        s +
        (i.paymentType === 'digital' && i.entryType === 'ingreso'
          ? Number(i.amount || 0)
          : 0),
      0
    )
  );

  const egresosEfectivo = computed(() =>
    entries.reduce(
      (s, i) =>
        s +
        (i.paymentType === 'cash' && i.entryType === 'egreso'
          ? Number(i.amount || 0)
          : 0),
      0
    )
  );

  const egresosTarjeta = computed(() =>
    entries.reduce(
      (s, i) =>
        s +
        (i.paymentType === 'digital' && i.entryType === 'egreso'
          ? Number(i.amount || 0)
          : 0),
      0
    )
  );

  const providerIdsWithEntries = computed(() => {
    const ids = new Set<string | number>();
    for (const entry of entries) {
      if (entry._fromProviderGroupId) {
        const match = String(entry._fromProviderGroupId).match(
          /^prov-([^ -]+)/
        );
        if (match) {
          const pid = match[1];
          ids.add(isNaN(Number(pid)) ? pid : Number(pid));
        }
      }
    }
    return ids;
  });

  async function loadDataForDate(date: string) {
    if (isLoading.value) return;
    isLoading.value = true;

    try {
      const dateKey = `budget:${date}`;
      const data = (await dixieController.getBackup(dateKey)) as any;

      if (data && data.data) {
        const d = data.data;
        if (d.entries) {
          entries.splice(0, entries.length, ...(d.entries || []));
        } else {
          entries.splice(0, entries.length);
        }

        if (d.proveedores) {
          providers.splice(0, providers.length, ...(d.proveedores || []));
        } else {
          providers.splice(0, providers.length);
        }

        if (d.finishDayData) {
          Object.assign(finishDayData, d.finishDayData);
        } else {
          finishDayData.totalSalesEfectivo = 0;
          finishDayData.totalSalesTarjeta = 0;
          finishDayData.totalSalesCredito = 0;
          finishDayData.type = '%';
          finishDayData.margin = 0;
        }

        isDayClosed.value = !!d.isDayClosed;
      } else {
        entries.splice(0, entries.length);
        providers.splice(0, providers.length);
        isDayClosed.value = false;
      }
    } catch (e) {
      console.error('loadDataForDate error', e);
      entries.splice(0, entries.length);
      providers.splice(0, providers.length);
      isDayClosed.value = false;
    } finally {
      isLoading.value = false;
    }
  }

  let saveTimeout: any = null;

  function toPlainObject(obj: any): any {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      return {};
    }
  }

  async function saveData() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        const entriesData = toPlainObject([...entries]);
        const providersData = toPlainObject([...providers]);
        const finishDayDataPlain = toPlainObject({ ...finishDayData });

        const dateKey = `budget:${selectedDate.value}`;
        await dixieController.putEntry({
          entry: {
            id: dateKey,
            data: {
              entries: entriesData,
              proveedores: providersData,
              isDayClosed: isDayClosed.value,
              finishDayData: finishDayDataPlain,
            },
          },
        });
      } catch (e) {
        console.error('saveData error', e);
      }
    }, 500);
  }

  function setDate(date: string) {
    if (date === selectedDate.value) return;
    selectedDate.value = date;
    loadDataForDate(date);
  }

  function changeDate(days: number) {
    const d = new Date(selectedDate.value);
    d.setDate(d.getDate() + days);
    setDate(formatLocalDate(d));
  }

  function addIngreso(
    params: {
      name?: string;
      amount?: number;
      paymentType?: PaymentType;
      accountId?: string | number | null;
      groups?: Array<{ amount: number; accountId: string | number | null }>;
    } = {}
  ) {
    const {
      name = '',
      amount = 0,
      paymentType = 'cash',
      accountId = null,
      groups = [],
    } = params;
    entries.push({
      id: Date.now() + Math.random(),
      name,
      amount: Number(amount) || 0,
      date: selectedDate.value,
      paymentType,
      entryType: 'ingreso',
      accountId,
      groups,
      createdAt: Date.now(),
    });
  }

  function addEgreso(
    params: {
      name?: string;
      amount?: number;
      paymentType?: PaymentType;
      accountId?: string | number | null;
      groups?: Array<{ amount: number; accountId: string | number | null }>;
    } = {}
  ) {
    const {
      name = '',
      amount = 0,
      paymentType = 'cash',
      accountId = null,
      groups = [],
    } = params;
    entries.push({
      id: Date.now() + Math.random(),
      name,
      amount: Number(amount) || 0,
      date: selectedDate.value,
      paymentType,
      entryType: 'egreso',
      accountId,
      groups,
      createdAt: Date.now(),
    });
  }

  function addProviderEgresos(provider: Provider) {
    const toAdd: Income[] = [];
    const now = Date.now();

    const pushIf = (
      amount: number,
      label: string,
      paymentType: PaymentType
    ) => {
      const v = Number(amount || 0);
      if (v > 0) {
        toAdd.push({
          id: Date.now() + Math.random(),
          name: `${provider.name}${label ? ' - ' + label : ''}`,
          amount: v,
          date: selectedDate.value,
          paymentType,
          entryType: 'egreso',
          createdAt: now,
        });
      }
    };

    pushIf(provider.efectivo, 'efectivo', 'cash');
    pushIf(provider.tarjeta, 'tarjeta', 'digital');
    pushIf(provider.credito, 'credito', 'cash');

    if (toAdd.length) {
      const groupId = `prov-${provider.id}-${Date.now()}`;
      toAdd.forEach(t => {
        t._fromProviderGroupId = groupId;
        t._providerName = provider.name;
      });
      entries.push(...toAdd);
    }
  }

  function updateIngreso(id: string | number, changes: Partial<Income>) {
    const idx = entries.findIndex(e => e.id === id);
    if (idx === -1) return;

    const updated = { ...entries[idx], ...changes };
    entries.splice(idx, 1, updated);
  }

  function removeIngreso(id: string | number) {
    const idx = entries.findIndex(e => e.id === id);
    if (idx >= 0) entries.splice(idx, 1);
  }

  function removeEgresosGroup(groupId: string | number) {
    for (let i = entries.length - 1; i >= 0; i--) {
      const it = entries[i];
      if (it._fromProviderGroupId === groupId) {
        entries.splice(i, 1);
      }
    }
  }

  function addProvider(
    params: {
      name?: string;
      estimated?: number;
      dollar?: number;
      allowEmpty?: boolean;
    } = {}
  ) {
    const { name = '', estimated = 0, dollar = 0, allowEmpty = false } = params;
    if (!name && !allowEmpty) return;

    const newProvider: Provider = {
      id: Date.now() + Math.random(),
      name,
      date: selectedDate.value,
      estimated: Number(estimated) || 0,
      dollar: Number(dollar) || 0,
      efectivo: 0,
      tarjeta: 0,
      credito: 0,
      notes: '',
      visited: false,
      _justAdded: true,
    };

    providers.push(newProvider);
    setTimeout(() => (newProvider._justAdded = false), 400);
  }

  function updateProvider(id: string | number, changes: Partial<Provider>) {
    const provider = providers.find(p => p.id === id);
    if (!provider) return;

    const numericFields = [
      'estimated',
      'dollar',
      'efectivo',
      'tarjeta',
      'credito',
    ];
    for (const field of numericFields) {
      if (changes[field as keyof Provider] !== undefined) {
        (provider as any)[field] =
          Number(changes[field as keyof Provider]) || 0;
      }
    }

    if (changes.name !== undefined) provider.name = String(changes.name);
    if (changes.notes !== undefined) provider.notes = String(changes.notes);
    if (changes.visited !== undefined) provider.visited = !!changes.visited;
  }

  function removeProvider(id: string | number) {
    const idx = providers.findIndex(p => p.id === id);
    if (idx >= 0) providers.splice(idx, 1);
  }

  function clearDay() {
    entries.splice(0, entries.length);
    providers.splice(0, providers.length);
    isDayClosed.value = false;
  }

  function toggleDayClosed(value: boolean) {
    isDayClosed.value = value;
  }

  watch(
    [entries, providers, isDayClosed, finishDayData],
    () => {
      if (!isLoading.value) {
        saveData();
      }
    },
    { deep: true }
  );

  loadDataForDate(selectedDate.value);

  return {
    selectedDate,
    entries,
    providers,
    isDayClosed,
    finishDayData,
    isLoading,
    ingresos,
    egresos,
    totalIngresos,
    totalEgresos,
    netTotal,
    totalEfectivo,
    totalTarjeta,
    totalCredito,
    totalEstimacion,
    faltante,
    ingresosEfectivo,
    ingresosTarjeta,
    egresosEfectivo,
    egresosTarjeta,
    providerIdsWithEntries,
    loadDataForDate,
    setDate,
    changeDate,
    addIngreso,
    addEgreso,
    addProviderEgresos,
    updateIngreso,
    removeIngreso,
    removeEgresosGroup,
    addProvider,
    updateProvider,
    removeProvider,
    clearDay,
    toggleDayClosed,
    saveData,
  };
});
