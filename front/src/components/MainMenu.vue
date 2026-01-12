<template>
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
        <div >
          <ion-item
            button
            lines="none"
            :class="{ 'menu-active': isBudget }"
            :aria-current="isBudget ? 'page' : undefined"
            @click="navigate({ path: '/budget' })"
          >
            <ion-icon slot="start" :icon="walletOutline"></ion-icon>
            <ion-label>Presupuesto</ion-label>
          </ion-item>

          <ion-item
            button
            lines="none"
            :class="{ 'menu-active': isTemplates }"
            :aria-current="isTemplates ? 'page' : undefined"
            @click="navigate({ path: '/templates' })"
          >
            <ion-icon slot="start" :icon="documentTextOutline"></ion-icon>
            <ion-label>Templates</ion-label>
          </ion-item>

          <ion-item
            button
            lines="none"
            :class="{ 'menu-active': isSuppliers }"
            :aria-current="isSuppliers ? 'page' : undefined"
            @click="navigate({ path: '/suppliers' })"
          >
            <ion-icon slot="start" :icon="businessOutline"></ion-icon>
            <ion-label>Provedores</ion-label>
          </ion-item>

          <ion-item
            button
            lines="none"
            :class="{ 'menu-active': isSuppliersAccounts }"
            :aria-current="isSuppliersAccounts ? 'page' : undefined"
            @click="navigate({ path: '/suppliers/accounts' })"
          >
            <ion-icon slot="start" :icon="layersOutline"></ion-icon>
            <ion-label>Cuentas</ion-label>
          </ion-item>
        </div>
      </ion-list>

      <ion-list>
        <ion-list-header>
          <ion-label>Estadisticas</ion-label>
        </ion-list-header>

        <div>
          <ion-item
            button
            lines="none"
            :class="{ 'menu-active': isStatisticsCashFlow }"
            :aria-current="isStatisticsCashFlow ? 'page' : undefined"
            @click="navigate({ path: '/statistics/cash-flow' })"
          >
            <ion-icon slot="start" :icon="statsChartOutline"></ion-icon>
            <ion-label>Flujo de caja</ion-label>
          </ion-item>

          <ion-item
            button
            lines="none"
            :class="{ 'menu-active': isStatisticsPerformance }"
            :aria-current="isStatisticsPerformance ? 'page' : undefined"
            @click="navigate({ path: '/statistics/performance' })"
          >
            <ion-icon slot="start" :icon="speedometerOutline"></ion-icon>
            <ion-label>Rendimiento</ion-label>
          </ion-item>
        </div>
      </ion-list>

      <ion-list>
        <ion-list-header>
          <ion-label>Administracion</ion-label>
        </ion-list-header>

        <div>
          <ion-item
            button
            lines="none"
            :class="{ 'menu-active': isAdmin }"
            :aria-current="isAdmin ? 'page' : undefined"
            @click="navigate({ name: 'MaintenancePage' })"
          >
            <ion-icon slot="start" :icon="constructOutline"></ion-icon>
            <ion-label>Mantenimiento</ion-label>
            <ion-badge
              v-if="(needsNormalize || needsEntries) && !migrationDismissed"
              slot="end"
              color="danger"
              >!</ion-badge
            >
          </ion-item>

          <ion-item
            button
            lines="none"
            :class="{ 'menu-active': isPersonalization }"
            :aria-current="isPersonalization ? 'page' : undefined"
            @click="navigate({ name: 'PersonalizationPage' })"
          >
            <ion-icon slot="start" :icon="colorPaletteOutline"></ion-icon>
            <ion-label>Personalización</ion-label>
          </ion-item>
        </div>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script setup lang="ts">
import {
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonListHeader,
  IonIcon,
  menuController,
} from '@ionic/vue';
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  walletOutline,
  documentTextOutline,
  businessOutline,
  layersOutline,
  statsChartOutline,
  speedometerOutline,
  constructOutline,
  colorPaletteOutline,
} from 'ionicons/icons';

const emit = defineEmits<{
  (e: 'navigate', params: { path?: string; name?: string }): void;
  (e: 'dismissMigration'): void;
}>();

const menuRef = ref();
const route = useRoute();

const appName =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_APP_NAME || 'Menú';

const isBudget = computed(() => route.path === '/budget');
const isTemplates = computed(() => route.path === '/templates');
const isSuppliers = computed(() => route.path === '/suppliers');
const isSuppliersAccounts = computed(
  () => route.path === '/suppliers/accounts'
);
const isStatisticsCashFlow = computed(
  () => route.path === '/statistics/cash-flow'
);
const isStatisticsPerformance = computed(
  () => route.path === '/statistics/performance'
);
const isAdmin = computed(() => route.path.startsWith('/admin/maintenance'));
const isPersonalization = computed(
  () => route.path === '/admin/personalization'
);

defineProps<{
  needsNormalize: boolean;
  needsEntries: boolean;
  migrationDismissed: boolean;
}>();

async function navigate(params: { path?: string; name?: string }) {
  try {
    await menuController.close('main-menu');
  } catch (_e) {
    try {
      if (menuRef.value && menuRef.value.$el && menuRef.value.$el.close) {
        await menuRef.value.$el.close();
      }
    } catch (__e) {
      console.warn('menuRef close fallback failed:', __e);
    }
  }
  emit('navigate', params);
}
</script>

<style>
.menu-active {
  border-left: 4px solid var(--ion-color-primary);
  --padding-start: 12px;
  --background: rgba(var(--ion-color-primary-rgb), 0.08);
}
ion-menu .menu-active {
  border-left-width: 4px;
}
</style>
