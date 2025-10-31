import dixieController, { DixieController } from "./dixie";

class BackupController {
  private dixie: DixieController;

  constructor(dixie: DixieController = dixieController) {
    this.dixie = dixie;
  }


  async getLatestBackupForDate(dateISO: string) {
    // dateISO expected in YYYY-MM-DD or full ISO; compare only date portion
    const all = (await this.dixie.listBackups()) as any[];
    if (!all || !all.length) return null;
    const target = dateISO.slice(0, 10);
    // Filter backups created by BudgetView and whose payload.data.selectedDate matches target
    const matches = all
      .filter(
        (b) =>
          b && b.component === "BudgetView" && b.data && b.data.selectedDate,
      )
      .filter((b) => b.data.selectedDate.slice(0, 10) === target)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return matches.length ? matches[0] : null;
  }
}

const backupController = new BackupController();
export default backupController;
export { BackupController };
