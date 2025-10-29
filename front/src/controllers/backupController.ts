import { putBackup, listBackups } from "./dixie";

export async function backupBudgetViewData(data: any) {
  // Normalizar/validar si es necesario antes de guardar
  const payload = {
    component: "BudgetView",
    data,
    createdAt: Date.now(),
  };
  try {
    // log small summary to help debugging
    try {
      console.log("backupBudgetViewData: saving payload", {
        component: payload.component,
        createdAt: payload.createdAt,
        selectedDate: payload.data?.selectedDate,
        ingresosCount: Array.isArray(payload.data?.ingresos)
          ? payload.data.ingresos.length
          : 0,
        proveedoresCount: Array.isArray(payload.data?.proveedores)
          ? payload.data.proveedores.length
          : 0,
      });
    } catch (e) {
      /* noop */
    }

    const id = await putBackup(payload);
    return { id };
  } catch (err) {
    console.error("backupBudgetViewData: error saving backup", err);
    throw err;
  }
}

export async function getLatestBackupForDate(dateISO: string) {
  // dateISO expected in YYYY-MM-DD or full ISO; compare only date portion
  const all = (await listBackups()) as any[];
  if (!all || !all.length) return null;
  const target = dateISO.slice(0, 10);
  // Filter backups created by BudgetView and whose payload.data.selectedDate matches target
  const matches = all
    .filter(
      (b) => b && b.component === "BudgetView" && b.data && b.data.selectedDate
    )
    .filter((b) => b.data.selectedDate.slice(0, 10) === target)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return matches.length ? matches[0] : null;
}
