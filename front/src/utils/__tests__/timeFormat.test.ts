// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// LBDS-273 (GitLab #13): the canonical "HH:MM" shape for the optional
// time field. The client and the server must agree byte for byte on this
// value, because the server computes the conflict-detection field hash
// over the value it receives and compares it against the hash of the
// stored row.

import { describe, it, expect } from 'vitest'
import { normalizeTime } from '../timeFormat'

describe('normalizeTime', () => {
  it('keeps a well-formed HH:MM value as-is', () => {
    expect(normalizeTime('14:30')).toBe('14:30')
  })

  it('zero-pads a single-digit hour (MySQL does the same on read)', () => {
    expect(normalizeTime('9:00')).toBe('09:00')
  })

  it('drops the seconds of a MySQL TIME value', () => {
    expect(normalizeTime('14:30:00')).toBe('14:30')
    expect(normalizeTime('09:00:00')).toBe('09:00')
  })

  it('returns undefined for an absent value', () => {
    expect(normalizeTime(null)).toBeUndefined()
    expect(normalizeTime(undefined)).toBeUndefined()
    expect(normalizeTime('')).toBeUndefined()
  })

  it('returns undefined for a value that is not a time of day', () => {
    expect(normalizeTime('abcde')).toBeUndefined()
    expect(normalizeTime('14')).toBeUndefined()
    expect(normalizeTime('99:99')).toBeUndefined()
    expect(normalizeTime('25:00')).toBeUndefined()
    expect(normalizeTime('12:60')).toBeUndefined()
    expect(normalizeTime('1e1:00')).toBeUndefined()
  })

  it('tolerates surrounding whitespace, like the server normalizers do', () => {
    // The client normalizer, the server's processor and the model's
    // accessor have to agree character for character: a tolerance only one
    // of them has would make the client and the server hash different
    // strings and raise a phantom conflict.
    expect(normalizeTime(' 9:00 ')).toBe('09:00')
    expect(normalizeTime('14 : 30')).toBe('14:30')
  })

  it('is idempotent', () => {
    expect(normalizeTime(normalizeTime('9:00'))).toBe('09:00')
    expect(normalizeTime(normalizeTime('14:30'))).toBe('14:30')
  })
})
