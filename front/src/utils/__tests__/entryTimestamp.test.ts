// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest'
import { entryTimestamp } from '../entryTimestamp'

describe('entryTimestamp', () => {
  it('combines date and time into a Date at the correct local time', () => {
    const result = entryTimestamp({ date: '2026-10-18', time: '14:30' })
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(9) // October is 0-indexed
    expect(result.getDate()).toBe(18)
    expect(result.getHours()).toBe(14)
    expect(result.getMinutes()).toBe(30)
    expect(result.getSeconds()).toBe(0)
  })

  it('defaults to 00:00 when time is missing', () => {
    const result = entryTimestamp({ date: '2026-10-18', time: undefined })
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(9)
    expect(result.getDate()).toBe(18)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
  })

  it('handles single-digit hour (H:MM format)', () => {
    const result = entryTimestamp({ date: '2026-10-18', time: '9:00' })
    expect(result.getHours()).toBe(9)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
  })

  it('ignores time component in date string and uses time field', () => {
    const result = entryTimestamp({ date: '2026-10-18T00:00:00', time: '14:30' })
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(9)
    expect(result.getDate()).toBe(18)
    expect(result.getHours()).toBe(14)
    expect(result.getMinutes()).toBe(30)
    expect(result.getSeconds()).toBe(0)
  })

  it('returns Invalid Date when date is empty string', () => {
    const result = entryTimestamp({ date: '', time: '14:30' })
    expect(Number.isNaN(result.getTime())).toBe(true)
  })

  it('returns Invalid Date when date is undefined', () => {
    const result = entryTimestamp({ date: undefined, time: '14:30' })
    expect(Number.isNaN(result.getTime())).toBe(true)
  })

  it('returns Invalid Date when date is null', () => {
    const result = entryTimestamp({ date: null as any, time: '14:30' })
    expect(Number.isNaN(result.getTime())).toBe(true)
  })
})