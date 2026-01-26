<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Performance Test Suite</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>Optimization Tests</ion-card-title>
          <ion-card-subtitle>Test Phase 1 Performance Improvements</ion-card-subtitle>
        </ion-card-header>
        
        <ion-card-content>
          <!-- Memory Test -->
          <ion-item>
            <ion-label>
              <h2>Memory Usage Test</h2>
              <p>Test memory before/after operations</p>
            </ion-label>
            <ion-button slot="end" @click="testMemoryUsage">
              Test Memory
            </ion-button>
          </ion-item>

          <!-- JSON Cloning Test -->
          <ion-item>
            <ion-label>
              <h2>JSON Cloning Test</h2>
              <p>Compare JSON.parse vs structuredClone</p>
            </ion-label>
            <ion-button slot="end" @click="testJSONCloning">
              Test Cloning
            </ion-button>
          </ion-item>

          <!-- Image Compression Test -->
          <ion-item>
            <ion-label>
              <h2>Image Compression Test</h2>
              <p>Test Base64 image compression</p>
            </ion-label>
            <ion-button slot="end" @click="triggerImageTest">
              Test Images
            </ion-button>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              @change="onFileChange"
              style="display: none;"
            />
          </ion-item>

          <!-- Generate Report -->
          <ion-item>
            <ion-label>
              <h2>Generate Report</h2>
              <p>Show performance comparison</p>
            </ion-label>
            <ion-button slot="end" @click="generateReport" color="success">
              Generate Report
            </ion-button>
          </ion-item>

          <!-- Clear Metrics -->
          <ion-item>
            <ion-label>
              <h2>Clear Metrics</h2>
              <p>Reset all test data</p>
            </ion-label>
            <ion-button slot="end" @click="clearMetrics" color="danger">
              Clear
            </ion-button>
          </ion-item>
        </ion-card-content>
      </ion-card>

      <!-- Results Display -->
      <ion-card v-if="testResults.length > 0">
        <ion-card-header>
          <ion-card-title>Test Results</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div v-for="(result, index) in testResults" :key="index">
            <h3>{{ result.test }}</h3>
            <p>{{ result.result }}</p>
            <div class="ion-separator" v-if="index < testResults.length - 1"></div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Current Memory Display -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Current Memory Status</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label>Used Memory</ion-label>
            <ion-note slot="end">{{ formatMemory(memoryStatus.used) }}</ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Total Memory</ion-label>
            <ion-note slot="end">{{ formatMemory(memoryStatus.total) }}</ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Memory Limit</ion-label>
            <ion-note slot="end">{{ formatMemory(memoryStatus.limit) }}</ion-note>
          </ion-item>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardSubtitle, 
  IonCardContent, 
  IonItem, 
  IonLabel, 
  IonButton, 
  IonNote
} from '@ionic/vue';
import { usePerformanceMonitoring } from '@/utils/performanceMonitor';
import { registerCleanup, removeTemporaryElements, useDOMCleanup } from '@/utils/domCleanup';

const {
  startTimer,
  endTimer,
  testJSONCloning: testJSONCloningUtil,
  testImageCompression,
  testMemoryWithDOM,
  generateReport: genReport,
  clearMetrics: clear,
  getMemoryUsage,
} = usePerformanceMonitoring();

const testResults = ref<any[]>([]);
const fileInput = ref<HTMLInputElement>();
const memoryStatus = ref({
  used: 0,
  total: 0,
  limit: 0,
});

// Update memory status periodically
let memoryInterval: NodeJS.Timeout;
// Use DOM cleanup utility
const { registerTask, unregisterCleanup: unregisterTask } = useDOMCleanup();

onMounted(() => {
  updateMemoryStatus();
  memoryInterval = setInterval(updateMemoryStatus, 2000);
  
  // Remove any existing temporary elements on mount
  removeTemporaryElements();
});

onUnmounted(() => {
  // Clear memory interval
  if (memoryInterval) {
    clearInterval(memoryInterval);
  }
  
  // Clean up all temporary elements
  removeTemporaryElements();
});

function updateMemoryStatus() {
  const memory = getMemoryUsage();
  memoryStatus.value = {
    used: memory.usedJSHeapSize,
    total: memory.totalJSHeapSize,
    limit: memory.jsHeapSizeLimit,
  };
}

function formatMemory(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function testMemoryUsage() {
  // Ensure document and body exist before proceeding
  if (!document || !document.body) {
    console.error('Document or document.body is not available');
    return;
  }

  // Create isolated container to prevent DOM pollution
  const testContainer = document.createElement('div');
  testContainer.style.position = 'absolute';
  testContainer.style.left = '-9999px';
  testContainer.style.visibility = 'hidden';
  testContainer.setAttribute('data-performance-test', 'container');
  document.body.appendChild(testContainer);
  
  // Register cleanup task
  registerTask('memory-test-container', () => {
    if (testContainer.parentNode) {
      testContainer.parentNode.removeChild(testContainer);
    }
  }, testContainer);
  
  testMemoryWithDOM(() => {
    // Ensure document exists before creating elements
    if (!document) {
      console.error('Document is not available');
      return;
    }

    const container = document.createElement('div');
    container.setAttribute('data-test-container', 'true');
    
    for (let i = 0; i < 100; i++) {
      const div = document.createElement('div');
      div.innerHTML = `<p>Test element ${i}</p>`;
      div.setAttribute('data-test-element', 'true');
      container.appendChild(div);
    }
    
    // Add to isolated container first
    testContainer.appendChild(container);
    
    // Immediate cleanup instead of timeout to prevent race conditions
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    
    // Clean up test container
    unregisterTask('memory-test-container');
  });

  testResults.value.push({
    test: 'Memory Usage Test',
    result: 'Memory test completed - check console for details',
  });
}

function runJSONCloningTest() {
  // Create a large test object
  const testObj = {
    array: new Array(1000).fill(0).map((_, i) => ({
      id: i,
      name: `Item ${i}`,
      data: new Array(100).fill(0).map((_, j) => ({ nested: j, value: Math.random() })),
    })),
    metadata: {
      timestamp: Date.now(),
      version: '1.0.0',
      description: 'Large test object for JSON cloning performance comparison',
    },
  };

  // Test with 100 iterations
  testJSONCloningUtil(testObj, 100);

  testResults.value.push({
    test: 'JSON Cloning Performance',
    result: 'JSON cloning test completed - check console for timing comparison',
  });
}

function testJSONCloning() {
  runJSONCloningTest();
}

function triggerImageTest() {
  fileInput.value?.click();
}

async function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (file) {
    await testImageCompression(file);
    
    testResults.value.push({
      test: 'Image Compression Test',
      result: 'Image compression test completed - check console for compression ratios',
    });
  }
}

function generateReport() {
  genReport();
  
  testResults.value.push({
    test: 'Performance Report',
    result: 'Full performance report generated - check console for complete analysis',
  });
}

function clearMetrics() {
  clear();
  testResults.value = [];
}
</script>

<style scoped>
ion-card {
  margin: 16px;
}

ion-item {
  --padding-start: 16px;
  --padding-end: 16px;
}

.test-results {
  margin-top: 16px;
}

.test-results h3 {
  color: var(--ion-color-primary);
  margin-bottom: 8px;
}

.test-results p {
  margin-bottom: 16px;
}

.ion-separator {
  height: 1px;
  background: var(--ion-color-light);
  margin: 16px 0;
}
</style>