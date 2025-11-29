<template>
  <ion-app>
    <ion-menu
      ref="menuRef"
      content-id="main-content"
      type="reveal"
      menu-id="main-menu"
    >
      <ion-header mode="ios" class="ion-no-border">
        <ion-toolbar>
          <ion-title>{{ appName }}</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-list>
          <ion-item
            button
            lines="full"
            :class="{ 'menu-active': isBudget }"
            :aria-current="isBudget ? 'page' : undefined"
            @click="navigate({ path: '/budget' })"
          >
            <ion-label>Presupuesto</ion-label>
          </ion-item>
          <ion-item
            button
            lines="full"
            :class="{ 'menu-active': isTemplates }"
            :aria-current="isTemplates ? 'page' : undefined"
            @click="navigate({ path: '/templates' })"
          >
            <ion-label>Templates</ion-label>
          </ion-item>
          <ion-item
            button
            lines="full"
            :class="{ 'menu-active': isSuppliers }"
            :aria-current="isSuppliers ? 'page' : undefined"
            @click="navigate({ path: '/suppliers' })"
          >
            <ion-label>Provedores</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-menu>
    <ion-router-outlet id="main-content" />
  </ion-app>
</template>

<script setup lang="ts">
import {
  IonApp,
  IonRouterOutlet,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  isPlatform,
} from '@ionic/vue';
import { computed, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import systemController from '@/controllers/systemConfigController';

const menuRef = ref();

const appName =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_APP_NAME || 'Menú';
const router = useRouter();
const route = useRoute();
const isBudget = computed(() => route.path === '/budget');
const isTemplates = computed(() => route.path === '/templates');
const isSuppliers = computed(() => route.path === '/suppliers');

onMounted(() => {
  setDesignMode();
});

function setDesignMode() {
  const platform = isPlatform('ios') ? 'ios' : 'md';
  systemController.setDesignMode({ mode: platform });
}

// CAMBIO: Usar ref directa del menú
async function navigate(params: { path: string }) {
  const { path } = params;
  try {
    if (menuRef.value && menuRef.value.$el) {
      await menuRef.value.$el.close();
    }
  } catch (_e) {
    console.warn('menuController.close() failed:', _e);
  }
  router.push(path);
}
</script>

<style>
.menu-active {
  border-left: 4px solid var(--ion-color-primary);
  background-color: rgba(0, 0, 0, 0.03);
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
