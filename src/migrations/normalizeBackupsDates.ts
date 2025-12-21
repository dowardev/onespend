import dixieController from '@/controllers/dixie';
import { formatLocalDate } from '@/utils/date';

interface MigrationOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

function normalizeDateIfNeeded(val: any): { value: any; changed: boolean } {
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

function normalizeEntryData(data: any): { newData: any; changed: boolean } {
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
          // shallow copy item
          const newItem = Object.assign({}, item);
          newItem[key] = r.value;
          arr[i] = newItem;
          changed = true;
        }
      }
    }
  };

  if (Array.isArray(clone.proveedores)) {
    // clone array shallowly
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

export async function migrateNormalizeBackupDates(opts: MigrationOptions = {}) {
  const { dryRun = true, verbose = true } = opts;
  const all = (await dixieController.listBackups()) as any[];
  const results: Array<{
    id: any;
    changed: boolean;
    before?: any;
    after?: any;
  }> = [];

  for (const entry of all) {
    try {
      const id = (entry && entry.id) || null;
      const meta = entry && entry.meta ? Object.assign({}, entry.meta) : {};
      // Skip if we detect already-normalized flag
      if (meta && meta.__datesNormalized === true) {
        if (verbose) console.log('Skipping already normalized entry', id);
        results.push({ id, changed: false });
        continue;
      }

      const data = entry && entry.data ? entry.data : null;
      const { newData, changed } = normalizeEntryData(data);
      if (!changed) {
        results.push({ id, changed: false });
        continue;
      }

      const newEntry = Object.assign({}, entry, {
        data: newData,
        meta: Object.assign({}, meta, { __datesNormalized: true }),
      });

      if (dryRun) {
        results.push({ id, changed: true, before: data, after: newData });
        if (verbose) console.log('Dry-run: would update entry', id);
      } else {
        await dixieController.putEntry({ entry: newEntry });
        results.push({ id, changed: true, before: data, after: newData });
        if (verbose) console.log('Updated entry', id);
      }
    } catch (e) {
      console.error('Failed to process entry', entry && entry.id, e);
      results.push({ id: entry && entry.id, changed: false });
    }
  }

  return results;
}

export async function needsNormalizeCheck() {
  const all = (await dixieController.listBackups()) as any[];
  try {
    console.log(
      'needsNormalizeCheck: found backups ->',
      Array.isArray(all) ? all.length : all
    );
  } catch (_e) {}
  for (const entry of all) {
    try {
      const id = entry && entry.id ? entry.id : null;
      const meta = entry && entry.meta ? Object.assign({}, entry.meta) : {};
      if (meta && meta.__datesNormalized === true) {
        try {
          console.log('needsNormalizeCheck: skipping normalized entry', id);
        } catch (_e) {}
        continue;
      }
      const data = entry && entry.data ? entry.data : null;
      const { changed } = normalizeEntryData(data);
      try {
        console.log(
          'needsNormalizeCheck: entry',
          id,
          'would change?',
          !!changed
        );
      } catch (_e) {}
      if (changed) return true;
    } catch (e) {
      console.error(
        'needsNormalizeCheck: error checking entry',
        entry && entry.id,
        e
      );
      // ignore and continue
    }
  }
  return false;
}

export default migrateNormalizeBackupDates;
