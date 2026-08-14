<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

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
      <ion-list
        v-if="products && products.length"
        style="height: 100%"
        class="transparent"
      >
        <ion-list-header>
          <ion-label>Productos({{ formattedTotal }})</ion-label>

          <ion-button v-if="!showSearch" @click="toggleSearch({ ev: $event })">
            <ion-icon :icon="searchOutline"></ion-icon>
          </ion-button>

          <ion-button
            @click="
              popovers.filteProducts.event = $event;
              popovers.filteProducts.open = true;
            "
          >
            <ion-icon :icon="filterOutline"></ion-icon>
          </ion-button>
        </ion-list-header>

        <div
          id="div-products"
          class="list-content"
          style="max-height: calc(100% - 57px); overflow: auto"
        >
          <ion-item-divider v-if="showSearch" sticky>
            <ion-searchbar
              ref="searchbarRef"
              v-model="searchQuery"
              mode="ios"
              placeholder="Buscar productos"
              :debounce="300"
              @ion-clear="searchQuery = ''"
              @ion-input="e => (searchQuery = (e.target as any)?.value || '')"
            ></ion-searchbar>

            <ion-button slot="end" fill="clear" @click="hideSearch"
              >Cerrar</ion-button
            >
          </ion-item-divider>

          <template
            v-for="(item, visibleIdx) in filteredProducts"
            :key="item.prod.id ?? item.originalIndex"
          >
            <div
              class="item-border"
              :class="{ 'focused-border': focusedIndex === item.originalIndex }"
            >
              <ion-item lines="full" class="transparent">
                <ion-thumbnail
                  v-if="item.prod.imageBase64"
                  slot="start"
                  style="width: 48px; height: 48px"
                >
                  <img :src="item.prod.imageBase64" alt="thumb" />
                </ion-thumbnail>

                <ion-input
                  :id="'prod-input-' + (item.prod.id ?? item.originalIndex)"
                  v-model.number="
                    localQuantities[item.prod.id ?? item.originalIndex]
                  "
                  label-placement="floating"
                  :label="`${item.prod.name || item.prod.productName || item.prod.title || 'Producto'}(${formatCurrency({ v: Number(item.prod.price || item.prod.amount || 0) })})`"
                  :enterkeyhint="
                    visibleIdx < filteredProducts.length - 1 ? 'next' : 'done'
                  "
                  @ion-focus="onInputFocus({ idx: item.originalIndex })"
                  @ion-blur="onInputBlur({ idx: item.originalIndex })"
                  @keydown.enter.prevent.stop="
                    handleEnter({
                      currentIndex: item.originalIndex,
                      ev: $event,
                    })
                  "
                  @keydown.up.prevent.stop="
                    handleArrowUp({
                      currentIndex: item.originalIndex,
                      ev: $event,
                    })
                  "
                  @keydown.down.prevent.stop="
                    handleArrowDown({
                      currentIndex: item.originalIndex,
                      ev: $event,
                    })
                  "
                ></ion-input>
              </ion-item>
            </div>
          </template>
        </div>
      </ion-list>

      <!-- popovers -->
      <ion-popover
        :is-open="popovers.filteProducts.open"
        :event="popovers.filteProducts.event"
        @did-dismiss="popovers.filteProducts.open = false"
      >
        <ion-content>
          <ion-list>
            <ion-list-header>
              <ion-label>Visualizacion</ion-label>
            </ion-list-header>

            <div class="list-conent">
              <ion-item>
                <ion-select
                  v-model="filterProductsMode"
                  label="Mostrar"
                  interface="popover"
                  @ion-change="popovers.filteProducts.open = false"
                >
                  <ion-select-option value="all">Todo</ion-select-option>
                  <ion-select-option value="with-values"
                    >Con valores</ion-select-option
                  >
                  <ion-select-option value="without-values"
                    >Sin valores</ion-select-option
                  >
                </ion-select>
              </ion-item>
            </div>
          </ion-list>
        </ion-content>
      </ion-popover>
      <!-- end popovers -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { reactive, watch, onMounted, ref, computed, nextTick } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonInput,
  IonThumbnail,
  IonLabel,
  IonPopover,
  IonSelect,
  IonSelectOption,
  IonSearchbar,
} from '@ionic/vue';
import {
  closeOutline,
  filterOutline,
  saveOutline,
  searchOutline,
} from 'ionicons/icons';

