// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import { IonicVue } from '@ionic/vue';
import { i18n, detectSystemLocale } from './i18n';
import { configDb } from './db/controllers/configDb';

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
import { App as CapacitorApp } from '@capacitor/app';
import { setSSOClient } from '@/ssoClientAccessor';
import { useAuthStore } from '@/stores/authStore';
import { useAccountsStore } from '@/stores/accountsStore';
import { useBudgetEntriesStore } from '@/stores/budgetEntriesStore';
import { useBudgetProvidersStore } from '@/stores/budgetProvidersStore';
import { useSuppliersStore } from '@/stores/suppliersStore';
import { useSsoNativeReturn } from '@/composables/useSsoNativeReturn';
import { syncService } from '@/services/syncService';
import authController from '@/controllers/authController';
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
import { SSOClient } from '@dowardev/sso-client';
import {
  getSsoBaseUrl,
  getSsoFrontendUrl,
  defaultSsoBaseUrl,
  defaultSsoFrontendUrl,
  ssoUrlOrPlaceholder,
  SSO_NOT_CONFIGURED_URL,
} from './services/sso/ssoConfig';
// LBDS-295: resolve SSO URLs from configDb at boot so self-hosters
// can point login at their own SSO without rebuilding the APK. The
// VITE constants stay as the build-time default (used when the row is
// missing, empty, or malformed — see `ssoConfig.ts`). Top-level
// await is fine here: main.ts is an ES module executed by Vite before
// any consumer can import @/ssoClientAccessor or @/controllers/authController,
// and configDb reads against Dexie resolve in a few ms in practice.
//
// T-01 (pre-merge review): if configDb fails to open (e.g. Dexie
// migration pending, IndexedDB permission, schema upgrade error), the
// module-level await would otherwise throw before `createApp` runs and
// crash the entire app boot with no UI. Fall back to the env-var
// defaults — the same path a fresh install takes when configDb has no
// rows yet — so the app still starts and login still works against the
// bundled server. The user can re-open Settings later and the row will
// be read normally once the DB is healthy.
let ssoBaseUrl: string
let ssoFrontendUrl: string
try {
  ;[ssoBaseUrl, ssoFrontendUrl] = await Promise.all([
    getSsoBaseUrl(),
    getSsoFrontendUrl(),
  ])
} catch (configDbError) {
  console.warn(
    '[main] Could not read SSO URLs from configDb; falling back to the env-var defaults:',
    configDbError,
  )
  ssoBaseUrl = defaultSsoBaseUrl()
  ssoFrontendUrl = defaultSsoFrontendUrl()
}
// The SSO client throws when it gets an invalid URL, and that throw would
// happen while this module is being imported: the app would never mount and
// the user would see a blank screen. Build the client with a placeholder
// host when there is no SSO server configured, so the app always boots and
// the login attempt fails with a message instead.
const ssoApiUrl = ssoUrlOrPlaceholder({ url: ssoBaseUrl })
const ssoLoginUrl = ssoUrlOrPlaceholder({ url: ssoFrontendUrl })
const apiBaseUrl = ssoUrlOrPlaceholder({ url: import.meta.env.VITE_API_URL || '' })
if (
  ssoApiUrl === SSO_NOT_CONFIGURED_URL ||
  ssoLoginUrl === SSO_NOT_CONFIGURED_URL ||
  apiBaseUrl === SSO_NOT_CONFIGURED_URL
) {
  console.warn(
    '[main] No SSO server configured; login will not reach a server until one is set.',
  )
}
const ssoClient = new SSOClient({
  ssoUrl: ssoApiUrl,
  ssoFrontendUrl: ssoLoginUrl,
  // The client refuses to be built without a client id either. It is only
  // meaningful against a real SSO server, so a placeholder is enough to keep
  // the app booting when none is configured.
  clientId: import.meta.env.VITE_SSO_CLIENT_ID || 'not-configured',
  apiBaseUrl,
})
export { ssoClient }

setSSOClient(ssoClient);

