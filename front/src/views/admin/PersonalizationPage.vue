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
                  <ion-select-option value="catppuccin-latte-maroon">Catppuccin Latte Maroon</ion-select-option>
                  <ion-select-option value="catppuccin-macchiato-maroon">Catppuccin Macchiato Maroon</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item v-if="theme === 'auto'" lines="full">
                <ion-icon slot="start" :icon="sunnyOutline"></ion-icon>
                <ion-label>Modo claro</ion-label>
                <ion-select
                  slot="end"
                  :value="autoLightTheme"
                  interface="popover"
                  @ion-change="onAutoLightThemeChange"
                >
                  <ion-select-option value="light">Claro</ion-select-option>
                  <ion-select-option value="catppuccin-latte-maroon">Catppuccin Latte Maroon</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item v-if="theme === 'auto'" lines="full">
                <ion-icon slot="start" :icon="moonOutline"></ion-icon>
                <ion-label>Modo oscuro</ion-label>
                <ion-select
                  slot="end"
                  :value="autoDarkTheme"
                  interface="popover"
                  @ion-change="onAutoDarkThemeChange"
                >
                  <ion-select-option value="dark">Oscuro</ion-select-option>
                  <ion-select-option value="catppuccin-macchiato-maroon">Catppuccin Macchiato Maroon</ion-select-option>
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
import { colorPaletteOutline, sunnyOutline, moonOutline } from 'ionicons/icons';

const router = useRouter();
const theme = ref<ThemeMode>('auto');
const autoLightTheme = ref<ThemeMode>('light');
const autoDarkTheme = ref<ThemeMode>('dark');

async function loadTheme() {
  theme.value = await systemController.getTheme();
  autoLightTheme.value = await systemController.getAutoLightTheme();
  autoDarkTheme.value = await systemController.getAutoDarkTheme();
  applyTheme(theme.value);
}

async function onThemeChange(e: CustomEvent) {
  const value = e.detail.value as ThemeMode;
  theme.value = value;
  applyTheme(value);
  await systemController.setTheme({ value });
}

async function onAutoLightThemeChange(e: CustomEvent) {
  const value = e.detail.value as ThemeMode;
  autoLightTheme.value = value;
  await systemController.setAutoLightTheme({ value });
  if (theme.value === 'auto') {
    applyTheme('auto');
  }
}

async function onAutoDarkThemeChange(e: CustomEvent) {
  const value = e.detail.value as ThemeMode;
  autoDarkTheme.value = value;
  await systemController.setAutoDarkTheme({ value });
  if (theme.value === 'auto') {
    applyTheme('auto');
  }
}

function applyTheme(t: ThemeMode | string) {
  console.log('applyTheme called with:', t);
  const body = document.body;
  
  body.classList.remove('dark', 'catppuccin-latte-maroon', 'catppuccin-macchiato-maroon');
  
  let themeToApply = t;
  
  if (t === 'auto') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log('System prefers dark:', isDark);
    console.log('autoLightTheme:', autoLightTheme.value);
    console.log('autoDarkTheme:', autoDarkTheme.value);
    themeToApply = isDark ? autoDarkTheme.value : autoLightTheme.value;
  }
  
  console.log('Applying theme:', themeToApply);
  
  if (themeToApply === 'catppuccin-latte-maroon' || themeToApply === 'catppuccin-macchiato-maroon') {
    body.classList.add(themeToApply);
  } else if (themeToApply === 'dark') {
    body.classList.add('dark');
  }
  
  console.log('Body classList:', body.className);
}

function goBack() {
  router.back();
}

onMounted(() => {
  loadTheme();
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (theme.value === 'auto') {
      applyTheme('auto');
    }
  });
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
