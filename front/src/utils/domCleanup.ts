// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// DOM Cleanup utilities to prevent memory leaks and contamination
import { onUnmounted } from 'vue';

interface CleanupTask {
  id: string;
  cleanup: () => void;
  element?: Element;
}

class DOMCleanupManager {
  private cleanupTasks: Map<string, CleanupTask> = new Map();
  private observer?: MutationObserver;

  constructor() {
    this.setupObserver();
  }

  // Register a cleanup task for an element
  registerCleanup(id: string, cleanup: () => void, element?: Element): void {
    // Clean up any existing task with the same ID
    if (this.cleanupTasks.has(id)) {
      this.unregisterCleanup(id);
    }

    const task: CleanupTask = {
      id,
      cleanup: () => {
        try {
          cleanup();
        } catch (error) {
          console.warn(`[DOMCleanup] Cleanup task ${id} failed:`, error);
        }
      },
      element,
    };

    this.cleanupTasks.set(id, task);
  }

  // Unregister a specific cleanup task
  unregisterCleanup(id: string): void {
    const task = this.cleanupTasks.get(id);
    if (task) {
      task.cleanup();
      this.cleanupTasks.delete(id);
    }
  }

  // Clean up all registered tasks
  cleanupAll(): void {
    this.cleanupTasks.forEach((task) => task.cleanup());
    this.cleanupTasks.clear();
  }

  // Remove elements with specific attributes
  removeElementsByAttribute(attributeName: string, attributeValue?: string): void {
    const selector = attributeValue
      ? `[${attributeName}="${attributeValue}"]`
      : `[${attributeName}]`;

    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
  }

  // Setup mutation observer to detect and clean up orphaned elements
  private setupObserver(): void {
    if (typeof MutationObserver === 'undefined') return;

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;

              // Check for temporary elements that might be left behind
              if (
                element.hasAttribute('data-chart-colors-temp') ||
                element.hasAttribute('data-performance-test') ||
                (element.classList && element.classList.contains('temp-element'))
              ) {
                // Auto-cleanup temporary elements after a short delay
                setTimeout(() => {
                  if (element.parentNode) {
                    element.parentNode.removeChild(element);
                  }
                }, 100);
              }
            }
          });
        }
      });
    });

    // Start observing the entire document
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Stop the observer
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }
    this.cleanupAll();
  }

  // Get current cleanup tasks count
  getTaskCount(): number {
    return this.cleanupTasks.size;
  }

  // Log current state for debugging
  logState(): void {
    console.log('[DOMCleanup] Current cleanup tasks:', this.cleanupTasks.size);
    this.cleanupTasks.forEach((task, id) => {
      console.log(`[DOMCleanup] Task: ${id}, Element:`, task.element);
    });
  }
}

// Global instance
export const domCleanup = new DOMCleanupManager();

// Export utilities for easy use
export function registerCleanup(id: string, cleanup: () => void, element?: Element): void {
  domCleanup.registerCleanup(id, cleanup, element);
}

export function unregisterCleanup(id: string): void {
  domCleanup.unregisterCleanup(id);
}

export function cleanupAll(): void {
  domCleanup.cleanupAll();
}

export function removeTemporaryElements(): void {
  // Remove common temporary elements
  domCleanup.removeElementsByAttribute('data-chart-colors-temp');
  domCleanup.removeElementsByAttribute('data-performance-test');
  domCleanup.removeElementsByAttribute('data-test-container');
  domCleanup.removeElementsByAttribute('data-test-element');

  // Remove elements with common temporary classes
  const tempElements = document.querySelectorAll('.temp-element, .cleanup-me');
  tempElements.forEach((element) => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
}

// Auto-cleanup on route navigation
export function setupNavigationCleanup(router: any): void {
  if (router && router.beforeEach) {
    router.beforeEach(() => {
      removeTemporaryElements();
      return true;
    });
  }
}

// Vue composable for easy use in components
export function useDOMCleanup() {
  const cleanupTasks = new Set<string>();

  const registerTask = (id: string, cleanup: () => void, element?: Element) => {
    registerCleanup(id, cleanup, element);
    cleanupTasks.add(id);
  };

  onUnmounted(() => {
    cleanupTasks.forEach((id) => {
      unregisterCleanup(id);
    });
    cleanupTasks.clear();
  });

  return {
    registerTask,
    unregisterCleanup,
    cleanupAll,
    removeTemporaryElements,
  };
}
