import { formatLocalDate } from '@/utils/date';

export function normalizeDateIfNeeded(val: any): {
  value: any;
  changed: boolean;
} {
  if (val == null) return { value: val, changed: false };
  try {
    const s = String(val);
    const normalized = formatLocalDate(s);
    if (s === normalized) return { value: val, changed: false };
    return { value: normalized, changed: true };
  } catch (e) {
    return { value: val, changed: false };
  }
}

export function normalizeEntryData(data: any): {
  newData: any;
  changed: boolean;
} {
  if (!data || typeof data !== 'object')
    return { newData: data, changed: false };
  let changed = false;
  const clone = Object.assign({}, data);

  if (clone.selectedDate != null) {
    const res = normalizeDateIfNeeded(clone.selectedDate);
    if (res.changed) {
      clone.selectedDate = res.value;
      changed = true;
    }
  }

  const normArrayDates = (arr: any, key: string) => {
    if (!Array.isArray(arr)) return;
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (item && typeof item === 'object' && item[key] != null) {
        const r = normalizeDateIfNeeded(item[key]);
        if (r.changed) {
          const newItem = Object.assign({}, item);
          newItem[key] = r.value;
          arr[i] = newItem;
          changed = true;
        }
      }
    }
  };

  if (Array.isArray(clone.proveedores)) {
    clone.proveedores = clone.proveedores.slice();
    normArrayDates(clone.proveedores, 'date');
  }

  if (Array.isArray(clone.ingresos)) {
    clone.ingresos = clone.ingresos.slice();
    normArrayDates(clone.ingresos, 'date');
  }

  if (clone.newIngreso && typeof clone.newIngreso === 'object') {
    const ni = Object.assign({}, clone.newIngreso);
    const r = normalizeDateIfNeeded(ni.date);
    if (r.changed) {
      ni.date = r.value;
      clone.newIngreso = ni;
      changed = true;
    }
  }

  if (clone.newProveedor && typeof clone.newProveedor === 'object') {
    const np = Object.assign({}, clone.newProveedor);
    const r = normalizeDateIfNeeded(np.date);
    if (r.changed) {
      np.date = r.value;
      clone.newProveedor = np;
      changed = true;
    }
  }

  return { newData: clone, changed };
}

export function mergeBackupData(existingData: any, newData: any) {
  // Merge ingresos and proveedores arrays, avoiding duplicates by name
  const existingIngresos = Array.isArray(existingData?.ingresos)
    ? existingData.ingresos
    : Array.isArray(existingData?.entries)
      ? existingData.entries
      : [];
  const existingProveedores = Array.isArray(existingData?.proveedores)
    ? existingData.proveedores
    : [];

  const incomingIngresos = Array.isArray(newData?.ingresos)
    ? newData.ingresos
    : Array.isArray(newData?.entries)
      ? newData.entries
      : [];
  const incomingProveedores = Array.isArray(newData?.proveedores)
    ? newData.proveedores
    : [];

  const mergedIngresos = existingIngresos.slice();
  for (const ni of incomingIngresos) {
    const exists = mergedIngresos.some(
      (ei: any) => String(ei.name || '').trim() === String(ni.name || '').trim()
    );
    if (!exists) mergedIngresos.push(ni);
  }

  const mergedProveedores = existingProveedores.slice();
  for (const np of incomingProveedores) {
    const exists = mergedProveedores.some(
      (ep: any) => String(ep.name || '').trim() === String(np.name || '').trim()
    );
    if (!exists) mergedProveedores.push(np);
  }

  const totalProviders = mergedProveedores.reduce((s: number, p: any) => {
    return s + (Number(p.accountId || 0) || Number(p.estimated || 0) || 0);
  }, 0);

  const merged = Object.assign({}, existingData || {}, {
    ingresos: mergedIngresos,
    entries: mergedIngresos,
    proveedores: mergedProveedores,
    totals: Object.assign({}, existingData?.totals || {}, {
      totalIngresos: (mergedIngresos || []).reduce(
        (s: number, i: any) => s + (Number(i.amount || 0) || 0),
        0
      ),
      totalProviders,
      totalVisitedProviders: (mergedProveedores || []).reduce(
        (s: number, p: any) =>
          s +
          (p.visited
            ? Number(p.accountId || 0) || Number(p.estimated || 0) || 0
            : 0),
        0
      ),
    }),
    selectedDate: newData?.selectedDate ?? existingData?.selectedDate,
  });

  return merged;
}
