// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAddIngreso, mockAddEgreso, mockT } = vi.hoisted(() => ({
  mockAddIngreso: vi.fn(async () => undefined),
  mockAddEgreso: vi.fn(async () => undefined),
  mockT: vi.fn((key: string) => key),
}))

vi.mock('@/controllers/budgetEntriesController', () => ({
  default: {
    addIngreso: mockAddIngreso,
    addEgreso: mockAddEgreso,
  },
}))

vi.mock('@/composables/useLocale', () => ({
  useLocale: () => ({ t: mockT }),
}))

import { useAccountBalance } from '@/composables/useAccountBalance'

describe('useAccountBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an income entry when the target balance is above the current one', async () => {
    const { applyTargetBalance } = useAccountBalance()

    const applied = await applyTargetBalance({
      accountId: 'acc-1',
      targetBalance: 1500,
      currentBalance: 1000,
    })

    expect(applied).toBe(true)
    expect(mockAddIngreso).toHaveBeenCalledTimes(1)
    expect(mockAddIngreso).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 500, accountId: 'acc-1' }),
    )
    expect(mockAddEgreso).not.toHaveBeenCalled()
  })

  it('creates an expense entry when the target balance is below the current one', async () => {
    const { applyTargetBalance } = useAccountBalance()

    const applied = await applyTargetBalance({
      accountId: 'acc-1',
      targetBalance: 400,
      currentBalance: 1000,
    })

    expect(applied).toBe(true)
    expect(mockAddEgreso).toHaveBeenCalledTimes(1)
    expect(mockAddEgreso).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 600, accountId: 'acc-1' }),
    )
    expect(mockAddIngreso).not.toHaveBeenCalled()
  })

  it('creates nothing when the target balance already matches the current one', async () => {
    const { applyTargetBalance } = useAccountBalance()

    const applied = await applyTargetBalance({
      accountId: 'acc-1',
      targetBalance: 1000,
      currentBalance: 1000,
    })

    expect(applied).toBe(false)
    expect(mockAddIngreso).not.toHaveBeenCalled()
    expect(mockAddEgreso).not.toHaveBeenCalled()
  })

  it('names the entry with the localized adjustment label', async () => {
    mockT.mockReturnValue('Ajuste de saldo')
    const { applyTargetBalance } = useAccountBalance()

    await applyTargetBalance({ accountId: 'acc-1', targetBalance: 1500, currentBalance: 1000 })

    expect(mockT).toHaveBeenCalledWith('accounts.balanceAdjustment.entryName')
    expect(mockAddIngreso).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ajuste de saldo' }),
    )
  })
})
