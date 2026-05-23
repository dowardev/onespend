// Performance monitoring utilities for testing optimizations

interface PerformanceMetrics {
  memory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  timing: {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private activeTimers: Map<string, number> = new Map();

  // Memory monitoring
  getMemoryUsage(): PerformanceMetrics['memory'] {
    if (!performance.memory) {
      console.warn('Performance memory API not available');
      return { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 };
    }
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    };
  }

  // Timer functions
  startTimer(name: string): void {
    this.activeTimers.set(name, performance.now());
  }

  endTimer(name: string): number {
    const startTime = this.activeTimers.get(name);
    if (!startTime) {
      console.warn(`Timer '${name}' was not started`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    this.activeTimers.delete(name);
    this.recordMetric({
      memory: this.getMemoryUsage(),
      timing: {
        name,
        startTime,
        endTime,
        duration,
      },
    });

    return duration;
  }

  // JSON cloning performance test
  testJSONCloning(obj: any, iterations = 1000): void {
    this.startTimer('json-parse-stringify');

    for (let i = 0; i < iterations; i++) {
      JSON.parse(JSON.stringify(obj));
    }

    this.endTimer('json-parse-stringify');

    this.startTimer('structured-clone');

    for (let i = 0; i < iterations; i++) {
      structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
    }

    this.endTimer('structured-clone');
  }

  // Image compression test
  testImageCompression(file: File): Promise<void> {
    return new Promise((resolve) => {
      this.startTimer('original-image-size');
      const reader = new FileReader();
      const objectURLs: string[] = []; // Track created URLs for cleanup

      reader.onload = () => {
        const originalSize = String(reader.result).length;
        this.endTimer('original-image-size');

        this.startTimer('image-compression');

        const img = new Image();
        const objectURL = URL.createObjectURL(file);
        objectURLs.push(objectURL);

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;

          const maxSize = 1024;
          let { width, height } = img;

          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', 0.6);
          const compressedSize = compressed.length;

          this.endTimer('image-compression');

          console.log(`Image compression results:`);
          console.log(`Original size: ${(originalSize / 1024).toFixed(2)} KB`);
          console.log(`Compressed size: ${(compressedSize / 1024).toFixed(2)} KB`);
          console.log(
            `Compression ratio: ${((1 - compressedSize / originalSize) * 100).toFixed(1)}%`,
          );

          // Cleanup object URLs to prevent memory leaks
          objectURLs.forEach((url) => {
            try {
              URL.revokeObjectURL(url);
            } catch (e) {
              console.warn('Failed to revoke object URL:', e);
            }
          });

          resolve();
        };

        img.onerror = () => {
          // Cleanup on error
          objectURLs.forEach((url) => {
            try {
              URL.revokeObjectURL(url);
            } catch (e) {
              console.warn('Failed to revoke object URL on error:', e);
            }
          });
          resolve();
        };

        img.src = objectURL;
      };
      reader.readAsDataURL(file);
    });
  }

  // Memory monitoring for DOM elements
  testMemoryWithDOM(callback: () => void): void {
    const memoryBefore = this.getMemoryUsage();
    callback();
    const memoryAfter = this.getMemoryUsage();

    const memoryDiff = memoryAfter.usedJSHeapSize - memoryBefore.usedJSHeapSize;
    console.log(`Memory usage change: ${(memoryDiff / 1024 / 1024).toFixed(2)} MB`);
  }

  // Record metrics
  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
  }

  // Generate report
  generateReport(): void {
    console.log('\n=== Performance Test Report ===');

    // Memory metrics
    const currentMemory = this.getMemoryUsage();
    console.log('\n--- Current Memory Usage ---');
    console.log(`Used: ${(currentMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total: ${(currentMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Limit: ${(currentMemory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);

    // Timing metrics
    console.log('\n--- Performance Timings ---');
    const timingMetrics = this.metrics.map((m) => m.timing).filter((t) => t.duration !== undefined);
    timingMetrics.forEach((metric) => {
      if (metric.duration !== undefined) {
        console.log(`${metric.name}: ${metric.duration.toFixed(2)} ms`);
      }
    });

    // Compare JSON cloning methods
    const parseStringify = timingMetrics.find((t) => t.name === 'json-parse-stringify');
    const structuredClone = timingMetrics.find((t) => t.name === 'structured-clone');

    if (parseStringify && structuredClone && parseStringify.duration && structuredClone.duration) {
      const improvement =
        ((parseStringify.duration - structuredClone.duration) / parseStringify.duration) * 100;
      console.log('\n--- JSON Cloning Comparison ---');
      console.log(`JSON.parse(JSON.stringify()): ${parseStringify.duration.toFixed(2)} ms`);
      console.log(`structuredClone(): ${structuredClone.duration.toFixed(2)} ms`);
      console.log(`Performance improvement: ${improvement.toFixed(1)}%`);
    }

    console.log('\n=== End Report ===\n');
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics = [];
    this.activeTimers.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Export for use in components
export function usePerformanceMonitoring() {
  return {
    startTimer: performanceMonitor.startTimer.bind(performanceMonitor),
    endTimer: performanceMonitor.endTimer.bind(performanceMonitor),
    testJSONCloning: performanceMonitor.testJSONCloning.bind(performanceMonitor),
    testImageCompression: performanceMonitor.testImageCompression.bind(performanceMonitor),
    testMemoryWithDOM: performanceMonitor.testMemoryWithDOM.bind(performanceMonitor),
    generateReport: performanceMonitor.generateReport.bind(performanceMonitor),
    clearMetrics: performanceMonitor.clearMetrics.bind(performanceMonitor),
    getMemoryUsage: performanceMonitor.getMemoryUsage.bind(performanceMonitor),
  };
}
