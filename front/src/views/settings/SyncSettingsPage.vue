<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode"></ion-menu-button>
        </ion-buttons>

        <ion-title>{{ t('sync.settings.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="8" size-lg="6">
            <ion-list>
              <ion-list-header>
                <ion-label>{{ t('sync.settings.header') }}</ion-label>
              </ion-list-header>

              <ion-item lines="full">
                <ion-icon slot="start" :icon="syncOutline"></ion-icon>

                <ion-label>
                  <h2>{{ t('sync.settings.enableLabel') }}</h2>
                  <p>{{ t('sync.settings.enableDescription') }}</p>
                </ion-label>

                <ion-toggle
                  slot="end"
                  :checked="enabled"
                  data-cy="sync-enabled-toggle"
                  @ion-change="onToggleChange"
                ></ion-toggle>
              </ion-item>

              <ion-item lines="full">
                <ion-icon slot="start" :icon="serverOutline"></ion-icon>

                <ion-label position="stacked">{{ t('sync.settings.serverUrlLabel') }}</ion-label>

                <ion-input
                  v-model="serverUrlDraft"
                  type="url"
                  inputmode="url"
                  :placeholder="t('sync.settings.urlPlaceholder')"
                  data-cy="sync-server-url-input"
                  @ion-blur="onServerUrlBlur"
                ></ion-input>
              </ion-item>

              <ion-item
                v-if="!urlValid"
                lines="none"
                data-cy="sync-server-url-error"
              >
                <ion-icon slot="start" :icon="alertCircleOutline" color="danger"></ion-icon>
                <ion-label color="danger">
                  <p>{{ t('sync.settings.urlInvalid') }}</p>
                </ion-label>
              </ion-item>

              <ion-item lines="none">
                <ion-icon slot="start" :icon="informationCircleOutline"></ion-icon>
                <ion-label>
                  <p>{{ t('sync.settings.footer') }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// 1. Imports (ionic/vue/ionicons)
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonInput,
  IonIcon,
  IonToggle,
  IonGrid,
  IonRow,
  IonCol,
  toastController,
} from '@ionic/vue';
import { ref, computed, onMounted } from 'vue';
import {
  syncOutline,
  serverOutline,
  alertCircleOutline,
  informationCircleOutline,
} from 'ionicons/icons';

// 2. Controllers / Composables
import { useLocale } from '@/composables/useLocale';
import systemConfigController from '@/controllers/systemConfigController';
import {
  isSyncEnabled,
  getSyncServerUrl,
  setSyncEnabled,
  setSyncServerUrl,
  isValidSyncServerUrl,
} from '@/services/sync/syncConfig';

// 4. Interface and types imports
// (none)

// 5. Main (props, emits, etc.)
// (no props or emits — page is self-contained)

// 6. Vars and const
const enabled = ref(false);
const serverUrlDraft = ref('');

// 7. Watch
// (none)

// 8. Computed
const designMode = computed(() => systemConfigController.getDesignMode());
const urlValid = computed(() => isValidSyncServerUrl({ url: serverUrlDraft.value }));

// 9. OnMounted
onMounted(async () => {
  enabled.value = await isSyncEnabled();
  serverUrlDraft.value = await getSyncServerUrl();
});

const { t } = useLocale();

// 10. Functions (named parameters pattern)
async function onToggleChange(event: { detail: { checked: boolean } }): Promise<void> {
  const checked = event.detail.checked;
  enabled.value = checked;
  await setSyncEnabled({ enabled: checked });
}

async function onServerUrlBlur() {
  if (!urlValid.value) {
    // F9 (pre-merge review): if the user typed something but the URL
    // is not parseable, surface a non-blocking toast so the silent
    // "save was skipped" no longer leaves the user wondering why
    // their change did not stick.
    const toast = await toastController.create({
      message: t('settings.connections.invalidUrl'),
      duration: 3000,
      color: 'warning',
    });
    await toast.present();
    return;
  }
  await setSyncServerUrl({ url: serverUrlDraft.value });
}
</script>

<style scoped>
ion-list-header ion-label {
  font-weight: 600;
}

ion-item p {
  white-space: normal;
}
</style>