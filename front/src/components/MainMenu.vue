<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-menu ref="menuRef" content-id="main-content" type="overlay" menu-id="main-menu">
    <ion-header mode="ios" class="ion-no-border">
      <ion-toolbar>
        <ion-title>{{ appName }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="!isAuthenticated" class="auth-section">
        <ion-item
          button
          lines="none"
          :class="{ 'menu-active': isLogin }"
          :aria-current="isLogin ? 'page' : undefined"
          @click="navigate({ path: '/login' })"
        >
          <ion-icon slot="start" :icon="logInOutline"></ion-icon>
          <ion-label>Iniciar Sesión</ion-label>
        </ion-item>

        <ion-item
          button
          lines="none"
          :class="{ 'menu-active': isRegister }"
          :aria-current="isRegister ? 'page' : undefined"
          @click="navigate({ path: '/register' })"
        >
          <ion-icon slot="start" :icon="personAddOutline"></ion-icon>
          <ion-label>Registrarse</ion-label>
        </ion-item>
      </div>

      <div v-else class="user-section">
        <div class="user-info">
          <ion-icon :icon="personCircleOutline" class="user-avatar"></ion-icon>
          <ion-label class="user-name">{{ userName }}</ion-label>
          <ion-button fill="clear" size="small" class="logout-button" @click="handleLogout">
            <ion-icon :icon="logOutOutline"></ion-icon>
          </ion-button>
        </div>
        <div class="sync-indicator">
          <SyncStatus />
        </div>
      </div>

      <ion-list>
        <div>
          <ion-item
            button
            lines="none"
            :class="{ 'menu-active': isBudget }"
            :aria-current="isBudget ? 'page' : undefined"
            @click="navigate({ name: 'BudgetView' })"
          >
            <ion-icon slot="start" :icon="walletOutline"></ion-icon>
            <ion-label>Presupuesto</ion-label>
          </ion-item>

          <ion-item
            button
            lines="none"
            :class="{ 'menu-active': isHistorial }"
            :aria-current="isHistorial ? 'page' : undefined"
            @click="navigate({ name: 'BudgetHistorial' })"
          >
            <ion-icon slot="start" :icon="calendarOutline"></ion-icon>
            <ion-label>Historial</ion-label>
          </ion-item>

          <ion-item
            button
            lines="none"
            :class="{ 'menu-active': isSuppliers }"
            :aria-current="isSuppliers ? 'page' : undefined"
            @click="navigate({ name: 'SuppliersPage' })"
          >
            <ion-icon slot="start" :icon="businessOutline"></ion-icon>
            <ion-label>Provedores</ion-label>
          </ion-item>

          <ion-item
            button
            lines="none"
            :class="{ 'menu-active': isRecurring }"
            :aria-current="isRecurring ? 'page' : undefined"
            @click="navigate({ name: 'RecurringPage' })"
          >
            <ion-icon slot="start" :icon="repeatOutline"></ion-icon>
            <ion-label>Cargos Recurrentes</ion-label>
          </ion-item>

          <ion-item
            button
            lines="none"
            :class="{ 'menu-active': isSuppliersAccounts }"
            :aria-current="isSuppliersAccounts ? 'page' : undefined"
            @click="navigate({ name: 'AccountsPage' })"
          >
            <ion-icon slot="start" :icon="layersOutline"></ion-icon>
            <ion-label>Cuentas</ion-label>
          </ion-item>

          <ion-item
            button
            lines="none"
            :class="{ 'menu-active': isSync }"
            :aria-current="isSync ? 'page' : undefined"
            @click="navigate({ path: '/sync' })"
          >
            <ion-icon slot="start" :icon="syncOutline"></ion-icon>
            <ion-label>Sincronización</ion-label>
            <ion-badge v-if="conflictCount > 0" slot="end" data-cy="menu-conflict-badge" color="danger">{{
              conflictCount
            }}</ion-badge>
            <ion-badge v-else-if="pendingChanges > 0" slot="end" color="secondary">{{
              pendingChanges
            }}</ion-badge>
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
            @click="navigate({ name: 'CashFlow' })"
          >
            <ion-icon slot="start" :icon="trendingUpOutline"></ion-icon>
            <ion-label>Flujo de Caja</ion-label>
          </ion-item>

          <ion-item
            button
            lines="none"
            :class="{ 'menu-active': isStatisticsPerformance }"
            :aria-current="isStatisticsPerformance ? 'page' : undefined"
            @click="navigate({ name: 'StatisticsPerformance' })"
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
v-if="isUserAdmin"
            button
            lines="none"
            :class="{ 'menu-active': isAdmin }"
            :aria-current="isAdmin ? 'page' : undefined"
            @click="navigate({ name: 'MaintenancePage' })"
          >
            <ion-icon slot="start" :icon="constructOutline"></ion-icon>
            <ion-label>Mantenimiento</ion-label>
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

          <ion-item
v-if="isUserAdmin"
            button
            lines="none"
            :class="{ 'menu-active': isPerformanceTest }"
            :aria-current="isPerformanceTest ? 'page' : undefined"
            @click="navigate({ name: 'PerformanceTest' })"
          >
            <ion-icon slot="start" :icon="speedometerOutline"></ion-icon>
            <ion-label>Pruebas Rendimiento</ion-label>
          </ion-item>
        </div>
      </ion-list>

          <ion-list>
            <ion-list-header>
              <ion-label>Extras</ion-label>
            </ion-list-header>

            <div>
              <ion-item
                button
                lines="none"
                :class="{ 'menu-active': isDownloads }"
                :aria-current="isDownloads ? 'page' : undefined"
                @click="navigate({ name: 'DownloadsPage' })"
              >
                <ion-icon slot="start" :icon="downloadOutline"></ion-icon>
                <ion-label>Descargas</ion-label>
              </ion-item>

              <ion-item
                button
                lines="none"
                :class="{ 'menu-active': isPrivacyPolicy }"
                :aria-current="isPrivacyPolicy ? 'page' : undefined"
                @click="navigate({ name: 'PrivacyPolicyPage' })"
              >
                <ion-icon slot="start" :icon="shieldCheckmarkOutline"></ion-icon>
                <ion-label>Privacidad</ion-label>
              </ion-item>
            </div>
          </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script setup lang="ts">
// Imports
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
  IonButton,
  menuController,
  alertController,
} from '@ionic/vue';
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  walletOutline,
  calendarOutline,
  businessOutline,
  layersOutline,
  repeatOutline,
  syncOutline,
  speedometerOutline,
  constructOutline,
  colorPaletteOutline,
  logInOutline,
  personAddOutline,
  personCircleOutline,
  logOutOutline,
  trendingUpOutline,
  shieldCheckmarkOutline,
  downloadOutline,
} from 'ionicons/icons';
import SyncStatus from './SyncStatus.vue';
// End Imports

