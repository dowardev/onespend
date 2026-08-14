<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="cancelModal">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>{{
          selectedId ? 'Editar Proveedor' : 'Crear Proveedor'
        }}</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="onSubmit">
            <ion-icon :icon="saveOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-top ion-padding-bottom">
      <ion-card class="shadow1">
        <ion-card-content>
          <ion-input
            v-model="form.name"
            label="Nombre"
            label-placement="floating"
            required
          ></ion-input>
        </ion-card-content>
      </ion-card>

      <ion-list
        v-if="!showNewProductFields"
        class="transparent suppliers__products-list"
      >
        <ion-list-header>
          <ion-label>Productos</ion-label>

          <!-- Toggle product search bar -->
          <ion-button
            :disabled="showProductSearch"
            expand="full"
            @click="toggleProductSearch"
          >
            <ion-icon :icon="searchOutline"> </ion-icon>
          </ion-button>

          <ion-button
            expand="full"
            :disabled="showNewProductFields"
            @click="showNewProductFields = true"
          >
            <ion-icon :icon="addOutline"> </ion-icon>
          </ion-button>
        </ion-list-header>

        <!-- Product search bar (visible when showProductSearch is true) -->
        <div
          class="list-content suppliers__products-content"
          style="overflow-y: auto"
        >
          <template v-if="showProductSearch">
            <ion-item
              lines="none"
              style="
                position: sticky;
                top: 0;
                background-color: white;
                z-index: 1000;
              "
            >
              <ion-searchbar
                v-model="productSearchTerm"
                mode="ios"
                placeholder="Buscar productos"
                show-clear-button="focus"
              ></ion-searchbar>

              <ion-button
                slot="end"
                fill="clear"
                @click="showProductSearch = false"
                >Cancelar</ion-button
              >
            </ion-item>
          </template>

          <!-- products -->
          <template v-if="!showNewProductFields">
            <ion-item
              v-for="item in filteredProducts"
              :key="item.originalIndex"
              lines="full"
              class="transparent"
              button
              @click="editProduct({ idx: item.originalIndex })"
            >
              <template v-if="editingIndex !== item.originalIndex">
                <ion-thumbnail
                  v-if="item.product.imageBase64"
                  slot="start"
                  style="min-width: 48px; margin-right: 8px"
                >
                  <img :src="item.product.imageBase64" alt="product" />
                </ion-thumbnail>

                <ion-label>
                  <h3>{{ item.product.name }}</h3>
                  <p v-if="item.product.price">
                    Precio: {{ item.product.price }}
                  </p>
                </ion-label>

                <ion-buttons slot="end" class="supplier-actions">
                  <ion-button
                    fill="clear"
                    color="danger"
                    @click.stop="removeProduct({ idx: item.originalIndex })"
                  >
                    <ion-icon :icon="trashOutline"></ion-icon>
                  </ion-button>
                </ion-buttons>
              </template>
            </ion-item>
          </template>
        </div>
      </ion-list>

      <ion-list v-if="showNewProductFields">
        <ion-list-header>
          <ion-label>{{
            editingIndex !== null ? 'Editar producto' : 'Nuevo producto'
          }}</ion-label>

          <ion-buttons>
            <ion-button color="primary" @click="addProduct">
              <ion-icon :icon="saveOutline"></ion-icon>
            </ion-button>

            <ion-button color="warning" @click="cancelNewProduct">
              <ion-icon :icon="closeOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-list-header>

        <div class="list-content">
          <template v-if="showNewProductFields">
            <ion-item class="transparent">
              <ion-input
                v-model="newProduct.name"
                label="Nombre"
                label-placement="floating"
              ></ion-input>
            </ion-item>

            <ion-item class="transparent">
              <ion-input
                v-model.number="newProduct.price"
                label="Precio"
                label-placement="floating"
                type="number"
              ></ion-input>
            </ion-item>

            <ion-item class="transparent" button @click="openFileDialog">
              <label class="file-input-label">
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  style="display: none"
                  @change="onFileChange"
                />
                Adjuntar imagen (opcional)
              </label>

              <ion-thumbnail
                v-if="newProduct.imageBase64"
                slot="end"
                style="margin-left: 12px"
              >
                <img :src="newProduct.imageBase64" alt="preview" />
              </ion-thumbnail>

              <ion-button
                v-if="newProduct.imageBase64"
                slot="end"
                color="danger"
                fill="clear"
                @click.stop="removeImage"
              >
                <ion-icon :icon="trashOutline"></ion-icon>
              </ion-button>
            </ion-item>
          </template>
        </div>
      </ion-list>
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
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonInput,
  IonList,
  IonListHeader,
  IonLabel,
  IonItem,
  IonSearchbar,
  IonThumbnail,
} from '@ionic/vue';
import { reactive, ref, computed, watch } from 'vue';
import {
  addOutline,
  closeOutline,
  saveOutline,
  searchOutline,
  trashOutline,
} from 'ionicons/icons';