// interface
interface Product {
  id?: string | number;
  name?: string;
  productName?: string;
  title?: string;
  price?: number;
  amount?: number;
  imageBase64?: string | null;
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

// index of the currently focused input (null if none)
const focusedIndex = ref<number | null>(null);
const popovers = reactive({
  filteProducts: { open: false, event: null as Event | null },
});
const filterProductsMode = ref<'all' | 'with-values' | 'without-values'>('all');

// search UI state
const showSearch = ref(false);
const searchQuery = ref('');
/** Ensure that HTMLIonSearchbarElement is properly imported */
const searchbarRef = ref<HTMLElement | null>(null);

// total calculations: sum of (quantity * price) across products
const total = computed(() => {
  try {
    const list = props.products || [];
    return list.reduce((acc, prod, idx) => {
      const key = prod?.id ?? idx;
      const qty = Number(localQuantities[key] || 0) || 0;
      const price = Number(prod?.price ?? prod?.amount ?? 0) || 0;
      return acc + qty * price;
    }, 0);
  } catch (_e) {
    return 0;
  }
});

const formattedTotal = computed(() => formatCurrency({ v: total.value }));

function hideSearch() {
  showSearch.value = false;
  searchQuery.value = '';
}
// end vars

// computed
// Instead of mixing v-for with v-if, compute a filtered list that preserves
// the original index for stable DOM ids and quantity keys.
const filteredProducts = computed(() => {
  const list = props.products || [];
  const q = (searchQuery.value || '').toString().trim().toLowerCase();
  return list
    .map((p, idx) => ({ prod: p, originalIndex: idx }))
    .filter(item => {
      try {
        const key = item.prod?.id ?? item.originalIndex;
        const qty = Number(localQuantities[key] || 0) || 0;

        // If there's a search query, filter by product name/title (case-insensitive)
        if (q) {
          const text = (
            (item.prod?.name ||
              item.prod?.productName ||
              item.prod?.title ||
              '') + ''
          ).toLowerCase();
          if (!text.includes(q)) return false;
        }

        // Then apply the value-based filter mode
        if (filterProductsMode.value === 'all') return true;
        if (filterProductsMode.value === 'with-values') return qty > 0;
        if (filterProductsMode.value === 'without-values') return qty === 0;
        return true;
      } catch (_e) {
        return true;
      }
    });
});

// Array of original indices for quick lookup when navigating focus
const filteredOriginalIndices = computed(() =>
  filteredProducts.value.map(i => i.originalIndex)
);
// end computed

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
    // intentionally ignore errors
    void 0;
  }
}

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

function onInputFocus({ idx }: { idx: number }) {
  focusedIndex.value = idx;
}

function onInputBlur({ idx }: { idx: number }) {
  // only clear if the blurred input is the one we think is focused
  if (focusedIndex.value === idx) focusedIndex.value = null;
}

