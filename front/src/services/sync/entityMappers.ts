// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { SyncEntityType } from '@/db/types';
import { normalizeTime } from '@/utils/timeFormat';

type DataMap = Record<string, unknown>;

export function toApiFormat(entityType: SyncEntityType, row: Record<string, any>): DataMap | null {
  const now = Date.now();
  switch (entityType) {
    case 'account':
      return {
        name: row.name,
        initial_balance: row.initialBalance,
        version: row.version ?? 0,
        updated_at: row.updatedAt ?? now,
      };
    case 'budget_entry':
      return {
        name: row.name,
        amount: row.amount,
        date: row.date,
        payment_type: row.paymentType ?? 'cash',
        entry_type: row.entryType ?? 'egreso',
        account_id: row.accountId != null ? String(row.accountId) : undefined,
        groups: row.groups?.map((g: any) => ({
          sync_id: g.sync_id,
          amount: g.amount,
          accountId: g.accountId,
        })),
        supplier_id: row.supplierId,
        supplier_name: row.supplierName,
        category: row.category ?? undefined,
        // LBDS-275: notes must travel in the push payload so the server can
        // store it (the back column was added in migration 2026_10_12_000000).
        // LBDS-275 F1: do NOT coerce to `undefined` here — leaving the value
        // as-is lets `undefined` (no note) be dropped from the JSON payload
        // and `''` (user cleared) be sent as empty string. This prevents the
        // first edit of a pre-fix row from silently wiping any server-side
        // note the row might carry.
        notes: row.notes,
        // LBDS-273 (GitLab #13): mirror of recurring `time` push. The
        // value is normalized to the canonical zero-padded "HH:MM" so the
        // client and the server compute the SAME conflict-detection field
        // hash over it: the server stores the value in a MySQL TIME column
        // and reads it back zero-padded ("9:00" -> "09:00"), so an
        // unnormalized "9:00" would make the two hashes differ and raise
        // a phantom conflict on every push of that row.
        //
        // The key is always present (null when there is no time) on
        // purpose. The server's field hash includes a nullable column when
        // the column is present in the row, so a payload that omits the key
        // hashes differently from one that sends it as null — which the
        // server would read as a conflict.
        time: normalizeTime(row.time) ?? null,
        // LBDS-276: the server persists _from_recurring_id (migration
        // 2026_05_26_000002, fillable in BudgetEntry::$fillable, validated
        // in StoreBudgetEntryRequest). The pull mapper was already reading
        // it; the push side was dropping the link, so a freshly-created
        // entry with `_fromRecurringId` set lost the recurring reference
        // on its first push.
        _from_recurring_id:
          row._fromRecurringId ?? row.from_recurring_id ?? row.fromRecurringId ?? undefined,
        version: row.version ?? 0,
        updated_at: row.updatedAt ?? now,
      };
    case 'budget_provider':
      return {
        name: row.name,
        date: row.date,
        estimated: row.estimated,
        account_id: row.accountId != null && row.accountId !== 0
          ? String(row.accountId) : undefined,
        efectivo: row.efectivo,
        tarjeta: row.tarjeta,
        credito: row.credito,
        notes: row.notes,
        visited: row.visited,
        _supplier_id: row.supplierId ?? row._supplier_id,
        _supplier_name: row.supplierName ?? row._supplier_name,
        products: (row.products ?? []).map((p: any) => ({
          sync_id: p.sync_id,
          supplier_product_id: p.supplierProductId,
          product_name: p.productName,
          product_price: p.productPrice,
          quantity: p.quantity,
        })),
        version: row.version ?? 0,
        updated_at: row.updatedAt ?? now,
      };
    case 'budget_provider_product':
      return {
        budget_provider_id: row.providerSyncId,
        supplier_product_id: row.supplierProductId,
        product_name: row.productName ?? row.name,
        product_price: row.productPrice ?? row.price ?? 0,
        quantity: row.quantity ?? 1,
        version: row.version ?? 0,
        updated_at: row.updatedAt ?? now,
      };
    case 'supplier':
      return {
        name: row.name,
        version: row.version ?? 0,
        updated_at: row.updatedAt ?? now,
      };
    case 'supplier_product':
      return {
        supplier_id: row.supplierId ?? row.supplier_id,
        name: row.name,
        price: row.price,
        image_base64: row.imageBase64 ?? row.image_base64 ?? null,
        version: row.version ?? 0,
        updated_at: row.updatedAt ?? now,
      };
    case 'recurring_record':
      return {
        type: row.type,
        entry_type: row.entryType,
        name: row.name,
        amount: row.amount,
        account_id: row.accountId as string,
        repeat_frequency: row.repeatFrequency,
        repeat_interval: row.repeatInterval,
        repeat_days: row.repeatDays,
        repeat_month_day: row.repeatMonthDay,
        repeat_month_weekday_mode: row.repeatMonthWeekdayMode,
        repeat_month_weekday: row.repeatMonthWeekday,
        repeat_month_weekday_ordinal: row.repeatMonthWeekdayOrdinal,
        repeat_year_month: row.repeatYearMonth,
        repeat_year_day: row.repeatYearDay,
        time: row.time,
        auto_insert: row.autoInsert,
        start_date: row.startDate,
        end_date: row.endDate,
        estimated: row.estimated,
        items: row.items,
        // LBDS-273 (GitLab #13): mirror of BudgetEntryRow `category` push
        // pattern. The key is always present (null when there is no
        // category) so the server's field hash sees the same shape the
        // stored row has. An empty string means "no category" and is
        // normalized to null, the same way the server treats it.
        category: row.category != null && row.category !== '' ? String(row.category) : null,
        notes: row.notes,
        status: row.status,
        products: (row.products ?? []).map((p: any) => ({
          sync_id: p.sync_id,
          supplier_product_id: p.supplierProductId,
          product_name: p.productName,
          product_price: p.productPrice,
          quantity: p.quantity,
        })),
        version: row.version ?? 0,
        updated_at: row.updatedAt ?? now,
      };
    case 'recurring_record_product':
      return {
        recurring_record_id: row.recordSyncId ?? row.recurringRecordId,
        name: row.productName ?? row.name,
        amount: row.productPrice ?? row.amount ?? 0,
        quantity: row.quantity ?? 1,
      };
    // LBDS-280: the push mapper for an attachment delete. The server's
    // AttachmentProcessor only requires `id` (sync_id) for the delete path;
    // the extra fields are sent so the merge payload is self-describing if
    // we later add a hydration path. The server strips anything that is
    // not on Attachment::$fillable.
    case 'attachment':
      return {
        sync_id: row.sync_id,
        entity_type: row.entityType ?? row.entity_type,
        budget_entry_sync_id: row.entityType === 'entries' ? row.entitySyncId : null,
        budget_provider_sync_id: row.entityType === 'providers' ? row.entitySyncId : null,
        name: row.name,
        mime_type: row.mimeType ?? row.mime_type,
        size: row.size,
        download_url: row.downloadUrl ?? row.download_url,
        version: row.version ?? 0,
        updated_at: row.updatedAt ?? now,
      };
    default:
      return null;
  }
}
