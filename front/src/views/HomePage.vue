<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ t('home.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ t('home.title') }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <div id="container">
        <strong>{{ t('home.placeholder.heading') }}</strong>
        <p>
          {{ t('home.placeholder.bodyBefore') }}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://ionicframework.com/docs/components"
            >{{ t('home.placeholder.link') }}</a
          >
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// 1. Imports (ionic/vue/ionicons)
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue';

// 2. Controllers / Composables
import { useLocale } from '@/composables/useLocale';

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

<style scoped>
#container {
  text-align: center;

  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

#container strong {
  font-size: 20px;
  line-height: 26px;
}

#container p {
  font-size: 16px;
  line-height: 22px;

  color: #8c8c8c;

  margin: 0;
}

#container a {
  text-decoration: none;
}
</style>