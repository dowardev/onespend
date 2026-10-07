<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/budget"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ t('auth.register.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="6" size-lg="4">
            <div class="auth-container">
              <div class="logo-section">
                <h1>oneSpend</h1>
                <p v-if="!showError">{{ t('auth.register.subtitle') }}</p>
                <p v-else>{{ t('auth.register.subtitleError') }}</p>
              </div>

              <ion-card v-if="showError" color="danger">
                <ion-card-content>
                  <p>{{ t('auth.register.errorTitle') }}</p>
                  <ion-button expand="block" @click="handleRetry">{{ t('auth.register.retry') }}</ion-button>
                </ion-card-content>
              </ion-card>

              <div v-else class="loading-section">
                <ion-spinner name="crescent" class="auth-spinner" />
                <p>{{ t('auth.register.loading') }}</p>
              </div>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// 1. Imports (ionic/vue/ionicons)
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonPage,
  IonRow,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import authController from '@/controllers/authController'
import { useLocale } from '@/composables/useLocale'

// 2. Controllers / Composables
// Shared register logic lives in authController.

// 6. Vars and const
const { t } = useLocale()
const registerFailed = ref(false)

// 8. Computed
const showError = computed(() => registerFailed.value)

// 9. OnMounted
onMounted(async () => {
  await tryRegister()
})

// 10. Functions (named parameters pattern)
async function tryRegister(): Promise<void> {
  try {
    await authController.register()
  } catch (registerError) {
    console.warn('[register] SSO register failed:', registerError)
    registerFailed.value = true
  }
}

async function handleRetry(): Promise<void> {
  registerFailed.value = false
  await tryRegister()
}
</script>

<style scoped>
.auth-container {
  max-width: 400px;
  margin: 0 auto;
  padding-top: 40px;
}

.logo-section {
  text-align: center;
  margin-bottom: 40px;
}

.logo-section h1 {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 8px;
}

.logo-section p {
  color: var(--ion-color-medium);
  margin: 0;
}

.auth-form {
  margin-bottom: 24px;
}

.auth-button {
  margin-top: 24px;
  height: 48px;
}

.generate-button {
  margin-top: 12px;
  height: 40px;
  font-size: 14px;
}

.field-error {
  color: var(--ion-color-danger);
  font-size: 12px;
  padding-left: 16px;
  margin-top: -8px;
  margin-bottom: 8px;
}

.field-error span {
  display: block;
}

.error-message {
  color: var(--ion-color-danger);
  padding: 12px;
  margin-top: 12px;
  border-radius: 8px;
  background: rgba(var(--ion-color-danger-rgb), 0.1);
  font-size: 14px;
}

.auth-footer {
  text-align: center;
  color: var(--ion-color-medium);
}

.auth-footer a {
  color: var(--ion-color-primary);
  text-decoration: none;
  font-weight: 500;
}
</style>