// Native SSO return: on Android the login runs in the external browser and
// comes back as a com.dowardev.onespend://auth/callback deep link.
const ssoNativeReturn = useSsoNativeReturn();
void ssoNativeReturn
  .start({ router })
  .then(async () => {
    try {
      const launchUrl = await CapacitorApp.getLaunchUrl();
      if (launchUrl?.url) {
        await ssoNativeReturn.handleAppUrl({ url: launchUrl.url, router });
      }
    } catch (launchError) {
      console.warn('[sso-native] Could not handle launch URL:', launchError);
    }
  })
  .catch((startError) => {
    console.warn('[sso-native] Could not start native return listener:', startError);
  });

// Sync SSO auth state with Pinia store — registered BEFORE init() so the initial
// authenticated event (valid token already in storage) is never missed.
ssoClient.onAuthStateChange((state) => {
  const authStore = useAuthStore();
  if (state.isAuthenticated && state.user) {
    authStore.setUser({
      id: Number(state.user.id),
      name: state.user.name || '',
      user: state.user.user || '',
      email: state.user.email || '',
      isAdmin: Boolean((state.user as { is_admin?: boolean }).is_admin),
    });
    // LBDS-289: fullSyncAndSave no-ops when sync is disabled in Settings,
    // so a fresh install (F-Droid) does not fire a single HTTP request on
    // login until the user explicitly opts in. The SSO token is still
    // kept — auth is local, only data sync is opt-in.
    syncService.fullSyncAndSave(async () => {
      try {
        const dayStore = useBudgetDayStore();
        await dayStore.loadBudgetForDate({ date: dayStore.selectedDate });
      } catch (e) {
        console.warn('[main] Failed to reload budget after sync:', e);
      }
    }).catch(console.error);
  } else {
    // LBDS-289: logout() is now async (awaits IndexedDB delete and
    // latches the loggedOut flag). The synchronous in-memory clear
    // happens before this call returns its Promise, so the rest of
    // the boot path is unaffected.
    void authStore.logout();
  }
});

try {
  (window as any).budgetEntriesController = budgetEntriesController;
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

// LBDS-289: resolve the initial locale from the user's override (stored
// in configDb under `languageOverride`) or, when there is no override,
// from `navigator.language`. Must run before the app mounts so the very
// first paint already shows the chosen language — otherwise the
// Spanish defaults flash for a frame on every cold start.
async function resolveInitialLocale(): Promise<'es' | 'en'> {
  const stored = await configDb.get({ key: 'languageOverride' });
  if (stored === 'es' || stored === 'en') return stored;
  return detectSystemLocale();
}

const app = createApp(App).use(IonicVue).use(router).use(pinia).use(i18n);

// Mount-first: the app is offline-first (local Dexie data), so first paint must
// never wait on the external SSO. Auth resolution runs in parallel below.
void router.isReady().then(async () => {
  // Locale is read from IndexedDB before mount so the first render
  // already uses the right language. The promise is awaited
  // synchronously here (no `void`): a single frame of the wrong
  // language on a fresh install is enough to make the app feel
  // broken on non-es devices.
  const initialLocale = await resolveInitialLocale();
  i18n.global.locale.value = initialLocale;
  app.mount('#app');
  logBreakpoint();

  const resizeListener = () => logBreakpoint();
  window.addEventListener('resize', resizeListener);

  try {
    // @ts-expect-error expose for debugging
    window.budgetEntriesController = budgetEntriesController;
    // @ts-expect-error expose for debugging
    window.budgetProvidersController = budgetProvidersController;
  } catch (e) {
    void e;
  }
});

// Resolve SSO/auth in parallel with the mount. init() reads the stored token and
// calls the SSO server getUser() only when a token exists; a slow or unreachable
// SSO no longer blanks the UI. checkAuth must run after init because it reads
// ssoClient.isAuthenticated (set during init).
void ssoClient.init()
  .then(async () => {
    await authController.checkAuth();
    authController.start();
  })
  .catch(async (e) => {
    console.warn('[main] SSO init failed — staying offline-first with local data:', e);
    await authController.checkAuth();
    authController.start();
  });
