// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// Regression test for the LBDS-210 RC4 §2 secondary optimizations in
// InicioViewComponent.vue:
//  - totalIngresos/totalEgresos computed from a single scan (financialTotals)
//  - unifiedItems reuses the day-scoped providersToday filter
//
// The e2e suite cannot run headlessly here (external SSO + sync API), so this
// unit test pins the exact balance semantics of the unified daily record list.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import InicioViewComponent from '@/views/budget/entries/InicioViewComponent.vue'

import budgetEntriesController from '@/controllers/budgetEntriesController'
import budgetProvidersController from '@/controllers/budgetProvidersController'
import accountsController from '@/controllers/accountsController'
import { useBudgetDayStore } from '@/stores/budgetDayStore'
import type { Income } from '@/stores/budgetEntriesStore'
import type { Provider, BudgetProviderProduct } from '@/stores/budgetProvidersStore'

function makeEntry(params: {
  id: string
  name: string
  amount: number
  date: string
  entryType: 'ingreso' | 'egreso'
  accountId?: string | null
  createdAt?: number
}): Income {
  return {
    id: params.id,
    name: params.name,
    amount: params.amount,
    date: params.date,
    paymentType: 'digital',
    entryType: params.entryType,
    accountId: params.accountId ?? null,
    createdAt: params.createdAt ?? Date.now(),
  }
}

function makeProvider(params: {
  id: string
  name: string
  date: string
  accountId: string
  createdAt?: number
}): Provider {
  const product: BudgetProviderProduct = { id: 'p1', name: 'producto', quantity: 1, price: 0 }
  return {
    id: params.id,
    sync_id: params.id,
    name: params.name,
    date: params.date,
    accountId: params.accountId,
    createdAt: params.createdAt ?? Date.now(),
    products: [product],
  }
}

describe('InicioViewComponent unified totals (LBDS-210 RC4 §2)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const dayStore = useBudgetDayStore()
    dayStore.setSelectedDate('2026-08-31')

    vi.spyOn(accountsController, 'getAccounts').mockReturnValue([
      { id: 'acc1', name: 'Efectivo', initialBalance: 1000, createdAt: 0 },
    ] as never)
    vi.spyOn(budgetEntriesController, 'getEntries').mockReturnValue([
      makeEntry({ id: 'e1', name: 'Sueldo', amount: 5000, date: '2026-08-31', entryType: 'ingreso', accountId: 'acc1' }),
      makeEntry({ id: 'e2', name: 'Super', amount: 1200, date: '2026-08-31', entryType: 'egreso', accountId: 'acc1' }),
      makeEntry({ id: 'e3', name: 'Cine', amount: 300, date: '2026-08-31', entryType: 'egreso', accountId: 'acc1' }),
    ] as never)
    vi.spyOn(budgetProvidersController, 'getProviders').mockReturnValue([
      makeProvider({ id: 'prov1', name: 'Proveedor Hoy', date: '2026-08-31', accountId: 'acc1' }),
      makeProvider({ id: 'prov2', name: 'Proveedor Otro Día', date: '2026-09-01', accountId: 'acc1' }),
    ] as never)
  })

  it('computes totalIngresos/totalEgresos over a single scan with providersToday', async () => {
    const wrapper = mount(InicioViewComponent, {
      global: {
        stubs: {
          AccountCards: {
            props: ['accounts', 'accordion', 'summary'],
            template: '<div data-test="summary">{{ JSON.stringify(summary) }}</div>',
          },
          IonGrid: { template: '<div><slot /></div>' },
          IonRow: { template: '<div><slot /></div>' },
          IonCol: { template: '<div><slot /></div>' },
          IonItem: { template: '<div><slot /></div>' },
          IonLabel: { template: '<span><slot /></span>' },
          IonList: { template: '<div><slot /></div>' },
          IonListHeader: { template: '<div><slot /></div>' },
          IonButton: { template: '<button><slot /></button>' },
          IonIcon: { template: '<i><slot /></i>' },
          IonPopover: { template: '<div><slot /></div>' },
          IonContent: { template: '<div><slot /></div>' },
          IonBadge: { template: '<span><slot /></span>' },
          IonButtons: { template: '<div><slot /></div>' },
        },
      },
    })

    await flushPromises()

    const summary = JSON.parse(wrapper.find('[data-test="summary"]').attributes('data-test') === 'summary'
      ? wrapper.find('[data-test="summary"]').text()
      : '{}')

    // 5000 income − 1200 − 300 expenses = 3500; providersToday sums only day-scoped providers.
    // The provider product has quantity 1 * price 0, so its total is 0 — verify egresos equals
    // the entries-only egresos and that providers are included in the unified list.
    expect(summary.ingresos).toBe(5000)
    expect(summary.egresos).toBe(1500)
    expect(wrapper.text()).toContain('Sueldo')
    expect(wrapper.text()).toContain('Super')
    expect(wrapper.text()).toContain('Cine')
    // Day-scoped provider appears; other-day provider does not leak into unifiedItems.
    expect(wrapper.text()).toContain('Proveedor Hoy')
    expect(wrapper.text()).not.toContain('Proveedor Otro Día')
  })

  it('includes provider product totals in egresos (semantics preserved)', async () => {
    // Give the day provider a real product price.
    vi.spyOn(budgetProvidersController, 'getProviders').mockReturnValue([
      {
        id: 'prov1',
        sync_id: 'prov1',
        name: 'Proveedor Hoy',
        date: '2026-08-31',
        accountId: 'acc1',
        createdAt: Date.now(),
        products: [{ id: 'p1', name: 'producto', quantity: 2, productPrice: 150 }],
      },
    ] as never)

    const wrapper = mount(InicioViewComponent, {
      global: {
        stubs: {
          AccountCards: {
            props: ['accounts', 'accordion', 'summary'],
            template: '<div data-test="summary">{{ JSON.stringify(summary) }}</div>',
          },
          IonGrid: { template: '<div><slot /></div>' },
          IonRow: { template: '<div><slot /></div>' },
          IonCol: { template: '<div><slot /></div>' },
          IonItem: { template: '<div><slot /></div>' },
          IonLabel: { template: '<span><slot /></span>' },
          IonList: { template: '<div><slot /></div>' },
          IonListHeader: { template: '<div><slot /></div>' },
          IonButton: { template: '<button><slot /></button>' },
          IonIcon: { template: '<i><slot /></i>' },
          IonPopover: { template: '<div><slot /></div>' },
          IonContent: { template: '<div><slot /></div>' },
          IonBadge: { template: '<span><slot /></span>' },
          IonButtons: { template: '<div><slot /></div>' },
        },
      },
    })

    await flushPromises()

    const summary = JSON.parse(wrapper.find('[data-test="summary"]').text())
    // Egreso entries (1500) + provider products (2 × 150 = 300) = 1800.
    expect(summary.egresos).toBe(1800)
  })
})