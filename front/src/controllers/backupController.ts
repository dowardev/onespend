import dixieController, { DixieController } from './dixie';
import { normalizeEntryData } from './migrationService';

interface BackupEntryData {
  selectedDate?: string;
  [key: string]: unknown;
}

interface BackupRecord {
  id?: IDBValidKey;
  component?: string;
  data?: BackupEntryData;
  createdAt?: number;
}

class BackupController {
  private dixie: DixieController;

  constructor(dixie: DixieController = dixieController) {
    this.dixie = dixie;
  }

  async saveBackup(params: { entry: unknown }): Promise<IDBValidKey> {
    const { entry } = params;
    try {
      let normalizedEntry: unknown = entry;
      try {
        normalizedEntry = JSON.parse(JSON.stringify(entry));
      } catch (_e) {
        normalizedEntry = entry;
      }

      try {
        const data = normalizedEntry && (normalizedEntry as { data?: BackupEntryData }).data;
        if (data && typeof data === 'object') {
          const { newData } = normalizeEntryData(data);
          (normalizedEntry as { data: BackupEntryData }).data = newData;
        }
      } catch (_e) {}

      const key = await this.dixie.addEntry({ entry: normalizedEntry });
      return key;
    } catch (_e) {
      console.error('BackupController.saveBackup error', _e);
      throw _e;
    }
  }

  async getLatestBackupForDate(dateISO: string) {
    const all = (await this.dixie.listBackups()) as Array<BackupRecord>;
    if (!all || !all.length) return null;
    const target = dateISO.slice(0, 10);
    const matches = all
      .filter(
        (b) =>
          b && b.component === 'BudgetView' && b.data && (b.data as BackupEntryData).selectedDate,
      )
      .filter((b) => ((b.data as BackupEntryData).selectedDate as string).slice(0, 10) === target)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return matches.length ? matches[0] : null;
  }
}

const backupController = new BackupController();
export default backupController;
export { BackupController };