// Ensure the input at `index` is fully visible inside the scroll container #div-products.
// This helper computes the element bounding rect relative to the container and
// adjusts container.scrollTop so the element is fully shown. It returns a
// Promise that resolves after a short delay so callers can await the visual
// scroll animation if needed.
async function ensureVisible({ index }: { index: number }) {
  try {
    const container = document.getElementById(
      'div-products'
    ) as HTMLElement | null;
    if (!container) return;

    const el = document.getElementById(
      `prod-input-${index}`
    ) as HTMLElement | null;
    if (!el) return;

    // If we're trying to show the first element, snap to top explicitly.
    // This ensures that when navigating from the last input back to the first,
    // the container returns to the absolute start (preventing off-by-some pixels).
    if (index === 0) {
      // Use smooth animation but ensure we end exactly at top
      container.scrollTo({ top: 0, behavior: 'smooth' });
      await new Promise(r => setTimeout(r, 220));
      return;
    }

    // Some Ionic elements are web components; use the host element's bounding rect.
    const targetEl = el as HTMLElement;

    const containerRect = container.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    // Calculate offset of target's top relative to container's top
    const offsetTop = targetRect.top - containerRect.top + container.scrollTop;

    // If target is above the visible area, scroll up a bit so it's comfortably visible
    if (targetRect.top < containerRect.top) {
      const newTop = Math.max(0, offsetTop - 8);
      container.scrollTo({ top: newTop, behavior: 'smooth' });
      await new Promise(r => setTimeout(r, 220));
      return;
    }

    // If target is below the visible area, scroll down so its bottom is visible
    if (targetRect.bottom > containerRect.bottom) {
      const newTop = Math.min(
        container.scrollHeight - container.clientHeight,
        offsetTop - container.clientHeight + targetRect.height + 8
      );
      container.scrollTo({ top: newTop, behavior: 'smooth' });
      await new Promise(r => setTimeout(r, 220));
      return;
    }

    // Already fully visible
    return;
  } catch (_e) {
    // swallow errors silently
    return;
  }
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
  } catch (_e) {
    /* noop */
  }

  // If a filter is active, navigate among visible products; otherwise, use linear next.
  const visible = filteredOriginalIndices.value;
  const currentPos = visible.indexOf(currentIndex);

  if (currentPos >= 0 && currentPos < visible.length - 1) {
    // next visible index
    const nextOriginalIndex = visible[currentPos + 1];
    const nextElement = document.getElementById(
      `prod-input-${nextOriginalIndex}`
    ) as any;
    if (nextElement) {
      if (typeof nextElement.getInputElement === 'function') {
        const nativeInput = await nextElement.getInputElement();
        nativeInput.focus();
      } else {
        nextElement.setFocus?.();
      }
      await ensureVisible({ index: nextOriginalIndex });
    }
    return;
  }

  // fallback: behave like before (move to next index if available)
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
      await ensureVisible({ index: nextIndex });
    }
  } else {
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
      await ensureVisible({ index: currentIndex });
    }
  }
}

async function focusPrev(params: { currentIndex: number; ev?: Event }) {
  const { currentIndex, ev } = params;
  try {
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    if (ev) (ev as any).stopImmediatePropagation?.();
  } catch (_e) {
    // intentionally ignore errors
    void 0;
  }

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

      // Ensure the newly focused element (previous) is fully visible
      await ensureVisible({ index: prevIndex });
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

      // Also ensure the (current) element remains visible
      await ensureVisible({ index: currentIndex });
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
  } catch (_e) {
    // intentionally ignore errors
    void 0;
  }

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
  } catch (_e) {
    // Suppressing errors intentionally
  }

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
  } catch (_e) {
    // Suppressing errors intentionally
  }

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

function toggleSearch({ ev }: { ev?: Event } = {}) {
  // If an event is provided, prevent default and stop propagation safely
  try {
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    if (ev) (ev as any).stopImmediatePropagation?.();
  } catch (_e) {
    /* noop */
  }

  showSearch.value = !showSearch.value;
  if (showSearch.value) {
    // wait for DOM update then focus the searchbar
    nextTick(() => {
      try {
        const el: any = searchbarRef.value;
        if (el) {
          // Ionic searchbar is a Web Component; try available focus helpers
          el.setFocus?.();
          if (typeof el.getInputElement === 'function') {
            el.getInputElement().then((native: any) => native.focus());
          }
        }
      } catch (_e) {
        // ignore
      }
    });
  } else {
    // if we're hiding the searchbar, clear the query so the list shows all items
    searchQuery.value = '';
  }
}
</script>

<style scoped>
.item-border {
  border-left: 4px solid transparent;
  transition:
    border-left-color 220ms ease,
    box-shadow 220ms ease;
}

.focused-border {
  border-left-color: var(--ion-color-primary);
}

/* Optional: pulse animation for stronger effect (uses CSS variables for color) */
@keyframes border-pulse {
  0% {
    box-shadow: 2px 0 2px rgba(0, 0, 0, 0.04);
  }
  50% {
    box-shadow: 4px 0 10px rgba(0, 0, 0, 0.08);
  }
  100% {
    box-shadow: 2px 0 2px rgba(0, 0, 0, 0.04);
  }
}

.focused-border.pulse {
  animation: border-pulse 900ms ease-in-out;
}
</style>