// Controllers
import authController from '@/controllers/authController';
import { SyncController } from '@/controllers/syncController';
import { conflictResolutionService } from '@/services/sync/ConflictResolutionService';
// End Controllers

// Components

// Vars
const emit = defineEmits<{
  (e: 'navigate', params: { path?: string; name?: string }): void;
  (e: 'dismissMigration'): void;
}>();

const menuRef = ref();
const route = useRoute();

const syncController = SyncController;
const pendingChanges = computed(() => syncController.getPendingChanges());
const conflictCount = ref(0);

const appName =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_APP_NAME ||
  'Menú';

// End Vars

// Computed
const isBudget = computed(() => route.path === '/budget');
const isHistorial = computed(() => route.path.startsWith('/budget/historial'));
const isSuppliers = computed(() => route.path === '/suppliers');
const isRecurring = computed(() => route.path.startsWith('/recurring'));
const isSuppliersAccounts = computed(() => route.path === '/suppliers/accounts');
const isSync = computed(() => route.path === '/sync');
const isStatisticsCashFlow = computed(() => route.path === '/statistics/cash-flow');
const isStatisticsPerformance = computed(() => route.path === '/statistics/performance');
const isAdmin = computed(() => route.path.startsWith('/admin/maintenance'));
const isPersonalization = computed(() => route.path === '/admin/personalization');
const isPerformanceTest = computed(() => route.path === '/test/performance');
const isPrivacyPolicy = computed(() => route.path === '/privacy-policy');
const isDownloads = computed(() => route.path === '/downloads');

const isLogin = computed(() => route.path === '/login');
const isRegister = computed(() => route.path === '/register');

const isAuthenticated = computed(() => authController.getIsAuthenticated());
const isUserAdmin = computed(() => authController.getIsAdmin());
const userName = computed(() => authController.getUserName());

// End Computed

// Life cycle
onMounted(async () => {
  await authController.checkAuth();
  conflictCount.value = await conflictResolutionService.getStore().getCount();
});

// End Life cycle

// Functions
async function handleLogout() {
  const alert = await alertController.create({
    header: 'Cerrar Sesión',
    message: '¿Estás seguro de que quieres cerrar sesión?',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel',
      },
      {
        text: 'Cerrar Sesión',
        role: 'confirm',
        handler: async () => {
          await authController.logout();
        },
      },
    ],
  });
  await alert.present();
}

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
// End Functions
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
.auth-section {
  padding: 8px 0;
  border-bottom: 1px solid var(--ion-color-step-150);
}
.user-section {
  padding: 16px;
  border-bottom: 1px solid var(--ion-color-step-150);
}
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-avatar {
  font-size: 40px;
  color: var(--ion-color-primary);
}
.user-name {
  flex: 1;
  font-weight: 600;
  font-size: 16px;
}
.logout-button {
  --color: var(--ion-color-medium);
}
.sync-indicator {
  margin-top: 8px;
  padding: 8px;
  border-top: 1px solid var(--ion-color-step-150);
}
</style>
