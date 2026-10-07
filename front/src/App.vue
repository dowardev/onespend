<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-app>
    <!-- DOM Cleanup Component (invisible) -->
    <DOMCleanupComponent />

    <!-- Dev-mode footer (visible on every screen until the user dismisses it). -->
    <DevModeBanner />

    <ion-split-pane when="(min-width: 992px)" content-id="main-content">
      <MainMenu
        ref="menuRef"
        @navigate="handleNavigate"
      />
      <ion-router-outlet id="main-content" />


    </ion-split-pane>
  </ion-app>
</template>

<script setup lang="ts">
// Imports
import {
  IonApp,
  IonSplitPane,
  IonRouterOutlet,
  menuController,
  isPlatform,
} from '@ionic/vue';
import { onMounted, onBeforeUnmount, ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import MainMenu from '@/components/MainMenu.vue';
import DOMCleanupComponent from '@/components/DOMCleanupComponent.vue';
import DevModeBanner from '@/components/DevModeBanner.vue';
import { useAuthStore } from '@/stores/authStore';
import { useLocale } from '@/composables/useLocale';
// End Imports

// Controllers
import systemController from '@/controllers/systemConfigController';
import authController from '@/controllers/authController';
import accountsController from '@/controllers/accountsController';
import { initRecurringProcessor, stopRecurringProcessor } from '@/services/recurringProcessor';
// End Controllers

// Components
const menuRef = ref();

const appName =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_APP_NAME ||
  'Menú';
const router = useRouter();
const { t } = useLocale();

const toast = reactive({ open: false, message: '', duration: 3000 });
// End Vars

// Functions
function setDesignMode() {
  const platform = isPlatform('ios') ? 'ios' : 'md';
  systemController.setDesignMode({ mode: platform });
}

async function applyTheme() {
  const theme = await systemController.getTheme();
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (document.body) {
    document.body.classList.remove(
      'dark',
      'catppuccin-latte-maroon',
      'catppuccin-macchiato-maroon',
    );
  }

  if (theme === 'catppuccin-latte-maroon' || theme === 'catppuccin-macchiato-maroon') {
    if (document.body) {
      document.body.classList.add(theme);
    }
  } else {
    const isDark = theme === 'dark' || (theme === 'auto' && prefersDark);
    if (document.body) {
      document.body.classList.toggle('dark', isDark);
    }
  }
}

function setupThemeListener() {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    const theme = await systemController.getTheme();
    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (document.body) {
        document.body.classList.toggle('dark', isDark);
      }
    }
  });
}

async function handleNavigate(params: { path?: string; name?: string }) {
  try {
    if (params.name) {
      try {
        if (
          'hasRoute' in router &&
          typeof router.hasRoute === 'function' &&
          router.hasRoute(params.name)
        ) {
          await router.push({ name: params.name });
        } else if (params.path) {
          await router.push(params.path);
        } else {
          if (params.name === 'MaintenancePage') {
            await router.push('/admin/maintenance');
          } else {
            console.error('navigate: unknown route name and no path provided', params.name);
          }
        }
      } catch (err) {
        console.warn('navigate named push failed, trying path fallback', err);
        if (params.path) await router.push(params.path);
      }
    } else if (params.path) {
      await router.push(params.path);
    }
  } catch (err) {
    console.error('navigate failed', err);
  }
}

// End Functions

onBeforeUnmount(() => {
  stopRecurringProcessor();
});

// Life cycle
  onMounted(async () => {
  setDesignMode();
  setupThemeListener();
  await applyTheme();

  await accountsController.loadAll();

  await authController.checkAuth();

  // DEV-only auth bypass for e2e tests: when VITE_DEV_BYPASS_AUTH is set, pretend we
  // are authenticated so gated screens (e.g. the recurring list) render without a real
  // SSO session. Production is unaffected (flag is dev-only).
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH) {
    useAuthStore().setUser({
      id: 1,
      name: 'Dev Bypass',
      user: 'dev',
      email: 'dev@example.com',
      isAdmin: true,
    });
  }

  // Background recurring auto-insert: only run with a valid session so we don't write
  // entries or queue sync attributed to the wrong account. BudgetView re-invokes the
  // processor per viewed date (and that screen is auth-gated), so ungated boots skip it.
  if (useAuthStore().isAuthenticated) {
    await initRecurringProcessor();
  }

  try {
    if (window && window.innerWidth >= 992) {
      try {
        await menuController.open('main-menu');
      } catch (_e) {
        if (menuRef.value && menuRef.value.$el && menuRef.value.$el.open) {
          menuRef.value.$el.open();
        }
      }
    }
  } catch (_e) {}
});
// End Life cycle
</script>

<style>
@media (min-width: 992px) {
  ion-split-pane {
    --side-width: 300px;
  }
}

button.alert-button.danger-alert-btn {
  color: var(--ion-color-danger);
}
</style>
