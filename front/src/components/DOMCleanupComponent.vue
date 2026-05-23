<template>
  <!-- This component is invisible and handles DOM cleanup -->
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { domCleanup, removeTemporaryElements } from '@/utils/domCleanup';

// Cleanup interval to periodically check for orphaned elements
let cleanupInterval: NodeJS.Timeout;

onMounted(() => {
  // Initial cleanup
  removeTemporaryElements();

  // Set up periodic cleanup (every 5 seconds)
  cleanupInterval = setInterval(() => {
    removeTemporaryElements();

    // Log cleanup state for debugging
    if (import.meta.env.DEV) {
      const taskCount = domCleanup.getTaskCount();
      // if (taskCount > 0) {
      //   console.log(`[DOMCleanup] Active cleanup tasks: ${taskCount}`);
      // }
    }
  }, 5000);
});

onUnmounted(() => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  // Final cleanup
  removeTemporaryElements();
});
</script>
