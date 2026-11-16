<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-content :fullscreen="true" class="callback-content">
      <div class="callback-container">
        <ion-spinner v-if="loading" name="crescent" class="callback-spinner" />
        <p v-if="loading">{{ t('auth.callback.message') }}</p>
        <div v-if="error" class="error-container">
          <p class="error-message">{{ error }}</p>
          <ion-button @click="redirectToSSO">{{ t('auth.login.retry') }}</ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// 1. Imports
import { IonPage, IonContent, IonSpinner, IonButton } from "@ionic/vue"
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { getSSOClient } from "@/ssoClientAccessor"

// 2. Controllers / Composables
import authController from "@/controllers/authController"
import { useLocale } from "@/composables/useLocale"

// 5. Main
const router = useRouter()
const { t } = useLocale()
const loading = ref(true)
const error = ref("")

// 9. OnMounted
onMounted(async () => {
  const params = new URL(window.location.href).searchParams
  const oauthError = params.get("error")
  const code = params.get("code")

  if (oauthError) {
    // The SSO refused or the user cancelled. Silent success here would look
    // like the app ignored the attempt, so surface it instead.
    error.value =
      params.get("error_description") || t("auth.callback.loginFailed", { error: oauthError })
    loading.value = false
    return
  }

  if (!code) {
    // Codeless return on the callback URL is a logout return, not an
    // error: logged-out users keep browsing locally on budget.
    loading.value = false
    router.replace("/budget")
    return
  }

  try {
    await getSSOClient().handleCallback(window.location.href)
    loading.value = false
    router.replace("/budget")
  } catch (e: any) {
    error.value = e?.message || t("auth.callback.genericError")
    loading.value = false
  }
})

// 10. Functions
async function redirectToSSO() {
  await authController.login()
}
</script>

<style scoped>
.callback-content {
  --background: var(--ion-background-color);
}
.callback-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  text-align: center;
}
.callback-spinner {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
}
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.error-message {
  color: var(--ion-color-danger);
  font-size: 16px;
}
</style>
