<template>
  <ion-page class="maintenance-page admin-page">
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-title>Mantenimiento</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="6">
            <ion-list>
              <ion-list-header>
                <ion-label>Herramientas de mantenimiento del sistema</ion-label>
              </ion-list-header>

              <ion-item button @click="goToMigrateDates">
                <ion-label>Migrar Fechas</ion-label>
              </ion-item>
              <ion-item button @click="goToMigrateEntries">
                <ion-label>Añadir `entries` a backups</ion-label>
              </ion-item>
            </ion-list>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Imports
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
// End Imports

// Controllers

// Components

// End Components

// Vars
const router = useRouter();

// End Vars

// Functions
function goToMigrateDates() {
  if (
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.DEV
  ) {
    console.log('MaintenancePage: navigating to migrate-dates');
  }
  router.push({ name: 'MigrateDates' });
}

function goToMigrateEntries() {
  if (
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.DEV
  ) {
    console.log('MaintenancePage: navigating to migrate-entries');
  }
  router.push({ name: 'MigrateEntries' });
}

// End Functions

// Life cycle

// End Life cycle

// Computed

// End Computed

// Watch
</script>

<style scoped>
.maintenance-page {
}
</style>
