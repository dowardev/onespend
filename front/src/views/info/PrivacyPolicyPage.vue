<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>{{ t('privacyPolicy.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="8" size-lg="6">
            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>{{ t('privacyPolicy.title') }}</ion-card-title>
                <ion-card-subtitle>{{ t('privacyPolicy.lastUpdated') }}</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <p>{{ t('privacyPolicy.intro') }}</p>
              </ion-card-content>
            </ion-card>

            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>{{ t('privacyPolicy.sections.dataCollected') }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p><strong>{{ t('privacyPolicy.sections.dataCollectedAccount') }}.</strong> {{ t('privacyPolicy.sections.dataCollectedAccountBody') }}</p>
                <p><strong>{{ t('privacyPolicy.sections.dataCollectedFinancial') }}.</strong> {{ t('privacyPolicy.sections.dataCollectedFinancialBody') }}</p>
                <p><strong>{{ t('privacyPolicy.sections.dataCollectedAttachments') }}.</strong> {{ t('privacyPolicy.sections.dataCollectedAttachmentsBody') }}</p>
                <p><strong>{{ t('privacyPolicy.sections.dataCollectedNot') }}:</strong> {{ t('privacyPolicy.sections.dataCollectedNotBody') }}</p>
              </ion-card-content>
            </ion-card>

            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>{{ t('privacyPolicy.sections.storage') }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p><strong>{{ t('privacyPolicy.sections.storageLocal') }}:</strong> {{ t('privacyPolicy.sections.storageLocalBody') }}</p>
                <p><strong>{{ t('privacyPolicy.sections.storageServer') }}:</strong> {{ t('privacyPolicy.sections.storageServerBody') }}</p>
                <p><strong>{{ t('privacyPolicy.sections.storageNoSell') }}</strong> {{ t('privacyPolicy.sections.storageNoSellBody') }}</p>
              </ion-card-content>
            </ion-card>

            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>{{ t('privacyPolicy.sections.use') }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>{{ t('privacyPolicy.sections.useBody') }}</p>
                <ul>
                  <li>{{ t('privacyPolicy.sections.useList.functionality') }}</li>
                  <li>{{ t('privacyPolicy.sections.useList.sync') }}</li>
                  <li>{{ t('privacyPolicy.sections.useList.support') }}</li>
                </ul>
              </ion-card-content>
            </ion-card>

            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>{{ t('privacyPolicy.sections.retention') }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>{{ t('privacyPolicy.sections.retentionBody1') }}</p>
                <p>{{ t('privacyPolicy.sections.retentionBody2', { email: 'vortinext@dowar.xyz' }) }}</p>
              </ion-card-content>
            </ion-card>

            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>{{ t('privacyPolicy.sections.security') }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>{{ t('privacyPolicy.sections.securityBody') }}</p>
              </ion-card-content>
            </ion-card>

            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>{{ t('privacyPolicy.sections.minors') }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>{{ t('privacyPolicy.sections.minorsBody') }}</p>
              </ion-card-content>
            </ion-card>

            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>{{ t('privacyPolicy.sections.changes') }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>{{ t('privacyPolicy.sections.changesBody') }}</p>
              </ion-card-content>
            </ion-card>

            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>{{ t('privacyPolicy.sections.contact') }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>{{ t('privacyPolicy.sections.contactBody') }}</p>
                <p>
                  <strong>{{ t('privacyPolicy.sections.contactInfo', { company: 'DowarDev', email: 'vortinext@dowar.xyz' }) }}</strong>
                  <br />
                  {{ t('privacyPolicy.sections.source', { url: 'https://gitlab.com/dowardev/onespend' }) }}
                </p>
              </ion-card-content>
            </ion-card>
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
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButtons,
  IonMenuButton,
} from '@ionic/vue';

// 2. Controllers / Composables
import { useLocale } from '@/composables/useLocale';

// 3. Components
// (none)

// 4. Interface and types imports
// (none)

// 5. Main (props, emits, etc.)
// (no props or emits — page is self-contained)

// 6. Vars and const
const { t } = useLocale();

// 7. Watch
// (none)

// 8. Computed
// (none)

// 9. OnMounted
// (none)

// 10. Functions (named parameters pattern)
// (none)
</script>

<style>
.shadow1 {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
</style>