// main
const props = defineProps<{ supplier: any | null }>();
const emit = defineEmits<{
  (e: 'dismiss'): void;
  (e: 'saved', payload: any): void;
}>();
// end main

// interface
type Product = { name: string; price: number; imageBase64?: string | null };
// end interface

// vars
const form = reactive({ name: '', products: [] as Product[] });
const newProduct = reactive({
  name: '',
  price: 0,
  imageBase64: null as string | null,
});
const showNewProductFields = ref(false);
const editingIndex = ref<number | null>(null);
const productSearchTerm = ref('');
const showProductSearch = ref(false);
const selectedId = computed(() => props.supplier?.id ?? null);
// end vars
const fileInput = ref<HTMLInputElement | null>(null);

// file helpers
async function fileToBase64(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function openFileDialog() {
  fileInput.value?.click();
}

async function onFileChange(e: Event) {
  const el = e.target as HTMLInputElement;
  if (!el || !el.files || !el.files.length) return;
  const f = el.files[0];
  try {
    newProduct.imageBase64 = await fileToBase64(f);
  } catch (err) {
    console.error('Failed to read image', err);
  }
  // clear native input so the same file can be re-selected if needed
  if (el) el.value = '';
}

function removeImage() {
  newProduct.imageBase64 = null;
  if (fileInput.value) fileInput.value.value = '';
}

// watch
watch(
  () => props.supplier,
  s => {
    if (s) {
      form.name = s.name || '';
      form.products = s.products ? JSON.parse(JSON.stringify(s.products)) : [];
      showNewProductFields.value = !form.products || form.products.length === 0;
    } else {
      form.name = '';
      form.products = [];
      showNewProductFields.value = true; // default to show product fields for new supplier
    }

    // reset product editor
    editingIndex.value = null;
    newProduct.name = '';
    newProduct.price = 0;
    productSearchTerm.value = '';
    showProductSearch.value = false;
  },
  { immediate: true }
);
// end watch

// computed
const filteredProducts = computed(() => {
  const term = (productSearchTerm.value || '').toString().toLowerCase().trim();
  const products = (form.products || []) as Product[];
  const mapped = products.map((p, idx) => ({ product: p, originalIndex: idx }));
  if (!term) return mapped;
  return mapped.filter(item => {
    const name = (item.product.name || '').toString().toLowerCase();
    const price = item.product.price != null ? String(item.product.price) : '';
    return name.includes(term) || price.includes(term);
  });
});
// end computed

// functions
function cancelModal() {
  emit('dismiss');
}

function toggleProductSearch() {
  showProductSearch.value = !showProductSearch.value;
  if (!showProductSearch.value) productSearchTerm.value = '';
}

function addProduct() {
  if (!newProduct.name) return;
  if (editingIndex.value != null && form.products[editingIndex.value]) {
    form.products.splice(editingIndex.value, 1, {
      name: newProduct.name,
      price: Number(newProduct.price),
      imageBase64: newProduct.imageBase64 || null,
    });
  } else {
    form.products.push({
      name: newProduct.name,
      price: Number(newProduct.price),
      imageBase64: newProduct.imageBase64 || null,
    });
  }
  editingIndex.value = null;
  newProduct.name = '';
  newProduct.price = 0;
  showNewProductFields.value = false;
}

function cancelNewProduct() {
  showNewProductFields.value = false;
  newProduct.name = '';
  newProduct.price = 0;
  editingIndex.value = null;
}

function removeProduct(params: { idx: number }) {
  const { idx } = params;
  form.products.splice(idx, 1);
  if (editingIndex.value === idx) {
    editingIndex.value = null;
    newProduct.name = '';
    newProduct.price = 0;
    showNewProductFields.value = false;
  }
}

function editProduct(params: { idx: number }) {
  const { idx } = params;
  const p = form.products[idx];
  if (!p) return;
  editingIndex.value = idx;
  newProduct.name = p.name || '';
  newProduct.price = Number(p.price) || 0;
  showNewProductFields.value = true;
}

function onSubmit() {
  if (!form.name) return;
  const payload: any = {
    name: form.name,
    products: form.products && form.products.length ? form.products : undefined,
  };
  if (selectedId.value != null) payload.id = selectedId.value;

  emit('saved', payload);
}
</script>

<style scoped>
.suppliers__products-list {
  height: calc(100% - 102px);
}

.suppliers__products-content {
  height: calc(100% - 47px);
}

.supplier-actions {
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms ease;
}

/* Fallback for environments without pointer media queries support: show on hover */
ion-item:hover .supplier-actions,
ion-item:focus-within .supplier-actions {
  opacity: 1;
  pointer-events: auto;
}

/* Devices with fine pointer (mouse): show actions on hover/focus */
@media (pointer: fine) {
  ion-item:hover .supplier-actions,
  ion-item:focus-within .supplier-actions {
    opacity: 1;
    pointer-events: auto;
  }
}

/* Touch devices (coarse pointer): always show actions */
@media (pointer: coarse) {
  .supplier-actions {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
