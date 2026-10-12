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

              <!-- LBDS-295: SSO endpoint inputs. Mirror the sync URL
                   pattern: persist on blur, validate http/https, show
                   the same warning style on invalid input. The VITE
                   defaults are shown as placeholders so the user can
                   see what was bundled before changing it. -->
              <ion-item-divider>
                <ion-label>{{ t('sync.settings.ssoHeader') }}</ion-label>
              </ion-item-divider>

              <ion-item lines="full">
                <ion-icon slot="start" :icon="globeOutline"></ion-icon>

                <ion-label position="stacked">{{ t('sync.settings.ssoServerUrlLabel') }}</ion-label>

                <ion-input
                  v-model="ssoServerUrlDraft"
                  type="url"
                  inputmode="url"
                  :placeholder="defaultSsoBaseUrl()"
                  data-cy="sso-server-url-input"
                  @ion-blur="onSsoServerUrlBlur"
                ></ion-input>
              </ion-item>

              <ion-item
                v-if="!ssoServerUrlValid"
                lines="none"
                data-cy="sso-server-url-error"
              >
                <ion-icon slot="start" :icon="alertCircleOutline" color="danger"></ion-icon>
                <ion-label color="danger">
                  <p>{{ t('sync.settings.urlInvalid') }}</p>
                </ion-label>
              </ion-item>

              <ion-item lines="full">
                <ion-icon slot="start" :icon="globeOutline"></ion-icon>

                <ion-label position="stacked">{{ t('sync.settings.ssoFrontendUrlLabel') }}</ion-label>

                <ion-input
                  v-model="ssoFrontendUrlDraft"
                  type="url"
                  inputmode="url"
                  :placeholder="defaultSsoFrontendUrl()"
                  data-cy="sso-frontend-url-input"
                  @ion-blur="onSsoFrontendUrlBlur"
                ></ion-input>
              </ion-item>

              <ion-item
                v-if="!ssoFrontendUrlValid"
                lines="none"
                data-cy="sso-frontend-url-error"
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
  IonItemDivider,
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
  globeOutline,
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
import {
  getSsoBaseUrl,
  getSsoFrontendUrl,
  setSsoServerUrl,
  setSsoFrontendUrl,
  isValidSsoServerUrl,
  defaultSsoBaseUrl,
  defaultSsoFrontendUrl,
} from '@/services/sso/ssoConfig';

// 4. Interface and types imports
// (none)

// 5. Main (props, emits, etc.)
// (no props or emits — page is self-contained)

// 6. Vars and const
const enabled = ref(false);
const serverUrlDraft = ref('');
const ssoServerUrlDraft = ref('');
const ssoFrontendUrlDraft = ref('');

// 7. Watch
// (none)

// 8. Computed
const designMode = computed(() => systemConfigController.getDesignMode());
const urlValid = computed(() => isValidSyncServerUrl({ url: serverUrlDraft.value }));
const ssoServerUrlValid = computed(() => isValidSsoServerUrl({ url: ssoServerUrlDraft.value }));
const ssoFrontendUrlValid = computed(() =>
  isValidSsoServerUrl({ url: ssoFrontendUrlDraft.value }),
);

// 9. OnMounted
onMounted(async () => {
  enabled.value = await isSyncEnabled();
  serverUrlDraft.value = await getSyncServerUrl();
  ssoServerUrlDraft.value = await getSsoBaseUrl();
  ssoFrontendUrlDraft.value = await getSsoFrontendUrl();
});

const { t } = useLocale();

// 10. Functions (named parameters pattern)
async function onToggleChange(event: { detail: { checked: boolean } }): Promise<void> {
  const checked = event.detail.checked;
  enabled.value = checked;
  await setSyncEnabled({ enabled: checked });
}

async function onServerUrlBlur(): Promise<void> {
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

// LBDS-295: the SSO URL blur handlers follow the same pattern as
// onServerUrlBlur. Saving '' is intentional (ssoConfig treats empty
// as "use the env-var default", not as opt-out — login is always
// required to be reachable).
async function onSsoServerUrlBlur(): Promise<void> {
  if (!ssoServerUrlValid.value) {
    const toast = await toastController.create({
      message: t('settings.connections.invalidUrl'),
      duration: 3000,
      color: 'warning',
    });
    await toast.present();
    return;
  }
  await setSsoServerUrl({ url: ssoServerUrlDraft.value });
}

async function onSsoFrontendUrlBlur(): Promise<void> {
  if (!ssoFrontendUrlValid.value) {
    const toast = await toastController.create({
      message: t('settings.connections.invalidUrl'),
      duration: 3000,
      color: 'warning',
    });
    await toast.present();
    return;
  }
  await setSsoFrontendUrl({ url: ssoFrontendUrlDraft.value });
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