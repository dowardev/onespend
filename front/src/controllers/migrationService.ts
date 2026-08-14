// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { formatLocalDate } from '@/utils/date';

export function normalizeDateIfNeeded(params: { val: unknown }): {
  value: unknown;
  changed: boolean;
} {
  const { val } = params;
  if (val == null) return { value: val, changed: false };
  try {
    const s = String(val);
    const normalized = formatLocalDate({ d: s });
    if (s === normalized) return { value: val, changed: false };
    return { value: normalized, changed: true };
  } catch {
    return { value: val, changed: false };
  }
}

export function normalizeEntryData(
  params?: { data: Record<string, unknown> } | Record<string, unknown> | null,
): {
  newData: Record<string, unknown> | unknown;
  changed: boolean;
} {
  // Be defensive: callers sometimes pass null/undefined (or a raw data object).
  // Accept either { data } or the data object directly.
  let data: unknown;
  if (params == null) data = params;
  else if (typeof params === 'object' && 'data' in params) data = (params as any).data;
  else data = params;

  if (!data || typeof data !== 'object') return { newData: data, changed: false };
  let changed = false;
  const clone = Object.assign({}, data) as Record<string, unknown>;

  if (clone.selectedDate != null) {
    const res = normalizeDateIfNeeded({ val: clone.selectedDate });
    if (res.changed) {
      clone.selectedDate = res.value;
      changed = true;
    }
  }

  const normArrayDates = (arr: Array<Record<string, unknown>>, key: string) => {
    if (!Array.isArray(arr)) return;
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (item && typeof item === 'object' && item[key] != null) {
        const r = normalizeDateIfNeeded({ val: item[key] });
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
    const proveedores = (clone.proveedores as Array<Record<string, unknown>>).slice();
    normArrayDates(proveedores, 'date');
    clone.proveedores = proveedores;
  }

  if (Array.isArray(clone.ingresos)) {
    const ingresos = (clone.ingresos as Array<Record<string, unknown>>).slice();
    normArrayDates(ingresos, 'date');
    clone.ingresos = ingresos;
  }

  if (clone.newIngreso && typeof clone.newIngreso === 'object') {
    const ni = Object.assign({}, clone.newIngreso) as Record<string, unknown>;
    const r = normalizeDateIfNeeded({ val: ni.date });
    if (r.changed) {
      ni.date = r.value;
      clone.newIngreso = ni;
      changed = true;
    }
  }

  if (clone.newProveedor && typeof clone.newProveedor === 'object') {
    const np = Object.assign({}, clone.newProveedor) as Record<string, unknown>;
    const r = normalizeDateIfNeeded({ val: np.date });
    if (r.changed) {
      np.date = r.value;
      clone.newProveedor = np;
      changed = true;
    }
  }

  return { newData: clone, changed };
}

export function mergeBackupData(params: {
  existingData: Record<string, unknown>;
  newData: Record<string, unknown>;
}) {
  const { existingData, newData } = params;
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
  const incomingProveedores = Array.isArray(newData?.proveedores) ? newData.proveedores : [];

  const mergedIngresos = existingIngresos.slice();
  for (const ni of incomingIngresos) {
    const exists = mergedIngresos.some(
      (ei: Record<string, unknown>) =>
        String(ei.name || '').trim() === String(ni.name || '').trim(),
    );
    if (!exists) mergedIngresos.push(ni);
  }

  const mergedProveedores = existingProveedores.slice();
  for (const np of incomingProveedores) {
    const exists = mergedProveedores.some(
      (ep: Record<string, unknown>) =>
        String(ep.name || '').trim() === String(np.name || '').trim(),
    );
    if (!exists) mergedProveedores.push(np);
  }

  const totalProviders = mergedProveedores.reduce((s: number, p: Record<string, unknown>) => {
    return s + (Number(p.accountId || 0) || Number(p.estimated || 0) || 0);
  }, 0);

  const merged = Object.assign({}, existingData || {}, {
    ingresos: mergedIngresos,
    entries: mergedIngresos,
    proveedores: mergedProveedores,
    totals: Object.assign({}, existingData?.totals || {}, {
      totalIngresos: (mergedIngresos || []).reduce(
        (s: number, i: Record<string, unknown>) => s + (Number(i.amount || 0) || 0),
        0,
      ),
      totalProviders,
      totalVisitedProviders: (mergedProveedores || []).reduce(
        (s: number, p: Record<string, unknown>) =>
          s + (p.visited ? Number(p.accountId || 0) || Number(p.estimated || 0) || 0 : 0),
        0,
      ),
    }),
    selectedDate: newData?.selectedDate ?? existingData?.selectedDate,
  });

  return merged;
}
