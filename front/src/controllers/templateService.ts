import { formatLocalDate } from '@/utils/date';
import { TemplateRecord } from './TempalteController';

interface TemplateApplicationData {
  entries: Array<Record<string, unknown>>;
  ingresos: Array<Record<string, unknown>>;
  proveedores: Array<{ name: string; estimated: number }>;
  totals: {
    totalIngresos: number;
    totalProviders: number;
    totalVisitedProviders: number;
  };
  [key: string]: unknown;
}

interface TemplateApplicationPayload {
  component: string;
  data: TemplateApplicationData;
  createdAt: number;
}

export function parseProvidersFromDescription(params: { desc?: string | null }): string[] {
  const { desc } = params;
  const prefix = 'Proveedores:';
  if (!desc) return [];
  const i = desc.indexOf(prefix);
  if (i === -1) return [];
  const rest = desc.slice(i + prefix.length).trim();
  if (!rest) return [];
  return rest
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s);
}

export function buildPayloadFromTemplate(params: {
  tmpl: TemplateRecord;
  dateISO: string;
  resolveSupplierNameById?: (id: string | number) => string | null;
}) {
  const { tmpl, dateISO, resolveSupplierNameById } = params;
  let providerNames: string[] = [];
  if (tmpl && tmpl.suppliers && Array.isArray(tmpl.suppliers) && tmpl.suppliers.length) {
    const resolved: string[] = [];
    for (const id of tmpl.suppliers as Array<string | number>) {
      const n = resolveSupplierNameById ? resolveSupplierNameById(id) : null;
      if (n) resolved.push(n);
    }
    // If resolution via IDs produced no names, fall back to suppliersSnapshot when available
    if (
      resolved.length === 0 &&
      Array.isArray(tmpl.suppliersSnapshot) &&
      tmpl.suppliersSnapshot.length
    ) {
      for (const snap of tmpl.suppliersSnapshot) {
        if (snap && snap.name) resolved.push(snap.name);
      }
    }
    providerNames = resolved;
  } else {
    // Fallback: try suppliersSnapshot first, then parse description
    if (Array.isArray(tmpl?.suppliersSnapshot) && tmpl?.suppliersSnapshot.length) {
      providerNames = tmpl.suppliersSnapshot
        .map((s: { id: IDBValidKey; name?: string }) => s.name || '')
        .filter(Boolean);
    } else {
      providerNames = parseProvidersFromDescription({ desc: tmpl?.description });
    }
  }

  const proveedores = (providerNames || []).map((name) => ({
    id: Date.now() + Math.random(),
    name,
    date: formatLocalDate({ d: dateISO }),
    estimated: 0,
    accountId: 0,
    notes: '',
    visited: false,
  }));

  const payload = {
    ingresos: [],
    entries: [],
    proveedores,
    newIngreso: { name: '', amount: 0, date: formatLocalDate({ d: dateISO }) },
    newProveedor: { name: '', estimated: 0, accountId: 0, notes: '' },
    selectedDate: formatLocalDate({ d: dateISO }),
    totals: {
      totalIngresos: 0,
      totalProviders: proveedores.reduce((s, p) => s + Number(p.estimated || 0), 0),
      totalVisitedProviders: 0,
    },
  };

  return payload;
}

export function hasBackupMeaningfulContent(params: {
  data: Record<string, unknown> | null;
}): boolean {
  const { data } = params;
  try {
    if (!data) return false;
    if (Array.isArray(data.proveedores) && data.proveedores.length > 0) return true;
    if (data.totals) {
      const t = (data.totals as Record<string, number>) || {};
      if ((Number(t.totalProviders) || 0) > 0) return true;
      if ((Number(t.totalVisitedProviders) || 0) > 0) return true;
    }
    return false;
  } catch (_e) {
    return false;
  }
}

import backupController from '@/controllers/backupController';
import { mergeBackupData } from '@/controllers/migrationService';

export async function buildAndSaveTemplateApplication(params: {
  tmpl: TemplateRecord;
  dateISO: string;
  resolveSupplierNameById?: (id: string | number) => string | null;
  options?: {
    conflictStrategy?: 'ask' | 'combine' | 'overwrite';
    prebuiltPayload?: TemplateApplicationPayload;
  };
}) {
  const { tmpl, dateISO, resolveSupplierNameById, options } = params;
  const strategy = options?.conflictStrategy || 'ask';

  let payloadToSave: TemplateApplicationPayload;
  if (options && options.prebuiltPayload) {
    payloadToSave = options.prebuiltPayload;
  } else if (tmpl && tmpl.component && tmpl.data) {
    payloadToSave = tmpl as unknown as TemplateApplicationPayload;
  } else {
    const payload = buildPayloadFromTemplate({
      tmpl,
      dateISO,
      resolveSupplierNameById,
    });
    payloadToSave = {
      component: 'BudgetView',
      data: payload,
      createdAt: Date.now(),
    } as TemplateApplicationPayload;
  }

  // Check existing
  const existing = await backupController.getLatestBackupForDate(String(dateISO));
  if (
    existing &&
    existing.data &&
    hasBackupMeaningfulContent({ data: existing.data as Record<string, unknown> })
  ) {
    if (strategy === 'ask') {
      return { conflict: true, payloadToSave, existing };
    }

    if (strategy === 'combine') {
      const merged = mergeBackupData(existing.data || {}, payloadToSave.data);
      const savePayload = {
        component: 'BudgetView',
        data: merged,
        createdAt: Date.now(),
      };
      try {
        const clean = JSON.parse(JSON.stringify(savePayload));
        await backupController.saveBackup({ entry: clean });
        return { success: true, action: 'combined' };
      } catch (e) {
        await backupController.saveBackup({ entry: savePayload });
        return { success: true, action: 'combined' };
      }
    }

    if (strategy === 'overwrite') {
      const existingData = existing.data as TemplateApplicationData | null;
      const payloadData = payloadToSave.data as TemplateApplicationData;
      const existingIngresos = Array.isArray(existingData?.ingresos) ? existingData.ingresos : [];
      const finalData: TemplateApplicationData = Object.assign({}, payloadData, {
        ingresos: existingIngresos,
        entries: existingIngresos,
      });
      const existingTotals = existingData?.totals || {};
      finalData.totals = Object.assign({}, finalData.totals || {}, {
        totalIngresos: Number(existingTotals.totalIngresos || 0) || 0,
      });

      const savePayload = {
        component: 'BudgetView',
        data: finalData,
        createdAt: Date.now(),
      };
      try {
        const clean = JSON.parse(JSON.stringify(savePayload));
        await backupController.saveBackup({ entry: clean });
        return { success: true, action: 'overwritten' };
      } catch (e) {
        await backupController.saveBackup({ entry: savePayload });
        return { success: true, action: 'overwritten' };
      }
    }
  }

  // No conflict, save
  try {
    const clean = JSON.parse(JSON.stringify(payloadToSave));
    await backupController.saveBackup({ entry: clean });
    return { success: true, action: 'saved' };
  } catch (e) {
    await backupController.saveBackup({ entry: payloadToSave });
    return { success: true, action: 'saved' };
  }
}
