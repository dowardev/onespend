import dixieController from '@/controllers/dixie';

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
  ingresos?: Array<Record<string, unknown>>;
  entries?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export async function migrateAddEntriesToBackups(params: { opts?: MigrationOptions }) {
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
      // Skip if we detect already-processed flag
      if (meta && meta.__entriesAdded === true) {
        if (verbose) console.log('Skipping already-processed entry', id);
        results.push({ id, changed: false });
        continue;
      }

      const data = entry && entry.data ? entry.data : null;
      if (!data) {
        results.push({ id, changed: false });
        continue;
      }

      const hasIngresos = Array.isArray(data.ingresos);
      const hasEntries = Array.isArray(data.entries);

      // Only process entries that have ingresos array and do NOT have entries array
      if (!hasIngresos || hasEntries) {
        results.push({ id, changed: false });
        continue;
      }

      const newData = Object.assign({}, data, { entries: data.ingresos });
      const newEntry = Object.assign({}, entry, {
        data: newData,
        meta: Object.assign({}, meta, { __entriesAdded: true }),
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
      results.push({
        id: entry && entry.id,
        changed: false,
      });
    }
  }

  return results;
}

export async function needsEntriesKeyCheck() {
  const all = (await dixieController.listBackups()) as Array<BackupEntry>;
  try {
    // console.log(
    //   'needsEntriesKeyCheck: found backups ->',
    //   Array.isArray(all) ? all.length : all
    // );
  } catch (_e) {}

  for (const entry of all) {
    try {
      const id = entry && entry.id ? entry.id : null;
      const meta = entry && entry.meta ? Object.assign({}, entry.meta) : {};
      if (meta && meta.__entriesAdded === true) {
        try {
          // console.log('needsEntriesKeyCheck: skipping processed entry', id);
        } catch (_e) {}
        continue;
      }
      const data = entry && entry.data ? entry.data : null;
      if (data && Array.isArray(data.ingresos) && !Array.isArray(data.entries)) return true;
    } catch (e) {
      console.error('needsEntriesKeyCheck: error checking entry', entry && entry.id, e);
      // ignore and continue
    }
  }
  return false;
}

export default migrateAddEntriesToBackups;
