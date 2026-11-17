// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { accountsDb } from '@/db/controllers/accountsDb'
import { suppliersDb } from '@/db/controllers/suppliersDb'
import { translate, getIntlLocale } from '@/i18n'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SKIP_FIELDS = new Set([
  'sync_id', 'id', 'created_at', 'updated_at', 'user_id', 'version',
  '_conflict', '_deleted', '_original', 'server_id',
])

const FK_RESOLVERS: Record<string, (id: string) => Promise<{ name?: string } | null>> = {
  account_id: async (id: string) => accountsDb.getBySyncId({ syncId: id }),
  supplier_id: async (id: string) => suppliersDb.getBySyncId({ syncId: id }),
}

// Translation KEY PATHS per field, resolved through `translate()` at render
// time so the label follows the active language.
const FIELD_LABEL_KEYS: Record<string, string> = {
  name: 'lookupResolver.field.name',
  amount: 'lookupResolver.field.amount',
  note: 'lookupResolver.field.note',
  date: 'lookupResolver.field.date',
  description: 'lookupResolver.field.description',
  account_id: 'lookupResolver.field.account_id',
  supplier_id: 'lookupResolver.field.supplier_id',
  supplier_name: 'lookupResolver.field.supplier_name',
  budget_id: 'lookupResolver.field.budget_id',
  entry_type: 'lookupResolver.field.entry_type',
  payment_type: 'lookupResolver.field.payment_type',
  status: 'lookupResolver.field.status',
  currency: 'lookupResolver.field.currency',
  type: 'lookupResolver.field.type',
  initial_balance: 'lookupResolver.field.initial_balance',
  balance: 'lookupResolver.field.balance',
  price: 'lookupResolver.field.price',
  total: 'lookupResolver.field.total',
}

export interface DisplayField {
  field: string
  label: string
  serverDisplay: string
  clientDisplay: string
  hasDifference: boolean
}

export function getFieldLabel(field: string): string {
  const key = FIELD_LABEL_KEYS[field]
  if (key) {
    const label = translate(key)
    // vue-i18n returns the key path itself when the translation is missing,
    // so a typo in FIELD_LABEL_KEYS would render "lookupResolver.field.nmae"
    // in the conflict modal. An empty translation is just as broken: it
    // would render a blank label. Fall through to the field name instead.
    if (label && label !== key) return label
  }
  // Unknown field (or missing translation): fall back to a readable
  // title-cased label. A degraded label beats leaking a raw key path.
  return field
    .split('_')
    .map((w, i) => i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)
    .join(' ')
}

async function resolveValue(field: string, value: unknown): Promise<string> {
  if (value === undefined || value === null) return '—'
  if (value === '') return translate('common.empty')

  if (typeof value === 'string' && uuidRegex.test(value) && FK_RESOLVERS[field]) {
    const entry = await FK_RESOLVERS[field](value)
    if (entry?.name) return entry.name
    return translate('lookupResolver.unavailable')
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value + 'T12:00:00')
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(getIntlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
  }

  if (typeof value === 'string' && value.includes('T')) {
    const d = new Date(value)
    if (!isNaN(d.getTime())) {
      return d.toLocaleString(getIntlLocale(), {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    }
  }

  if (value !== null && typeof value === 'object') {
    if (Array.isArray(value)) return translate('lookupResolver.list', { count: value.length })
    const keys = Object.keys(value as Record<string, unknown>)
    if (keys.length === 0) return '—'
    return translate('lookupResolver.properties', { count: keys.length })
  }

  if (typeof value === 'boolean') return value ? translate('common.yes') : translate('common.no')

  if (typeof value === 'number') {
    if (/(amount|balance|price|total|initial)/i.test(field)) {
      return new Intl.NumberFormat(getIntlLocale(), { style: 'currency', currency: 'EUR' }).format(value)
    }
    return String(value)
  }

  return String(value)
}

export async function resolveConflictFields(params: {
  serverData?: Record<string, unknown>
  clientData: Record<string, unknown>
}): Promise<DisplayField[]> {
  const { serverData = {}, clientData } = params

  const allFields = new Set([
    ...Object.keys(serverData),
    ...Object.keys(clientData),
  ])

  const results: DisplayField[] = []

  for (const field of allFields) {
    if (SKIP_FIELDS.has(field)) continue
    if (field.startsWith('_')) continue

    const serverRaw = serverData[field]
    const clientRaw = clientData[field]

    if (serverRaw === undefined && clientRaw === undefined) continue

    const [serverDisplay, clientDisplay] = await Promise.all([
      resolveValue(field, serverRaw),
      resolveValue(field, clientRaw),
    ])

    results.push({
      field,
      label: getFieldLabel(field),
      serverDisplay,
      clientDisplay,
      hasDifference: serverRaw !== clientRaw,
    })
  }

  results.sort((a, b) => {
    if (a.hasDifference !== b.hasDifference) return a.hasDifference ? -1 : 1
    return a.label.localeCompare(b.label)
  })

  return results
}
