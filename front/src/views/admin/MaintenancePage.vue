<template>
  <ion-page class="maintenance-page admin-page">
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-title>Mantenimiento</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-breadcrumbs>
        <ion-breadcrumb href="#/admin/maintenance"
          >Mantenimiento</ion-breadcrumb
        >
      </ion-breadcrumbs>

      <p>Herramientas de mantenimiento del sistema.</p>

      <ion-list>
        <ion-item button @click="goToMigrateDates">
          <ion-label>Migrar Fechas</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/vue';
import { useRouter } from 'vue-router';

const router = useRouter();
function goToMigrateDates() {
  if (
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.DEV
  ) {
    // dev-only debug
    console.log('MaintenancePage: navigating to migrate-dates');
  }
  router.push({ name: 'MigrateDates' });
}
</script>

<style scoped>
.maintenance-page {
}
</style>
