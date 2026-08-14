// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import type {
  AccountRow,
  BudgetEntryRow,
  BudgetEntryGroupRow,
  BudgetProviderRow,
  SupplierRow,
  SupplierProductRow,
} from './types'

function coerceAccountId(id: unknown): string | number | null {
  if (id == null) return null
  if (typeof id === 'number') return id
  return String(id)
}

function str(val: unknown, fallback = ''): string {
  return val != null ? String(val) : fallback
}

function num(val: unknown, fallback = 0): number {
  const n = Number(val ?? fallback)
  return isNaN(n) ? fallback : n
}

function pickDate(d: unknown): string {
  if (!d) return ''
  return String(d).substring(0, 10)
}

function pickServerId(item: any): number | null {
  const sid = item.serverId ?? item.id_server
  return sid != null ? Number(sid) : null
}

export function toBudgetEntryRow(entry: any): BudgetEntryRow {
  return {
    sync_id: str(entry.sync_id || entry.id || entry.id_server || ''),
    serverId: pickServerId(entry),
    name: str(entry.name),
    amount: num(entry.amount),
    date: pickDate(entry.date),
    paymentType: entry.paymentType || entry.payment_type || 'cash',
    entryType: entry.entryType || entry.entry_type || 'egreso',
    accountId: coerceAccountId(entry.accountId ?? entry.account_id),
    supplierId: entry.supplierId != null ? str(entry.supplierId) : (entry.supplier_id != null ? str(entry.supplier_id) : null),
    supplierName: str(entry.supplierName || entry.supplier_name) || undefined,
    fromRecurringId: entry._fromRecurringId ?? entry.from_recurring_id ?? null,
    providerGroupId: entry._fromProviderGroupId != null ? str(entry._fromProviderGroupId) : null,
    providerName: str(entry._providerName || entry.provider_name) || undefined,
    version: entry.version ?? 0,
    status: str(entry.status) || 'active',
    groups: entry.groups?.map((g: any) => toBudgetEntryGroupRow(g)),
    createdAt: num(entry.createdAt || entry.created_at) || Date.now(),
    updatedAt: num(entry.updatedAt || entry.updated_at) || undefined,
    syncedAt: Date.now(),
  }
}

function toBudgetEntryGroupRow(group: any): BudgetEntryGroupRow {
  return {
    sync_id: group.sync_id,
    accountId: coerceAccountId(group.accountId ?? group.account_id),
    amount: num(group.amount),
  }
}

export function toBudgetProviderRow(provider: any): BudgetProviderRow {
  return {
    sync_id: str(provider.sync_id || provider.id || provider.id_server || ''),
    serverId: pickServerId(provider),
    name: str(provider.name),
    date: pickDate(provider.date),
    estimated: num(provider.estimated),
    accountId: coerceAccountId(provider.accountId ?? provider.account_id),
    efectivo: num(provider.efectivo),
    tarjeta: num(provider.tarjeta),
    credito: num(provider.credito),
    notes: str(provider.notes),
    visited: !!provider.visited,
    supplierId: provider._supplierId != null ? str(provider._supplierId) : (provider.supplier_id != null ? str(provider.supplier_id) : null),
    supplierName: str(provider._supplierName || provider._supplier_name || provider.supplier_name) || undefined,
    fromRecurringId: provider._fromRecurringId ?? provider.from_recurring_id ?? null,
    version: provider.version ?? 0,
    createdAt: num(provider.createdAt || provider.created_at) || Date.now(),
    updatedAt: num(provider.updatedAt || provider.updated_at) || undefined,
    syncedAt: Date.now(),
  }
}

export function toSupplierRow(supplier: any): SupplierRow {
  return {
    sync_id: str(supplier.sync_id || supplier.id || supplier.id_server || ''),
    serverId: pickServerId(supplier),
    name: str(supplier.name),
    version: supplier.version ?? 0,
    createdAt: num(supplier.createdAt || supplier.created_at) || undefined,
    updatedAt: num(supplier.updatedAt || supplier.updated_at) || undefined,
    syncedAt: Date.now(),
    products: (supplier.products || []).map((p: any) => ({
      sync_id: str(p.sync_id || p.id || p.id_server),
      serverId: pickServerId(p),
      supplierId: str(supplier.sync_id || supplier.id || supplier.id_server),
      name: str(p.name),
      price: num(p.price),
      imageBase64: p.image_base64 ?? p.imageBase64 ?? null,
      imageUrl: p.image_url ?? p.imageUrl ?? null,
    })),
  }
}

export function toSupplierProductRow(product: any): SupplierProductRow {
  return {
    sync_id: str(product.sync_id || product.id || product.id_server || ''),
    serverId: pickServerId(product),
    supplierId: str(product.supplier_id ?? product.supplierId ?? ''),
    name: str(product.name),
    price: num(product.price),
    imageBase64: product.image_base64 ?? product.imageBase64 ?? null,
    imageUrl: product.image_url ?? product.imageUrl ?? null,
    version: product.version ?? 0,
    createdAt: num(product.createdAt || product.created_at) || undefined,
    updatedAt: num(product.updatedAt || product.updated_at) || undefined,
    syncedAt: Date.now(),
  }
}

export function toAccountRow(account: any): AccountRow {
  return {
    sync_id: str(account.sync_id || account.id || account.id_server || ''),
    serverId: pickServerId(account),
    name: str(account.name),
    initialBalance: num(account.initial_balance ?? account.initialBalance ?? 0),
    version: account.version ?? 0,
    createdAt: num(account.createdAt || account.created_at) || undefined,
    updatedAt: num(account.updatedAt || account.updated_at) || undefined,
    syncedAt: Date.now(),
  }
}
