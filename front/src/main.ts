import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* @import '@ionic/vue/css/palettes/dark.always.css'; */
/* @import '@ionic/vue/css/palettes/dark.class.css'; */
// import "@ionic/vue/css/palettes/dark.system.css";

/* Theme variables */
import './theme/variables.css';

import { createPinia } from 'pinia';
import budgetEntriesController from './controllers/budgetEntriesController';
import budgetProvidersController from './controllers/budgetProvidersController';
import { useBudgetDayStore } from './stores/budgetDayStore';

// Expose controllers globally in development for MCP/debugging
try {
  // @ts-ignore
  (window as any).budgetEntriesController = budgetEntriesController;
  // @ts-ignore
  (window as any).budgetProvidersController = budgetProvidersController;
} catch (e) {}

function getIonicBreakpoint(): string {
  const width = window.innerWidth;
  if (width >= 1200) return 'xl';
  if (width >= 992) return 'lg';
  if (width >= 768) return 'md';
  if (width >= 576) return 'sm';
  return 'xs';
}

function logBreakpoint() {
  console.log(`Ionic Breakpoint: ${getIonicBreakpoint()} (width: ${window.innerWidth}px)`);
}

const pinia = createPinia();
const app = createApp(App).use(IonicVue).use(router).use(pinia);

router.isReady().then(async () => {
  try {
    // Load budget data for the current selected date before mounting to ensure UI
    // renders persisted entries immediately after load.
    // eslint-disable-next-line no-console
    console.log('[main] Loading budget data before mount');
    // budget controllers may perform IndexedDB operations; await completion.
    // If it fails, continue mounting so app is usable.
    try {
      const dayStore = useBudgetDayStore();
      await dayStore.loadBudgetForDate({ date: dayStore.selectedDate });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[main] loadDataForDate failed', e);
    }
  } catch (e) {}

  app.mount('#app');
  logBreakpoint();

  // Add resize listener with cleanup support
  const resizeListener = () => logBreakpoint();
  window.addEventListener('resize', resizeListener);

  // Cleanup on app unmount (if needed)
  app.unmount = () => {
    window.removeEventListener('resize', resizeListener);
    // Call original unmount
    const originalUnmount = app.unmount;
    if (originalUnmount) originalUnmount();
  };
  // Expose controllers for debugging in development (MCP/DevTools).
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.budgetEntriesController = budgetEntriesController;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.budgetProvidersController = budgetProvidersController;
  } catch (e) {}
});
