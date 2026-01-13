<template>
  <ion-app>
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
import systemController from '@/controllers/systemConfigController';
import dixieController from '@/controllers/dixie';
import authController from '@/controllers/authController';
import {
  needsNormalizeCheck,
  migrateNormalizeBackupDates,
} from '@/migrations/normalizeBackupsDates';
import { needsEntriesKeyCheck } from '@/migrations/addEntriesKeyToBackups';

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

onMounted(async () => {
  setDesignMode();
  setupThemeListener();
  await applyTheme();

  await authController.checkAuth();

  // Check whether the user already dismissed the migration notice
  migrationDismissed.value = !!systemController.getMigrationNoticeDismissed();

  // Quick check to see if normalization or entries migration is needed; open toast only if required
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
      // console.log('App.onMounted: needsNormalizeCheck ->', normalizeNeeded);
      // console.log('App.onMounted: needsEntriesKeyCheck ->', entriesNeeded);
      try {
        const backups = await dixieController.listBackups();
        // console.log(
        //   'App.onMounted: backups count ->',
        //   Array.isArray(backups) ? backups.length : backups
        // );
      } catch (e) {
        console.error('App.onMounted: failed to listBackups', e);
      }
    }

    // DEBUG: auto-insert removed. Use admin tools to add test data when needed.
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
      // console.log('App.onMounted: not opening toast', {
      //   needsNormalize: needsNormalize.value,
      //   needsEntries: needsEntries.value,
      //   migrationDismissed: migrationDismissed.value,
      // });
    }
  }

  // Debug: try to open the menu programmatically on large screens
  try {
    if (window && window.innerWidth >= 992) {
      // use ref to open the menu if available
      // try the menuController api first
      try {
        await menuController.open('main-menu');
      } catch (_e) {
        // fallback to reference DOM open if menuController fails
        if (menuRef.value && menuRef.value.$el && menuRef.value.$el.open) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          menuRef.value.$el.open();
        }
      }
    }
  } catch (_e) {
    // ignore
  }
});

function setDesignMode() {
  const platform = isPlatform('ios') ? 'ios' : 'md';
  systemController.setDesignMode({ mode: platform });
}

async function applyTheme() {
  const theme = await systemController.getTheme();
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  document.body.classList.remove(
    'dark',
    'catppuccin-latte-maroon',
    'catppuccin-macchiato-maroon'
  );

  if (
    theme === 'catppuccin-latte-maroon' ||
    theme === 'catppuccin-macchiato-maroon'
  ) {
    document.body.classList.add(theme);
  } else {
    const isDark = theme === 'dark' || (theme === 'auto' && prefersDark);
    document.body.classList.toggle('dark', isDark);
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
        document.body.classList.toggle('dark', isDark);
      }
    });
}

// CAMBIO: Usar ref directa del menú
async function handleNavigate(params: { path?: string; name?: string }) {
  try {
    if (params.name) {
      // prefer named route but fallback if it's not registered
      try {
        if ((router as any).hasRoute && (router as any).hasRoute(params.name)) {
          await router.push({ name: params.name });
        } else if (params.path) {
          await router.push(params.path);
        } else {
          // Known fallbacks for admin routes
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
    // pass query via direct router push to preserve ?autoDryRun behavior
    try {
      await router.push({ name: 'MigrateDates', query: { autoDryRun: '1' } });
    } catch (e) {
      console.error('navigate to MigrateDates failed', e);
    }
  } catch (e) {
    console.error(e);
  }
}
</script>

<style>
@media (min-width: 992px) {
  ion-split-pane {
    --side-width: 300px;
  }
}
</style>
