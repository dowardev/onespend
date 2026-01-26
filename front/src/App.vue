<template>
  <ion-app>
    <!-- DOM Cleanup Component (invisible) -->
    <DOMCleanupComponent />
    
    <ion-split-pane when="(min-width: 992px)" content-id="main-content">
      <MainMenu
        ref="menuRef"
        :needs-normalize="needsNormalize"
        :needs-entries="needsEntries"
        :migration-dismissed="migrationDismissed"
        @navigate="handleNavigate"
        @dismiss-migration="dismissMigrationNotice"
      />
      <ion-router-outlet id="main-content" />

      <!-- toasts -->
      <ion-toast
        :is-open="migrationToast.open"
        :message="migrationToast.message"
        :buttons="migrationToast.buttons"
        @did-dismiss="() => (migrationToast.open = false)"
      />
      <!-- toasts -->
    </ion-split-pane>
  </ion-app>
</template>

<script setup lang="ts">
// Imports
import {
  IonApp,
  IonSplitPane,
  IonRouterOutlet,
  IonToast,
  menuController,
  isPlatform,
} from '@ionic/vue';
import { onMounted, ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import MainMenu from '@/components/MainMenu.vue';
import DOMCleanupComponent from '@/components/DOMCleanupComponent.vue';
import {
  needsNormalizeCheck,
  migrateNormalizeBackupDates,
} from '@/migrations/normalizeBackupsDates';
import { needsEntriesKeyCheck } from '@/migrations/addEntriesKeyToBackups';
// End Imports

// Controllers
import systemController from '@/controllers/systemConfigController';
import dixieController from '@/controllers/dixie';
import authController from '@/controllers/authController';
// End Controllers

// Components
const menuRef = ref();

const appName =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_APP_NAME || 'Menú';
const router = useRouter();

const needsNormalize = ref(false);
const needsEntries = ref(false);
const migrationDismissed = ref(false);
const toast = reactive({ open: false, message: '', duration: 3000 });
const migrationToast = reactive({
  open: false,
  message:
    'Actualización disponible: Se detectaron datos que requieren migración. Recomendamos crear una copia de seguridad y ejecutar la migración.',
  buttons: [
    {
      side: 'end',
      text: 'Ir a migración',
      handler: () => {
        if (needsEntries.value) handleNavigate({ name: 'MigrateEntries' });
        else handleNavigate({ name: 'MigrateDates' });
      },
    },
    {
      side: 'end',
      text: 'Descartar',
      role: 'cancel',
      handler: () => {
        migrationToast.open = false;
        dismissMigrationNotice();
      },
    },
  ],
});
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
      'catppuccin-macchiato-maroon'
    );
  }

  if (
    theme === 'catppuccin-latte-maroon' ||
    theme === 'catppuccin-macchiato-maroon'
  ) {
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
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', async () => {
      const theme = await systemController.getTheme();
      if (theme === 'auto') {
        const isDark = window.matchMedia(
          '(prefers-color-scheme: dark)'
        ).matches;
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
        if ('hasRoute' in router && typeof router.hasRoute === 'function' && (router as VueRouter).hasRoute(params.name)) {
          await router.push({ name: params.name });
        } else if (params.path) {
          await router.push(params.path);
        } else {
          if (params.name === 'MaintenancePage') {
            await router.push('/admin/maintenance');
          } else if (params.name === 'MigrateDates') {
            await router.push('/admin/maintenance/migrate-dates');
          } else {
            console.error(
              'navigate: unknown route name and no path provided',
              params.name
            );
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

function dismissMigrationNotice() {
  migrationDismissed.value = true;
  systemController.setMigrationNoticeDismissed({ value: true });
}

async function showMigrationToast() {
  try {
    toast.message =
      'Simulación iniciada: revisa la pantalla de migración para ver los detalles.';
    toast.open = true;
    handleNavigate({ name: 'MigrateDates' });
    try {
      await router.push({ name: 'MigrateDates', query: { autoDryRun: '1' } });
    } catch (e) {
      console.error('navigate to MigrateDates failed', e);
    }
  } catch (e) {
    console.error(e);
  }
}
// End Functions

// Life cycle
onMounted(async () => {
  setDesignMode();
  setupThemeListener();
  await applyTheme();

  await authController.checkAuth();

  migrationDismissed.value = !!systemController.getMigrationNoticeDismissed();

  try {
    const [normalizeNeeded, entriesNeeded] = await Promise.all([
      needsNormalizeCheck(),
      needsEntriesKeyCheck(),
    ]);
    needsNormalize.value = !!normalizeNeeded;
    needsEntries.value = !!entriesNeeded;
    if (
      (import.meta as unknown as { env?: Record<string, string | undefined> })
        .env?.DEV
    ) {
      try {
        const backups = await dixieController.listBackups();
      } catch (e) {
        console.error('App.onMounted: failed to listBackups', e);
      }
    }
  } catch (e) {
    console.error('migration checks failed', e);
    needsNormalize.value = false;
    needsEntries.value = false;
  }

  if (
    (needsEntries.value || needsNormalize.value) &&
    !migrationDismissed.value
  ) {
    if (
      (import.meta as unknown as { env?: Record<string, string | undefined> })
        .env?.DEV
    ) {
      console.log('App.onMounted: opening migration toast', {
        needsNormalize: needsNormalize.value,
        needsEntries: needsEntries.value,
      });
    }
    migrationToast.open = true;
  } else {
    if (
      (import.meta as unknown as { env?: Record<string, string | undefined> })
        .env?.DEV
    ) {
    }
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
  } catch (_e) {
  }
});
// End Life cycle
</script>

<style>
@media (min-width: 992px) {
  ion-split-pane {
    --side-width: 300px;
  }
}
</style>
