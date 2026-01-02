<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button
            :default-href="undefined"
            @click="goBack"
          ></ion-back-button>
        </ion-buttons>
        <ion-title>Personalización</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="6">
            <ion-list>
              <ion-item lines="full">
                <ion-icon slot="start" :icon="colorPaletteOutline"></ion-icon>

                <ion-label>Tema</ion-label>

                <ion-select
                  slot="end"
                  :value="theme"
                  interface="popover"
                  @ion-change="onThemeChange"
                >
                  <ion-select-option value="light">Claro</ion-select-option>
                  <ion-select-option value="dark">Oscuro</ion-select-option>
                  <ion-select-option value="auto">Automático</ion-select-option>
                </ion-select>
              </ion-item>
            </ion-list>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
} from '@ionic/vue';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import systemController from '@/controllers/systemConfigController';
import type { ThemeMode } from '@/stores/useSystemConfig';
import { colorPaletteOutline } from 'ionicons/icons';

const router = useRouter();
const theme = ref<ThemeMode>('auto');

async function loadTheme() {
  theme.value = await systemController.getTheme();
  applyTheme(theme.value);
}

async function onThemeChange(e: CustomEvent) {
  const value = e.detail.value as ThemeMode;
  theme.value = value;
  applyTheme(value);
  await systemController.setTheme({ value });
}

function applyTheme(t: ThemeMode) {
  console.log('applyTheme called with:', t);
  const body = document.body;
  const isDark =
    t === 'dark' ||
    (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  console.log('Adding dark class:', isDark);
  body.classList.toggle('dark', isDark);
  console.log('Body classList:', body.className);
}

function goBack() {
  router.back();
}

onMounted(() => {
  loadTheme();
});
</script>

<style scoped>
.info-section {
  padding: 16px;
}
.info-label p {
  margin: 8px 0;
  color: var(--ion-color-medium);
}
</style>
