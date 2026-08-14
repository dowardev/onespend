// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

export function formatCurrency(params: { value: number | string | null | undefined }): string {
  const { value } = params
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(value) || 0)
}

export function calcProviderProductsTotal(params: { provider: { products?: Array<{ quantity?: number | string; productPrice?: number | string }>; estimated?: number | string } }): number {
  const { provider } = params
  if (Array.isArray(provider.products)) {
    return provider.products.reduce(
      (sum, p) => sum + (Number(p.quantity) || 0) * (Number(p.productPrice) || 0),
      0,
    )
  }
  return Number(provider.estimated || 0)
}
