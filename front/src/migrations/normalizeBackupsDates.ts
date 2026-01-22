import dixieController from '@/controllers/dixie';
import { normalizeEntryData } from '@/controllers/migrationService';

interface MigrationOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

interface BackupEntry {
  id?: string | number | null;
  data?: BackupData;
  meta?: Record<string, unknown>;
}

interface BackupData {
  selectedDate?: string;
  proveedores?: Array<{ date?: string }>;
  ingresos?: Array<{ date?: string }>;
  newIngreso?: { date?: string };
  newProveedor?: { date?: string };
  [key: string]: unknown;
}

export async function migrateNormalizeBackupDates(params: { opts?: MigrationOptions }) {
  const { opts } = params;
  const { dryRun = true, verbose = true } = opts || {};
  const all = (await dixieController.listBackups()) as Array<BackupEntry>;
  const results: Array<{
    id: string | number | null;
    changed: boolean;
    before?: BackupData;
    after?: BackupData;
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
  const all = (await dixieController.listBackups()) as Array<BackupEntry>;
  try {
    // console.log(
    //   'needsNormalizeCheck: found backups ->',
    //   Array.isArray(all) ? all.length : all
    // );
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
        // console.log(
        //   'needsNormalizeCheck: entry',
        //   id,
        //   'would change?',
        //   !!changed
        // );
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
