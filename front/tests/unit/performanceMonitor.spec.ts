// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { performanceMonitor } from '@/utils/performanceMonitor'

describe('PerformanceMonitor', () => {
  let now = 0

  beforeEach(() => {
    now = 0
    performanceMonitor.reset()
    vi.spyOn(performance, 'now').mockImplementation(() => now)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should measure sync duration correctly', () => {
    now = 1000
    performanceMonitor.startSyncMeasurement('getChanges')
    now = 2500
    const duration = performanceMonitor.endSyncMeasurement('getChanges')

    expect(duration).toBe(1500)
  })

  it('should record multiple measurements', () => {
    now = 1000
    performanceMonitor.startSyncMeasurement('getChanges')
    now = 1500
    performanceMonitor.endSyncMeasurement('getChanges')

    performanceMonitor.startSyncMeasurement('merge')
    now = 2300
    performanceMonitor.endSyncMeasurement('merge')

    const metrics = performanceMonitor.getMetrics()
    expect(metrics.getChanges.avg).toBe(500)
    expect(metrics.merge.avg).toBe(800)
  })

  it('should return empty metrics when no measurements taken', () => {
    const metrics = performanceMonitor.getMetrics()
    expect(metrics).toEqual({})
  })

  it('should aggregate multiple measurements of same operation', () => {
    now = 1000
    performanceMonitor.startSyncMeasurement('getChanges')
    now = 1100
    performanceMonitor.endSyncMeasurement('getChanges')

    performanceMonitor.startSyncMeasurement('getChanges')
    now = 1400
    performanceMonitor.endSyncMeasurement('getChanges')

    const metrics = performanceMonitor.getMetrics()
    expect(metrics.getChanges.count).toBe(2)
    expect(metrics.getChanges.avg).toBe(200)
    expect(metrics.getChanges.min).toBe(100)
    expect(metrics.getChanges.max).toBe(300)
  })

  it('should return 0 for unstarted measurement', () => {
    const duration = performanceMonitor.endSyncMeasurement('nonexistent')
    expect(duration).toBe(0)
  })
})
