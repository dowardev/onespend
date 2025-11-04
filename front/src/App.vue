<template>
  <ion-app>
    <ion-split-pane content-id="main-content" when="lg">
      <ion-menu content-id="main-content">
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
              @click="router.push('/budget')"
            >
              <ion-label>Presupuesto</ion-label>
            </ion-item>

            <ion-item
              button
              lines="full"
              :class="{ 'menu-active': isTemplates }"
              :aria-current="isTemplates ? 'page' : undefined"
              @click="router.push('/templates')"
            >
              <ion-label>Templates</ion-label>
            </ion-item>

            <ion-item
              button
              lines="full"
              :class="{ 'menu-active': isSuppliers }"
              :aria-current="isSuppliers ? 'page' : undefined"
              @click="router.push('/suppliers')"
            >
              <ion-label>Provedores</ion-label>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-menu>

      <ion-router-outlet id="main-content" />
    </ion-split-pane>
  </ion-app>
</template>

<script setup lang="ts">
import {
  IonApp,
  IonRouterOutlet,
  IonMenu,
  IonSplitPane,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/vue';
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
const appName =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_APP_NAME || 'Menú';
const router = useRouter();
const route = useRoute();
const isBudget = computed(() => route.path === '/budget');
const isTemplates = computed(() => route.path === '/templates');
const isSuppliers = computed(() => route.path === '/suppliers');
</script>

<style>
/* Minimal: active menu indicator (subtle left border + soft background) */
.menu-active {
  border-left: 4px solid var(--ion-color-primary);
  /* reducir contraste manteniendo legibilidad */
  background-color: rgba(0, 0, 0, 0.03);
  --padding-start: 12px;
}

/* Mejor ajuste en pantallas grandes dentro del ion-menu */
ion-menu .menu-active {
  border-left-width: 4px;
}

@media (min-width: 992px) {
  ion-split-pane {
    --side-width: 300px;
    /* --side-min-width: 260px;
    --side-max-width: 360px; */
  }
}
</style>
