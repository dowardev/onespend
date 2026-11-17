// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest'
import { resolveConflictFields } from '@/controllers/lookupResolver'

describe('conflict modal currency', () => {
  it('formats amounts with the app currency instead of euros', async () => {
    const fields = await resolveConflictFields({
      clientData: { amount: 1500 },
      serverData: { amount: 1500 },
    })

    const amount = fields.find((field) => field.field === 'amount')

    expect(amount).toBeDefined()
    // The app formats money with es-MX + MXN everywhere else. The conflict
    // modal used to hardcode EUR, the leftover of the first sync scaffolding.
    expect(amount!.serverDisplay).toBe('$1,500.00')
    expect(amount!.serverDisplay).not.toContain('€')
  })
})
