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

/* Theme variables */
import './theme/variables.css';

import { createPinia, setActivePinia } from 'pinia';
import { setSSOClient } from '@/ssoClientAccessor';
import { useAuthStore } from '@/stores/authStore';
import { useAccountsStore } from '@/stores/accountsStore';
import { useBudgetEntriesStore } from '@/stores/budgetEntriesStore';
import { useBudgetProvidersStore } from '@/stores/budgetProvidersStore';
import { useSuppliersStore } from '@/stores/suppliersStore';
import { syncService } from '@/services/syncService';
import budgetEntriesController from './controllers/budgetEntriesController';
import budgetProvidersController from './controllers/budgetProvidersController';
import { useBudgetDayStore } from './stores/budgetDayStore';

const pinia = createPinia();
setActivePinia(pinia);

// Eager-init stores so Pinia is ready when DataMediator feeds them
useAccountsStore();
useBudgetEntriesStore();
useBudgetProvidersStore();
useSuppliersStore();

// SSO Client
import { SSOClient } from '@tu-org/sso-client';
const ssoClient = new SSOClient({
  ssoUrl: import.meta.env.VITE_SSO_URL,
  ssoFrontendUrl: import.meta.env.VITE_SSO_FRONTEND_URL,
  clientId: import.meta.env.VITE_SSO_CLIENT_ID,
  apiBaseUrl: import.meta.env.VITE_API_URL,
});
await ssoClient.init();
export { ssoClient };

setSSOClient(ssoClient);

// Sync SSO auth state with Pinia store
ssoClient.onAuthStateChange((state) => {
  const authStore = useAuthStore();
  if (state.isAuthenticated && state.user) {
    authStore.setUser({
      id: Number(state.user.id),
      name: state.user.name || '',
      user: state.user.user || '',
      email: state.user.email || '',
    });
    // Trigger initial sync after login
    syncService.fullSyncAndSave(async () => {
      try {
        const dayStore = useBudgetDayStore();
        await dayStore.loadBudgetForDate({ date: dayStore.selectedDate });
      } catch (e) {
        console.warn('[main] Failed to reload budget after sync:', e);
      }
    }).catch(console.error);
  } else {
    authStore.logout();
  }
});

try {
  // @ts-ignore
  (window as any).budgetEntriesController = budgetEntriesController;
  // @ts-ignore
  (window as any).budgetProvidersController = budgetProvidersController;
} catch (e) {
  void e;
}

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

const app = createApp(App).use(IonicVue).use(router).use(pinia);

router.isReady().then(async () => {
  try {
    console.log('[main] Loading budget data before mount');
    try {
      const dayStore = useBudgetDayStore();
      await dayStore.loadBudgetForDate({ date: dayStore.selectedDate });
    } catch (e) {
      console.warn('[main] loadDataForDate failed', e);
    }
  } catch (e) {
    void e;
  }

  app.mount('#app');
  logBreakpoint();

  const resizeListener = () => logBreakpoint();
  window.addEventListener('resize', resizeListener);

  app.unmount = () => {
    window.removeEventListener('resize', resizeListener);
    const originalUnmount = app.unmount;
    if (originalUnmount) originalUnmount();
  };

  try {
    // @ts-ignore
    window.budgetEntriesController = budgetEntriesController;
    // @ts-ignore
    window.budgetProvidersController = budgetProvidersController;
  } catch (e) {
    void e;
  }
});
