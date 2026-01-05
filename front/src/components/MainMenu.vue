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

          <ion-item
            class="transparent"
            button
            lines="full"
            :class="{ 'menu-active': isSuppliersAccounts }"
            :aria-current="isSuppliersAccounts ? 'page' : undefined"
            @click="navigate({ path: '/suppliers/accounts' })"
          >
            <ion-label>Cuentas</ion-label>
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

          <ion-item
            class="transparent"
            button
            lines="full"
            :class="{ 'menu-active': isPersonalization }"
            :aria-current="isPersonalization ? 'page' : undefined"
            @click="navigate({ name: 'PersonalizationPage' })"
          >
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
  menuController,
} from '@ionic/vue';
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';

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
}
ion-menu .menu-active {
  border-left-width: 4px;
}
</style>
