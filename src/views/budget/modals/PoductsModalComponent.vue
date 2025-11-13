<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button fill="clear" size="small" @click="onClose">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>{{ title }}</ion-title>

        <ion-buttons slot="end">
          <ion-button color="primary" @click="onSave">
            <ion-icon :icon="saveOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1">
        <ion-card-content>
          <ion-list v-if="products && products.length" class="transparent">
            <ion-list-header>
              <ion-label>Productos</ion-label>

              <ion-button>
                <ion-icon :icon="refreshOutline"></ion-icon>
              </ion-button>
            </ion-list-header>

            <div class="content ion-padding-start">
              <template v-for="(prod, idx) in products" :key="prod.id ?? idx">
                <ion-input
                  v-model.number="localQuantities[prod.id ?? idx]"
                  label-placement="floating"
                  :label="`${prod.name || prod.productName || prod.title || 'Producto'}(${formatCurrency({ v: Number(prod.price || prod.amount || 0) })})`"
                ></ion-input>
              </template>
            </div>
          </ion-list>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { reactive, watch, onMounted } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonList,
  IonListHeader,
  IonInput,
} from '@ionic/vue';
import { closeOutline, refreshOutline, saveOutline } from 'ionicons/icons';

// interface
interface Product {
  id?: string | number;
  name?: string;
  productName?: string;
  title?: string;
  price?: number;
  amount?: number;
}
// end interfcae

// main
const props = defineProps<{
  products: Product[];
  quantities: Record<string | number, number>;
  title: string;
}>();

const emit = defineEmits<{
  (e: 'save', payload: { quantities: Record<string | number, number> }): void;
  (e: 'dismiss'): void;
}>();
// end main

// life
onMounted(() => initLocalQuantities());
// end life

// watch
// Keep local copy in sync if parent quantities change
watch(
  () => props.quantities,
  () => initLocalQuantities(),
  { deep: true }
);

// Also update keys if the products list changes (e.g. different provider)
watch(
  () => props.products,
  () => initLocalQuantities(),
  { deep: true }
);
// end watch

// vars
// Local reactive copy of quantities so v-model works reliably inside the modal.
const localQuantities = reactive<Record<string | number, number>>({});
// end vars

// functions
function initLocalQuantities() {
  try {
    // shallow copy values from props.quantities
    const q = props.quantities || {};
    // clear existing
    for (const k of Object.keys(localQuantities)) delete localQuantities[k];
    for (const k of Object.keys(q)) {
      localQuantities[k] = Number(q[k] || 0) || 0;
    }
    // ensure there's an entry for each product
    for (let idx = 0; idx < (props.products || []).length; idx++) {
      const prod = props.products[idx];
      const key = prod?.id ?? idx;
      if (localQuantities[key] === undefined) localQuantities[key] = 0;
    }
  } catch (_e) {
    /* noop */
  }
}

function onClose() {
  emit('dismiss');
}

function onSave() {
  // Emit a deep-cloned plain object to avoid exposing reactivity internals
  const payload: Record<string | number, number> = {};
  for (const k of Object.keys(localQuantities)) {
    payload[k] = Number(localQuantities[k] || 0) || 0;
  }
  emit('save', { quantities: payload });
}

function formatCurrency(params: { v: number }) {
  const { v } = params;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(v || 0);
}
</script>
