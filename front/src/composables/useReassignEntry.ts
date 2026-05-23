import budgetController from '@/controllers/budgetController';

function toShortDate(d: string | number | Date | undefined | null): string {
  if (!d) return new Date().toISOString().slice(0, 10);
  if (typeof d === 'number') return new Date(d).toISOString().slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  // string
  const s = String(d);
  const m = s.match(/\d{4}-\d{2}-\d{2}/);
  if (m) return m[0];
  // fallback: try Date parse
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

export async function reassignEntry(params: {
  entryId: string | number;
  newDate: string | number | Date;
  originalDate?: string | number | Date;
  restoreSelectedDate?: boolean;
  verbose?: boolean;
}): Promise<{ moved: boolean; id: string | number; error?: any }> {
  const { entryId, newDate, originalDate, restoreSelectedDate, verbose } = params;
  let moved = false;
  let idToUse: string | number = entryId;
  try {
    const destDate = toShortDate(newDate);

    const prevSelected =
      (budgetController.getSelectedDate && budgetController.getSelectedDate()) || null;

    // resolve original date
    let srcDate = originalDate ? toShortDate(originalDate) : null;
    if (!srcDate) {
      const storeFound = (budgetController.getEntries() || []).find(
        (en: any) => String(en.id) === String(entryId),
      );
      if (storeFound && storeFound.date) srcDate = toShortDate(storeFound.date);
    }
    if (!srcDate) srcDate = prevSelected || toShortDate(new Date());

    if (verbose)
      console.log(
        'reassignEntry: srcDate ->',
        srcDate,
        'destDate ->',
        destDate,
        'entryId ->',
        entryId,
      );

    // load source bucket
    try {
      budgetController.setDate({ date: srcDate });
    } catch (_) {}
    await budgetController.loadDataForDate({ date: srcDate });

    // find entry in source
    const storeEntry = (budgetController.getEntries() || []).find(
      (en: any) => String(en.id) === String(entryId),
    );
    idToUse = storeEntry ? storeEntry.id : entryId;

    if (verbose) console.log('reassignEntry: idToUse ->', idToUse);

    // update date and persist
    budgetController.updateIngreso({ id: idToUse, changes: { date: destDate } });
    await budgetController.saveData();

    // verify by loading dest
    try {
      await budgetController.loadDataForDate({ date: destDate });
      const destEntries = budgetController.getEntries() || [];
      moved = destEntries.some((en: any) => String(en.id) === String(idToUse));
    } catch (err) {
      if (verbose) console.error('reassignEntry: verify error', err);
    }

    // fallback remove+create if needed
    if (!moved) {
      if (verbose) console.warn('reassignEntry: entry not found in dest, performing fallback');
      // reload source to get original payload
      await budgetController.loadDataForDate({ date: srcDate });
      const srcEntries = budgetController.getEntries() || [];
      const srcEntry = srcEntries.find((en: any) => String(en.id) === String(idToUse));
      if (srcEntry) {
        const payload: any = {
          name: srcEntry.name,
          amount: srcEntry.amount,
          paymentType: srcEntry.paymentType,
          accountId: srcEntry.accountId ?? null,
          groups: srcEntry.groups ?? [],
          // keep other useful metadata if present
          supplierId: srcEntry.supplierId,
          supplierName: srcEntry.supplierName,
        };

        budgetController.removeIngreso({ id: idToUse });
        await budgetController.saveData();

        try {
          budgetController.setDate({ date: destDate });
        } catch (_) {}
        await budgetController.loadDataForDate({ date: destDate });
        if ((srcEntry as any).entryType === 'ingreso') {
          const created = budgetController.addIngreso(payload) as any;
          if (created) idToUse = created.id;
        } else {
          const created = budgetController.addEgreso(payload) as any;
          if (created) idToUse = created.id;
        }
        await budgetController.saveData();

        // assume created entry id is available from addIngreso/addEgreso
        const finalEntries = budgetController.getEntries() || [];
        moved = finalEntries.some((en: any) => String(en.id) === String(idToUse));
      }
    }

    // restore selected date if requested
    if (restoreSelectedDate && prevSelected) {
      try {
        budgetController.setDate({ date: prevSelected });
      } catch (_) {}
      await budgetController.loadDataForDate({ date: prevSelected });
    }

    return { moved, id: idToUse };
  } catch (error) {
    try {
      console.error('reassignEntry error', error);
    } catch (e) {}
    return { moved: false, id: idToUse, error };
  }
}

export default { reassignEntry };
