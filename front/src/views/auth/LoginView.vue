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
        <ion-title>{{ t('auth.login.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="6" size-lg="4">
            <div class="auth-container">
              <div class="logo-section">
                <h1>oneSpend</h1>
                <p v-if="!showError">{{ t('auth.login.subtitle') }}</p>
                <p v-else>{{ t('auth.login.subtitleError') }}</p>
              </div>

              <ion-card v-if="showError" color="danger">
                <ion-card-content>
                  <p>{{ t('auth.login.errorTitle') }}</p>
                  <ion-button expand="block" @click="handleRetry">{{ t('auth.login.retry') }}</ion-button>
                </ion-card-content>
              </ion-card>

              <div v-else class="loading-section">
                <ion-spinner name="crescent" class="auth-spinner" />
                <p>{{ t('auth.login.loading') }}</p>
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
import { useRoute, useRouter } from 'vue-router'
import authController from '@/controllers/authController'
import { useLocale } from '@/composables/useLocale'

// 2. Controllers / Composables
// Shared login logic lives in authController; route and router are framework composables.

// 5. Main
const route = useRoute()
const router = useRouter()
const { t } = useLocale()

// 6. Vars and const
const loginFailed = ref(false)

// 8. Computed
const hasSsoError = computed(() => route.query.sso_error !== undefined)
const showError = computed(() => hasSsoError.value || loginFailed.value)

// 9. OnMounted
onMounted(async () => {
  if (hasSsoError.value) {
    return
  }
  await tryLogin()
})

// 10. Functions (named parameters pattern)
async function tryLogin(): Promise<void> {
  try {
    await authController.login()
  } catch (loginError) {
    console.warn('[login] SSO login failed:', loginError)
    loginFailed.value = true
  }
}

async function handleRetry(): Promise<void> {
  loginFailed.value = false
  try {
    await router.replace({ path: '/login', query: {} })
  } catch (navigationError) {
    console.warn('[login] Could not clear SSO error query:', navigationError)
  }
  await tryLogin()
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
