// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { SyncEntityType } from '@/db/types';

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
        // LBDS-276: the server persists _from_recurring_id (migration
        // 2026_05_26_000002, fillable in BudgetEntry::$fillable, validated
        // in BudgetEntrySyncRequest). The pull mapper was already reading
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

export function fromApiFormat(entityType: SyncEntityType, item: Record<string, any>): DataMap | null {
  const common = {
    sync_id: item.sync_id ?? item.id ?? '',
    serverId: item.id_server != null ? Number(item.id_server) : null,
    status: item.status ?? 'active',
    version: Number(item.version) || 0,
    createdAt: item.created_at ? Number(item.created_at) : undefined,
    updatedAt: item.updated_at ? Number(item.updated_at) : undefined,
  };

  switch (entityType) {
    case 'account':
      return {
        ...common,
        name: String(item.name ?? ''),
        initialBalance: Number(item.initial_balance ?? 0),
      };
    case 'budget_entry':
      return {
        ...common,
        name: String(item.name ?? ''),
        amount: Number(item.amount ?? 0),
        date: item.date ?? '',
        paymentType: String(item.payment_type ?? 'cash'),
        entryType: String(item.entry_type ?? 'egreso'),
        account_id: item.account_id,
        supplierId: item.supplier_id ? String(item.supplier_id) : null,
        supplierName: item.supplier_name ? String(item.supplier_name) : '',
        category: item.category != null ? String(item.category) : undefined,
        // LBDS-275: notes must travel in the pull payload so the local row
        // receives the note the server stored. Server sends `notes` as a
        // nullable string (matches the push mapper); a missing field stays
        // undefined so the row's notes remain unset instead of becoming ''.
        notes: item.notes != null ? String(item.notes) : undefined,
        groups: Array.isArray(item.groups)
          ? item.groups.map((g: any) => ({
              sync_id: g.sync_id || g.id,
              account_id: g.account_id,
              amount: Number(g.amount ?? 0),
            }))
          : undefined,
      };
    case 'budget_provider':
      return {
        ...common,
        name: String(item.name ?? ''),
        date: item.date ?? '',
        account_id: item.account_id,
        estimated: Number(item.estimated ?? 0),
        efectivo: Number(item.efectivo ?? 0),
        tarjeta: Number(item.tarjeta ?? 0),
        credito: Number(item.credito ?? 0),
        notes: String(item.notes ?? ''),
        visited: !!item.visited,
        supplierId: item.supplier_id ? String(item.supplier_id) : null,
        _supplier_id: item._supplier_id ? String(item._supplier_id) : null,
        _supplier_name: String(item._supplier_name ?? ''),
        products: Array.isArray(item.products)
          ? item.products.map((p: any) => ({
              sync_id: p.sync_id || p.id,
              supplier_product_id: p.supplier_product_id,
              product_name: p.product_name || p.name,
              product_price: p.product_price || p.price || 0,
              quantity: p.quantity ?? 1,
            }))
          : undefined,
      };
    case 'budget_provider_product':
      return {
        ...common,
        providerSyncId: item.budget_provider_id,
        supplierProductId: item.supplier_product_id,
        productName: String(item.product_name ?? item.name ?? ''),
        productPrice: Number(item.product_price ?? item.price ?? 0),
        quantity: Number(item.quantity ?? 1),
      };
    case 'supplier':
      return {
        ...common,
        name: String(item.name ?? ''),
        products: Array.isArray(item.products)
          ? item.products.map((p: any) => ({
              sync_id: p.sync_id || p.id,
              serverId: p.id_server != null ? Number(p.id_server) : null,
              supplierId: item.sync_id || item.id || '',
              name: String(p.name ?? ''),
              price: Number(p.price ?? 0),
              imageBase64: p.image_base64 ?? p.imageBase64 ?? null,
              imageUrl: p.image_url ?? p.imageUrl ?? null,
            }))
          : undefined,
      };
    case 'supplier_product':
      return {
        ...common,
        supplierId: String(item.supplier_id ?? ''),
        name: String(item.name ?? ''),
        price: Number(item.price ?? 0),
        imageBase64: item.image_base64 ?? item.imageBase64 ?? null,
        imageUrl: item.image_url ?? item.imageUrl ?? null,
      };
    case 'recurring_record':
      return {
        ...common,
        name: String(item.name ?? ''),
        amount: Number(item.amount ?? 0),
        type: item.type,
        entryType: item.entry_type,
        account_id: item.account_id,
        repeatFrequency: item.repeat_frequency,
        repeatInterval: item.repeat_interval,
        repeatDays: item.repeat_days,
        repeatMonthDay: item.repeat_month_day,
        repeatMonthWeekdayMode: item.repeat_month_weekday_mode,
        repeatMonthWeekday: item.repeat_month_weekday,
        repeatMonthWeekdayOrdinal: item.repeat_month_weekday_ordinal,
        repeatYearMonth: item.repeat_year_month,
        repeatYearDay: item.repeat_year_day,
        time: item.time,
        autoInsert: item.auto_insert,
        startDate: item.start_date,
        endDate: item.end_date,
        estimated: item.estimated,
        notes: item.notes,
        status: item.status,
        products: Array.isArray(item.products)
          ? item.products.map((p: any) => ({
              sync_id: p.sync_id || p.id,
              supplier_product_id: p.supplier_product_id,
              product_name: p.product_name || p.name || '',
              product_price: p.product_price || p.price || 0,
              quantity: p.quantity ?? 1,
            }))
          : undefined,
      };
    case 'recurring_record_product':
      return {
        ...common,
        recordSyncId: item.recurring_record_id,
        name: String(item.name ?? ''),
        amount: Number(item.amount ?? 0),
      };
    // LBDS-280: inverse mapper for pull payloads. Today the merge controller
    // does not hydrate attachments (uploads still use AttachmentController);
    // this case exists so the mapper whitelist does not hit the default
    // branch and so a future pull-path can read what we wrote.
    case 'attachment': {
      const parentSyncId: string = String(
        item.budget_entry_sync_id ?? item.budget_provider_sync_id ?? '',
      );
      const entityType: 'entries' | 'providers' =
        item.budget_provider_sync_id ? 'providers' : 'entries';
      return {
        ...common,
        entitySyncId: parentSyncId,
        entityType,
        name: String(item.name ?? ''),
        mimeType: String(item.mime_type ?? ''),
        size: Number(item.size ?? 0),
        downloadUrl: item.download_url ?? null,
      };
    }
    default:
      return null;
  }
}
