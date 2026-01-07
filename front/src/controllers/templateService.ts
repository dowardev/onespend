import { formatLocalDate } from '@/utils/date';

export function parseProvidersFromDescription(desc?: string): string[] {
  if (!desc) return [];
  const prefix = 'Proveedores:';
  const i = desc.indexOf(prefix);
  if (i === -1) return [];
  const rest = desc.slice(i + prefix.length).trim();
  if (!rest) return [];
  return rest
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s);
}

export function buildPayloadFromTemplate(
  tmpl: any,
  dateISO: string,
  resolveSupplierNameById?: (id: any) => string | null
) {
  let providerNames: string[] = [];
  if (
    tmpl &&
    tmpl.suppliers &&
    Array.isArray(tmpl.suppliers) &&
    tmpl.suppliers.length
  ) {
    const resolved: string[] = [];
    for (const id of tmpl.suppliers as any[]) {
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
    if (
      Array.isArray(tmpl?.suppliersSnapshot) &&
      tmpl?.suppliersSnapshot.length
    ) {
      providerNames = tmpl.suppliersSnapshot
        .map((s: any) => s.name || '')
        .filter(Boolean);
    } else {
      providerNames = parseProvidersFromDescription(tmpl?.description);
    }
  }

  const proveedores = (providerNames || []).map(name => ({
    id: Date.now() + Math.random(),
    name,
    date: formatLocalDate(dateISO),
    estimated: 0,
    dollar: 0,
    notes: '',
    visited: false,
  }));

  const payload = {
    ingresos: [],
    entries: [],
    proveedores,
    newIngreso: { name: '', amount: 0, date: formatLocalDate(dateISO) },
    newProveedor: { name: '', estimated: 0, dollar: 0, notes: '' },
    selectedDate: formatLocalDate(dateISO),
    totals: {
      totalIngresos: 0,
      totalProviders: proveedores.reduce(
        (s, p) => s + (Number(p.dollar || 0) || Number(p.estimated || 0)),
        0
      ),
      totalVisitedProviders: 0,
    },
  };

  return payload;
}

export function hasBackupMeaningfulContent(data: any): boolean {
  try {
    if (!data) return false;
    if (Array.isArray(data.proveedores) && data.proveedores.length > 0)
      return true;
    if (data.totals) {
      const t: any = data.totals || {};
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

export async function buildAndSaveTemplateApplication(
  tmpl: any,
  dateISO: string,
  resolveSupplierNameById?: (id: any) => string | null,
  options?: {
    conflictStrategy?: 'ask' | 'combine' | 'overwrite';
    prebuiltPayload?: any;
  }
) {
  const strategy = options?.conflictStrategy || 'ask';

  // Determine payloadToSave: allow passing a prebuilt payload (useful when UI already constructed it)
  let payloadToSave: any;
  if (options && options.prebuiltPayload) {
    payloadToSave = options.prebuiltPayload;
  } else if (tmpl && tmpl.component && tmpl.data) {
    // caller passed a payload-like object
    payloadToSave = tmpl;
  } else {
    const payload = buildPayloadFromTemplate(
      tmpl,
      dateISO,
      resolveSupplierNameById
    );
    payloadToSave = {
      component: 'BudgetView',
      data: payload,
      createdAt: Date.now(),
    } as any;
  }

  // Check existing
  const existing = await backupController.getLatestBackupForDate(
    String(dateISO)
  );
  if (existing && existing.data && hasBackupMeaningfulContent(existing.data)) {
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
      const existingIngresos = Array.isArray((existing.data as any).ingresos)
        ? (existing.data as any).ingresos
        : [];
      const finalData: any = Object.assign({}, payloadToSave.data, {
        ingresos: existingIngresos,
        entries: existingIngresos,
      });
      const existingTotals = (existing.data as any).totals || {};
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
