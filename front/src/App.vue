<template>
  <ion-app>
    <ion-split-pane when="(min-width: 992px)" content-id="main-content">
      <ion-menu
        ref="menuRef"
        content-id="main-content"
        type="overlay"
        menu-id="main-menu"
      >
        <ion-header mode="ios" class="ion-no-border">
          <ion-toolbar>
            <ion-title>{{ appName }}</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-list>
            <div class="list-content">
              <ion-item
                class="transparent"
                button
                lines="full"
                :class="{ 'menu-active': isBudget }"
                :aria-current="isBudget ? 'page' : undefined"
                @click="navigate({ path: '/budget' })"
              >
                <ion-label>Presupuesto</ion-label>
              </ion-item>

              <ion-item
                class="transparent"
                button
                lines="full"
                :class="{ 'menu-active': isTemplates }"
                :aria-current="isTemplates ? 'page' : undefined"
                @click="navigate({ path: '/templates' })"
              >
                <ion-label>Templates</ion-label>
              </ion-item>

              <ion-item
                class="transparent"
                button
                lines="full"
                :class="{ 'menu-active': isSuppliers }"
                :aria-current="isSuppliers ? 'page' : undefined"
                @click="navigate({ path: '/suppliers' })"
              >
                <ion-label>Provedores</ion-label>
              </ion-item>
            </div>
          </ion-list>

          <ion-list>
            <ion-list-header>
              <ion-label>Estadisticas</ion-label>
            </ion-list-header>

            <div class="list-content">
              <ion-item
                class="transparent"
                button
                lines="full"
                :class="{ 'menu-active': isStatisticsCashFlow }"
                :aria-current="isStatisticsCashFlow ? 'page' : undefined"
                @click="navigate({ path: '/statistics/cash-flow' })"
              >
                <ion-label>Flujo de caja</ion-label>
              </ion-item>

              <ion-item
                class="transparent"
                button
                lines="full"
                :class="{ 'menu-active': isStatisticsPerformance }"
                :aria-current="isStatisticsPerformance ? 'page' : undefined"
                @click="navigate({ path: '/statistics/performance' })"
              >
                <ion-label>Rendimiento</ion-label>
              </ion-item>
            </div>
          </ion-list>

          <ion-list>
            <ion-list-header>
              <ion-label>Administracion</ion-label>
            </ion-list-header>

            <div class="list-content">
              <ion-item
                class="transparent"
                button
                lines="full"
                :class="{ 'menu-active': isAdmin }"
                :aria-current="isAdmin ? 'page' : undefined"
                @click="navigate({ name: 'MaintenancePage' })"
              >
                <ion-label>Mantenimiento</ion-label>
                <ion-badge
                  v-if="(needsNormalize || needsEntries) && !migrationDismissed"
                  slot="end"
                  color="danger"
                  >!</ion-badge
                >
              </ion-item>
            </div>
          </ion-list>
        </ion-content>
      </ion-menu>
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
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonToast,
  menuController,
  isPlatform,
} from '@ionic/vue';
import { computed, onMounted, ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import systemController from '@/controllers/systemConfigController';
import dixieController from '@/controllers/dixie';
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
const route = useRoute();
const isBudget = computed(() => route.path === '/budget');
const isTemplates = computed(() => route.path === '/templates');
const isSuppliers = computed(() => route.path === '/suppliers');
const isStatisticsCashFlow = computed(
  () => route.path === '/statistics/cash-flow'
);
const isStatisticsPerformance = computed(
  () => route.path === '/statistics/performance'
);

// mark admin routes as active when the current path is under /admin
const isAdmin = computed(() => route.path.startsWith('/admin'));

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
        // If entries migration is needed prefer that page, otherwise dates migration
        if (needsEntries.value) navigate({ name: 'MigrateEntries' });
        else navigate({ name: 'MigrateDates' });
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

// CAMBIO: Usar ref directa del menú
async function navigate(params: { path?: string; name?: string }) {
  try {
    // try menuController API first (preferred)
    try {
      await menuController.close('main-menu');
    } catch (_e) {
      // fallback to direct ref if menuController fails
      try {
        if (menuRef.value && menuRef.value.$el && menuRef.value.$el.close) {
          // @ts-ignore
          await menuRef.value.$el.close();
        }
      } catch (__e) {
        console.warn('menuRef close fallback failed:', __e);
      }
    }
  } catch (_e) {
    console.warn('menuController.close() overall failed:', _e);
  }
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
    // also navigate to migration screen and trigger autoDryRun via query
    navigate({ name: 'MigrateDates', path: undefined });
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
.menu-active {
  border-left: 4px solid var(--ion-color-primary);
  /* background-color: rgba(0, 0, 0, 0.03); */
  --padding-start: 12px;
}
ion-menu .menu-active {
  border-left-width: 4px;
}
@media (min-width: 992px) {
  ion-split-pane {
    --side-width: 300px;
  }
}
</style>
