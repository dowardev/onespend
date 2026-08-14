// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import dixieController, { DixieController } from './dixie';
import { formatLocalDate } from '@/utils/date';

class BackupController {
  private dixie: DixieController;

  constructor(dixie: DixieController = dixieController) {
    this.dixie = dixie;
  }

  async saveBackup(params: { entry: unknown }): Promise<IDBValidKey> {
    const { entry } = params;
    try {
      // Clone the entry to avoid mutating the caller and normalize any fields
      // that represent a calendar day to YYYY-MM-DD using formatLocalDate.
      let normalizedEntry: any = entry;
      try {
        normalizedEntry = JSON.parse(JSON.stringify(entry));
      } catch (_e) {
        // If cloning fails (non-serializable), fall back to original entry
        normalizedEntry = entry as any;
      }

      try {
        // Normalize common shapes: payload.data.selectedDate, proveedores[].date, ingresos[].date, newIngreso.date
        const data = normalizedEntry && (normalizedEntry as any).data;
        if (data && typeof data === 'object') {
          try {
            if (data.selectedDate) {
              data.selectedDate = formatLocalDate(String(data.selectedDate));
            }
          } catch (_e) {
            /* noop */
          }

          try {
            if (Array.isArray(data.proveedores)) {
              data.proveedores = data.proveedores.map((p: any) => ({
                ...(p || {}),
                date:
                  p && p.date ? formatLocalDate(String(p.date)) : p && p.date,
              }));
            }
          } catch (_e) {
            /* noop */
          }

          try {
            if (Array.isArray(data.ingresos)) {
              data.ingresos = data.ingresos.map((i: any) => ({
                ...(i || {}),
                date:
                  i && i.date ? formatLocalDate(String(i.date)) : i && i.date,
              }));
            }
          } catch (_e) {
            /* noop */
          }

          try {
            if (data.newIngreso && data.newIngreso.date) {
              data.newIngreso.date = formatLocalDate(
                String(data.newIngreso.date)
              );
            }
          } catch (_e) {
            /* noop */
          }

          try {
            if (data.newProveedor && data.newProveedor.date) {
              data.newProveedor.date = formatLocalDate(
                String(data.newProveedor.date)
              );
            }
          } catch (_e) {
            /* noop */
          }
        }
      } catch (_e) {
        /* noop */
      }

      const key = await this.dixie.addEntry({ entry: normalizedEntry });
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
