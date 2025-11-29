import dixieController, { DixieController } from './dixie';

class BackupController {
  private dixie: DixieController;

  constructor(dixie: DixieController = dixieController) {
    this.dixie = dixie;
  }

  async saveBackup(params: { entry: unknown }): Promise<IDBValidKey> {
    const { entry } = params;
    try {
      const key = await this.dixie.addEntry({ entry });
      console.log('BackupController.saveBackup: saved id=', key);
      return key;
    } catch (_e) {
      console.error('BackupController.saveBackup error', _e);
      throw _e;
    }
  }

  async getLatestBackupForDate(dateISO: string) {
    // dateISO expected in YYYY-MM-DD or full ISO; compare only date portion
    const all = (await this.dixie.listBackups()) as Array<
      Record<string, unknown> & {
        id?: IDBValidKey;
        component?: string;
        data?: unknown;
        createdAt?: number;
      }
    >;
    if (!all || !all.length) return null;
    const target = dateISO.slice(0, 10);
    // Filter backups created by BudgetView and whose data.selectedDate matches target
    const matches = all
      .filter(
        b =>
          b &&
          b.component === 'BudgetView' &&
          b.data &&
          (b.data as any).selectedDate
      )
      .filter(
        b => ((b.data as any).selectedDate as string).slice(0, 10) === target
      )
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return matches.length ? matches[0] : null;
  }
}

const backupController = new BackupController();
export default backupController;
export { BackupController };
