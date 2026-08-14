// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { accountsDb } from '@/db/controllers/accountsDb'
import { suppliersDb } from '@/db/controllers/suppliersDb'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SKIP_FIELDS = new Set([
  'sync_id', 'id', 'created_at', 'updated_at', 'user_id', 'version',
  '_conflict', '_deleted', '_original', 'server_id',
])

const FK_RESOLVERS: Record<string, (id: string) => Promise<{ name?: string } | null>> = {
  account_id: async (id: string) => accountsDb.getBySyncId({ syncId: id }),
  supplier_id: async (id: string) => suppliersDb.getBySyncId({ syncId: id }),
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  amount: 'Monto',
  note: 'Nota',
  date: 'Fecha',
  description: 'Descripción',
  account_id: 'Cuenta',
  supplier_id: 'Proveedor',
  supplier_name: 'Proveedor',
  budget_id: 'Presupuesto',
  entry_type: 'Tipo',
  payment_type: 'Forma de pago',
  status: 'Estado',
  currency: 'Moneda',
  type: 'Tipo',
  initial_balance: 'Saldo inicial',
  balance: 'Saldo',
  price: 'Precio',
  total: 'Total',
}

export interface DisplayField {
  field: string
  label: string
  serverDisplay: string
  clientDisplay: string
  hasDifference: boolean
}

function getFieldLabel(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field]
  return field
    .split('_')
    .map((w, i) => i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)
    .join(' ')
}

async function resolveValue(field: string, value: unknown): Promise<string> {
  if (value === undefined || value === null) return '—'
  if (value === '') return '(vacío)'

  if (typeof value === 'string' && uuidRegex.test(value) && FK_RESOLVERS[field]) {
    const entry = await FK_RESOLVERS[field](value)
    if (entry?.name) return entry.name
    return '(elemento no disponible)'
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value + 'T12:00:00')
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
  }

  if (typeof value === 'string' && value.includes('T')) {
    const d = new Date(value)
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    }
  }

  if (value !== null && typeof value === 'object') {
    if (Array.isArray(value)) return `Lista (${value.length})`
    const keys = Object.keys(value as Record<string, unknown>)
    if (keys.length === 0) return '—'
    return `${keys.length} propiedades`
  }

  if (typeof value === 'boolean') return value ? 'Sí' : 'No'

  if (typeof value === 'number') {
    if (/(amount|balance|price|total|initial)/i.test(field)) {
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
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
