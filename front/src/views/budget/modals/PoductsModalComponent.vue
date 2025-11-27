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
                  :id="'prod-input-' + idx"
                  v-model.number="localQuantities[prod.id ?? idx]"
                  label-placement="floating"
                  :label="`${prod.name || prod.productName || prod.title || 'Producto'}(${formatCurrency({ v: Number(prod.price || prod.amount || 0) })})`"
                  :enterkeyhint="idx < products.length - 1 ? 'next' : 'done'"
                  @keydown.enter.prevent.stop="handleEnter({ currentIndex: idx, ev: $event })"
                  @keydown.up.prevent.stop="handleArrowUp({ currentIndex: idx, ev: $event })"
                  @keydown.down.prevent.stop="handleArrowDown({ currentIndex: idx, ev: $event })"
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
  IonLabel,
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
// end interface

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
watch(
  () => props.quantities,
  () => initLocalQuantities(),
  { deep: true }
);

watch(
  () => props.products,
  () => initLocalQuantities(),
  { deep: true }
);
// end watch

// vars
const localQuantities = reactive<Record<string | number, number>>({});

// functions
function initLocalQuantities() {
  try {
    const q = props.quantities || {};
    for (const k of Object.keys(localQuantities)) delete localQuantities[k];
    for (const k of Object.keys(q)) {
      localQuantities[k] = Number(q[k] || 0) || 0;
    }
    for (let idx = 0; idx < (props.products || []).length; idx++) {
      const prod = props.products[idx];
      const key = prod?.id ?? idx;
      if (localQuantities[key] === undefined) localQuantities[key] = 0;
    }
  } catch (_e) {
    /* noop */
  }
}
// end vars

// functions
function onClose() {
  emit('dismiss');
}

function onSave() {
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

async function focusNext(params: { currentIndex: number; ev?: Event }) {
  const { currentIndex, ev } = params;

  try {
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    if (ev) {
      const e = ev as any;
      e.stopImmediatePropagation?.();
    }
  } catch (_e) {}

  const nextIndex = currentIndex + 1;
  const totalProducts = props.products?.length || 0;

  if (nextIndex < totalProducts) {
    const nextElement = document.getElementById(
      `prod-input-${nextIndex}`
    ) as any;

    if (nextElement) {
      if (typeof nextElement.getInputElement === 'function') {
        const nativeInput = await nextElement.getInputElement();
        nativeInput.focus();
      } else {
        nextElement.setFocus?.();
      }
    }
  } else {
    // If we're on the last input, keep focus on the current one to avoid scrolling
    const currentElement = document.getElementById(
      `prod-input-${currentIndex}`
    ) as any;
    if (currentElement) {
      if (typeof currentElement.getInputElement === 'function') {
        const nativeInput = await currentElement.getInputElement();
        nativeInput.focus();
      } else {
        currentElement.setFocus?.();
      }
    }
    return;
  }
}

async function focusPrev(params: { currentIndex: number; ev?: Event }) {
  const { currentIndex, ev } = params;
  try {
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    ev && (ev as any).stopImmediatePropagation?.();
  } catch (_e) {}

  const prevIndex = currentIndex - 1;
  if (prevIndex >= 0) {
    const prevElement = document.getElementById(
      `prod-input-${prevIndex}`
    ) as any;
    if (prevElement) {
      if (typeof prevElement.getInputElement === 'function') {
        const nativeInput = await prevElement.getInputElement();
        nativeInput.focus();
      } else {
        prevElement.setFocus?.();
      }
    }
  } else {
    // If this is the first one, do not blur or allow the event to bubble:
        // keep focus on the current input to avoid modal scrolling.
    const currentElement = document.getElementById(
      `prod-input-${currentIndex}`
    ) as any;
    if (currentElement) {
      if (typeof currentElement.getInputElement === 'function') {
        const nativeInput = await currentElement.getInputElement();
        nativeInput.focus();
      } else {
        currentElement.setFocus?.();
      }
    }
    return;
  }
}

function handleEnter(params: { currentIndex: number; ev?: Event }) {
  const { currentIndex: idx, ev } = params;
  try {
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    if (ev) {
      const e = ev as any;
      e.stopImmediatePropagation?.();
    }
  } catch (_e) {}

  const total = props.products?.length || 0;
  if (idx < total - 1) {
    focusNext({ currentIndex: idx, ev });
  } else {
    // Si es el último, no avanzamos
    const currentElement = document.getElementById(`prod-input-${idx}`) as any;
    if (currentElement) {
      if (typeof currentElement.getInputElement === 'function') {
        currentElement.getInputElement().then((native: any) => native.focus());
      } else {
        currentElement.setFocus?.();
      }
    }
  }
}

function handleArrowUp(params: { currentIndex: number; ev?: Event }) {
  const { currentIndex: idx, ev } = params;
  try {
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    if (ev) {
      const e = ev as any;
      e.stopImmediatePropagation?.();
    }
  } catch (_e) {}

  if (idx > 0) {
    focusPrev({ currentIndex: idx, ev });
  } else {
    // If this is the first one, keep focus
    const currentElement = document.getElementById(`prod-input-${idx}`) as any;
    if (currentElement) {
      if (typeof currentElement.getInputElement === 'function') {
        currentElement.getInputElement().then((native: any) => native.focus());
      } else {
        currentElement.setFocus?.();
      }
    }
  }
}

function handleArrowDown(params: { currentIndex: number; ev?: Event }) {
  const { currentIndex: idx, ev } = params;
  try {
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    if (ev) {
      const e = ev as any;
      e.stopImmediatePropagation?.();
    }
  } catch (_e) {}

  const total = props.products?.length || 0;
  if (idx < total - 1) {
    focusNext({ currentIndex: idx, ev });
  } else {
    // Si es el último, mantenemos el foco
    const currentElement = document.getElementById(`prod-input-${idx}`) as any;
    if (currentElement) {
      if (typeof currentElement.getInputElement === 'function') {
        currentElement.getInputElement().then((native: any) => native.focus());
      } else {
        currentElement.setFocus?.();
      }
    }
  }
}
</script>
