<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button fill="clear" @click="cancelApply">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>Aplicar template</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="confirmApply">
            <ion-icon :icon="checkmarkOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="applyTargetTemplate">
        <ion-card class="shadow1">
          <ion-card-header>
            <ion-card-title>{{ applyTargetTemplate.name }}</ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <ion-item class="transparent">
              <ion-label>Fecha</ion-label>

              <ion-datetime-button
                slot="end"
                datetime="datetime"
              ></ion-datetime-button>
            </ion-item>

            <ion-list class="transparent">
              <ion-list-header>
                <ion-label>Proveedores</ion-label>
              </ion-list-header>

              <div class="content">
                <!-- Si el template tiene IDs -->
                <template
                  v-if="
                    applyTargetTemplate.suppliers &&
                    applyTargetTemplate.suppliers.length
                  "
                >
                  <ion-item
                    v-for="(id, idx) in applyTargetTemplate.suppliers"
                    :key="String(id) + '_' + idx"
                    class="transparent"
                    lines="full"
                  >
                    <ion-label>
                      {{ supplierDisplayName({ id }) }}
                    </ion-label>

                    <template v-if="!supplierExists({ id })">
                      <ion-chip slot="end" color="danger"> Eliminado </ion-chip>

                      <ion-button
                        slot="end"
                        color="primary"
                        fill="clear"
                        @click="removeDeletedSupplier({ id })"
                      >
                        <ion-icon :icon="closeOutline"> </ion-icon>
                      </ion-button>
                    </template>

                    <ion-button
                      v-if="supplierExists({ id })"
                      slot="end"
                      fill="clear"
                      color="danger"
                    >
                      Eliminar
                    </ion-button>
                  </ion-item>
                </template>

                <!-- Si el template solo tiene description -> mostrar parsed names -->
                <template v-else>
                  <ion-item
                    v-for="(name, idx) in parseProvidersFromDescription({
                      desc: applyTargetTemplate.description,
                    })"
                    :key="idx"
                    lines="none"
                  >
                    <ion-label>{{ name }}</ion-label>
                  </ion-item>
                </template>
              </div>
            </ion-list>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonChip,
  IonDatetimeButton,
} from '@ionic/vue';
import { closeOutline, checkmarkOutline } from 'ionicons/icons';
import { defineProps, defineEmits } from 'vue';

// main
const props = defineProps<{
  applyTargetTemplate: any | null;
  suppliers: any[];
  applySelectedDate: string;
}>();
const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'remove-deleted-supplier', id: IDBValidKey): void;
  (e: 'update:applySelectedDate', val: string): void;
}>();
// end main

// functions
function supplierExists(params: { id: IDBValidKey }): boolean {
  const { id } = params;
  return !!(props.suppliers || []).some((s: any) => s && s.id === id);
}

function supplierDisplayName(params: { id: IDBValidKey }): string {
  const { id } = params;
  // Prefer current supplier name if it exists
  const s = (props.suppliers || []).find((x: any) => x.id === id);
  if (s && s.name) return s.name;

  // Fallback to the suppliersSnapshot stored in the template being applied (if any)
  const snapshotList = props.applyTargetTemplate?.suppliersSnapshot || [];
  const snap = (snapshotList as { id: IDBValidKey; name?: string }[]).find(
    ss => ss.id === id
  );
  if (snap && snap.name) return snap.name || String(id);

  return String(id);
}

function removeDeletedSupplier(params: { id: IDBValidKey }) {
  const { id } = params;
  // Emit kebab-case event so template listeners using kebab-case match.
  emit('remove-deleted-supplier', id);
}

function parseProvidersFromDescription(params: { desc?: string }): string[] {
  const { desc } = params;
  if (!desc) return [];
  const prefix = 'Proveedores:';
  const i = desc.indexOf(prefix);
  if (i === -1) return [];
  const rest = desc.slice(i + prefix.length).trim();
  if (!rest) return [];
  return rest
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s);
}

function confirmApply() {
  emit('confirm');
}

function cancelApply() {
  emit('cancel');
}
</script>
