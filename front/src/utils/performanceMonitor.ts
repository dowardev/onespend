// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

export interface SyncMetrics {
  avg: number
  min: number
  max: number
  count: number
}

interface TestResult {
  test: string
  result: string
  duration?: number
  metrics?: string
}

class PerformanceMonitor {
  private measurements: Record<string, { start: number; durations: number[] }> = {}

  private testResults: TestResult[] = []

  startSyncMeasurement(operation: string): void {
    if (!this.measurements[operation]) {
      this.measurements[operation] = { start: 0, durations: [] }
    }
    this.measurements[operation].start = performance.now()
  }

  endSyncMeasurement(operation: string): number {
    const measurement = this.measurements[operation]
    if (!measurement || measurement.start === 0) return 0

    const duration = performance.now() - measurement.start
    measurement.durations.push(duration)
    measurement.start = 0

    return duration
  }

  getMetrics(): Record<string, SyncMetrics> {
    const result: Record<string, SyncMetrics> = {}

    for (const [operation, data] of Object.entries(this.measurements)) {
      if (data.durations.length === 0) continue

      const sum = data.durations.reduce((a, b) => a + b, 0)
      result[operation] = {
        avg: sum / data.durations.length,
        min: Math.min(...data.durations),
        max: Math.max(...data.durations),
        count: data.durations.length,
      }
    }

    return result
  }

  reset(): void {
    this.measurements = {}
    this.testResults = []
  }

  addTestResult(result: TestResult): void {
    this.testResults.push(result)
  }

  getTestResults(): TestResult[] {
    return this.testResults
  }
}

export const performanceMonitor = new PerformanceMonitor()

function formatBytes(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

function getMemoryInfo() {
  const mem = (performance as unknown as Record<string, unknown>).memory as
    | { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number }
    | undefined
  return mem ?? { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 }
}

export function usePerformanceMonitoring() {
  function startTimer(operation: string): void {
    performanceMonitor.startSyncMeasurement(operation)
  }

  function endTimer(operation: string): number {
    const duration = performanceMonitor.endSyncMeasurement(operation)
    console.log(`[Performance] ${operation}: ${duration.toFixed(2)}ms`)
    return duration
  }

  function getMemoryUsage() {
    return getMemoryInfo()
  }

  function testJSONCloning(obj: unknown, iterations: number): void {
    let jsonParseTime = 0
    let structuredCloneTime = 0

    for (let i = 0; i < iterations; i++) {
      const t1 = performance.now()
      JSON.parse(JSON.stringify(obj))
      jsonParseTime += performance.now() - t1

      const t2 = performance.now()
      structuredClone(obj as any)
      structuredCloneTime += performance.now() - t2
    }

    const avgJson = jsonParseTime / iterations
    const avgStructured = structuredCloneTime / iterations
    const faster = avgJson < avgStructured ? 'JSON.parse' : 'structuredClone'
    const ratio = avgJson > 0 ? (avgStructured / avgJson).toFixed(2) : 'N/A'

    const msg = `JSON.parse: ${avgJson.toFixed(3)}ms avg, structuredClone: ${avgStructured.toFixed(3)}ms avg (${faster} es ${ratio}x más rápido)`
    console.log(`[Performance] JSON Cloning: ${msg}`)

    performanceMonitor.addTestResult({
      test: 'JSON Cloning',
      result: msg,
      duration: Math.min(avgJson, avgStructured),
    })
  }

  async function testImageCompression(file: File): Promise<void> {
    const startTime = performance.now()
    const maxWidth = 800
    const maxHeight = 800
    const quality = 0.7

    const base64 = await fileToBase64(file)
    const compressed = await compressBase64Image(base64, maxWidth, maxHeight, quality)

    const duration = performance.now() - startTime
    const originalSize = file.size
    const compressedSize = Math.round((compressed.length * 3) / 4)
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1)

    const msg = `Original: ${formatBytes(originalSize)} → Comprimido: ${formatBytes(compressedSize)} (${ratio}% reducción, ${duration.toFixed(0)}ms)`
    console.log(`[Performance] Image Compression: ${msg}`)

    performanceMonitor.addTestResult({
      test: 'Image Compression',
      result: msg,
      duration,
    })
  }

  function testMemoryWithDOM(callback: () => void): void {
    const before = getMemoryInfo()
    callback()
    const after = getMemoryInfo()

    const usedDelta = after.usedJSHeapSize - before.usedJSHeapSize
    const msg = `Memoria antes: ${formatBytes(before.usedJSHeapSize)}, después: ${formatBytes(after.usedJSHeapSize)}, delta: ${formatBytes(usedDelta)}`
    console.log(`[Performance] DOM Memory: ${msg}`)

    performanceMonitor.addTestResult({
      test: 'DOM Memory',
      result: msg,
      metrics: `delta: ${formatBytes(usedDelta)}`,
    })
  }

  function generateReport(): void {
    const metrics = performanceMonitor.getMetrics()
    const testResults = performanceMonitor.getTestResults()

    console.log('=== Performance Report ===')
    console.log('')

    if (Object.keys(metrics).length > 0) {
      console.log('--- Sync Metrics ---')
      for (const [op, data] of Object.entries(metrics)) {
        console.log(`${op}: avg=${data.avg.toFixed(2)}ms, min=${data.min.toFixed(2)}ms, max=${data.max.toFixed(2)}ms, count=${data.count}`)
      }
    }

    if (testResults.length > 0) {
      console.log('')
      console.log('--- Test Results ---')
      for (const r of testResults) {
        console.log(`${r.test}: ${r.result}`)
      }
    }

    console.log('')
    console.log('=== End Report ===')
  }

  function clearMetrics(): void {
    performanceMonitor.reset()
    console.log('[Performance] Metrics cleared')
  }

  return {
    startTimer,
    endTimer,
    testJSONCloning,
    testImageCompression,
    testMemoryWithDOM,
    generateReport,
    clearMetrics,
    getMemoryUsage,
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function compressBase64Image(base64: string, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = base64
  })
}
