<template>
  <ion-card class="shadow1">
    <ion-item lines="full" class="transparent">
      <ion-input
        v-model="form.name"
        label="Nombre"
        label-placement="floating"
        required
      ></ion-input>
    </ion-item>
    <ion-note v-if="v$.name.$error" color="danger" class="validation-error">
      El nombre es obligatorio (máx. 255 caracteres)
    </ion-note>
  </ion-card>

  <ion-list v-if="!showNewProductFields" class="transparent suppliers__products-list">
    <ion-list-header>
      <ion-label>Productos</ion-label>

      <ion-button :disabled="showProductSearch" expand="full" @click="toggleProductSearch">
        <ion-icon :icon="searchOutline" />
      </ion-button>

      <ion-button
        expand="full"
        :disabled="showNewProductFields"
        @click="showNewProductFields = true"
      >
        <ion-icon :icon="addOutline" />
      </ion-button>
    </ion-list-header>

    <div class="list-content suppliers__products-content" style="overflow-y: auto">
      <template v-if="showProductSearch">
        <ion-item
          lines="none"
          style="position: sticky; top: 0; background-color: white; z-index: 1000"
        >
          <ion-searchbar
            v-model="productSearchTerm"
            mode="ios"
            placeholder="Buscar productos"
            show-clear-button="focus"
          ></ion-searchbar>

          <ion-button slot="end" fill="clear" @click="showProductSearch = false"
            >Cancelar</ion-button
          >
        </ion-item>
      </template>

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
              v-if="getProductImage(item.product)"
              slot="start"
              style="min-width: 48px; margin-right: 8px"
            >
              <img :src="getProductImage(item.product)" alt="product" />
            </ion-thumbnail>

            <ion-label>
              <h3>{{ item.product.name }}</h3>
              <p v-if="item.product.price">Precio: {{ item.product.price }}</p>
            </ion-label>

            <ion-buttons slot="end" class="supplier-actions">
              <ion-button
                fill="clear"
                color="danger"
                @click.stop="removeProduct({ idx: item.originalIndex })"
              >
                <ion-icon :icon="trashOutline" />
              </ion-button>
            </ion-buttons>
          </template>
        </ion-item>
      </template>
    </div>
  </ion-list>

  <ion-list v-if="showNewProductFields">
    <ion-list-header>
      <ion-label>{{ editingIndex !== null ? 'Editar producto' : 'Nuevo producto' }}</ion-label>

      <ion-buttons>
        <ion-button color="primary" @click="addProduct">
          <ion-icon :icon="saveOutline" />
        </ion-button>

        <ion-button color="warning" @click="cancelNewProduct">
          <ion-icon :icon="closeOutline" />
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
              @change="onFileChange({ e: $event })"
            />
            Adjuntar imagen (opcional)
          </label>

          <ion-thumbnail v-if="newProduct.imageBase64" slot="end" style="margin-left: 12px">
            <img :src="newProduct.imageBase64" alt="preview" />
          </ion-thumbnail>

          <ion-button
            v-if="newProduct.imageBase64"
            slot="end"
            color="danger"
            fill="clear"
            @click.stop="removeImage"
          >
            <ion-icon :icon="trashOutline" />
          </ion-button>
        </ion-item>
      </template>
    </div>
  </ion-list>
</template>

<script setup lang="ts">
import {
  IonCard,
  IonInput,
  IonList,
  IonListHeader,
  IonLabel,
  IonItem,
  IonSearchbar,
  IonThumbnail,
  IonButtons,
  IonButton,
  IonIcon,
  IonNote,
  toastController,
} from '@ionic/vue';
import { reactive, ref, computed, watch, onBeforeUnmount } from 'vue';
import { addOutline, closeOutline, saveOutline, searchOutline, trashOutline } from 'ionicons/icons';
import { useVuelidate } from '@vuelidate/core';
import { required, maxLength } from '@vuelidate/validators';

import type { Supplier } from '@/controllers/suppliersController';
import { getToken } from '@/services/tokenStorage';

export interface SupplierFormProduct {
  name: string;
  price: number;
  imageBase64?: string | null;
  imageUrl?: string | null;
}

export interface SupplierFormPayload {
  name: string;
  products: SupplierFormProduct[];
}

const props = defineProps<{
  supplier?: Supplier | null;
  submitTrigger?: number;
}>();

const emit = defineEmits<{
  (e: 'saved', payload: SupplierFormPayload): void;
  (e: 'dismiss'): void;
}>();

type Product = { name: string; price: number; imageBase64?: string | null; imageUrl?: string | null };

const form = reactive({ name: '', products: [] as Product[] });
const rules = computed(() => ({
  name: { required, maxLength: maxLength(255) },
}));
const v$ = useVuelidate(rules, form);
const newProduct = reactive({
  name: '',
  price: 0,
  imageBase64: null as string | null,
});
const showNewProductFields = ref(true);
const editingIndex = ref<number | null>(null);
const productSearchTerm = ref('');
const showProductSearch = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

async function presentToast(params: {
  message: string;
  duration: number;
  color: string;
  position: 'bottom' | 'top' | 'middle';
}) {
  const toast = await toastController.create(params);
  await toast.present();
}

async function compressImage(file: File, quality = 0.6): Promise<string> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const maxSize = 1024;
      let { width, height } = img;
      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to compress image'));
    };
    img.src = blobUrl;
  });
}

async function fileToBase64(file: File): Promise<string> {
  if (file.type.startsWith('image/')) {
    try {
      return await compressImage(file, 0.6);
    } catch (err) {
      console.warn('Image compression failed, using original:', err);
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    }
  }
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

async function onFileChange(params: { e: Event }) {
  const { e } = params;
  const el = e.target as HTMLInputElement;
  if (!el || !el.files || !el.files.length) return;
  const f = el.files[0];
  try {
    newProduct.imageBase64 = await fileToBase64(f);
  } catch (err) {
    console.error('Failed to read image', err);
  }
  if (el) el.value = '';
}

function removeImage() {
  newProduct.imageBase64 = null;
  if (fileInput.value) fileInput.value.value = '';
}

const loadedImages = reactive(new Map<string, string>());

async function fetchProductImage(params: { imageUrl: string }): Promise<void> {
  const { imageUrl } = params;
  if (loadedImages.has(imageUrl)) return;
  try {
    const token = await getToken();
    const response = await fetch(imageUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const blob = await response.blob();
    loadedImages.set(imageUrl, URL.createObjectURL(blob));
  } catch {
    // Image unavailable, skip
  }
}

function getProductImage(product: Product): string | null {
  return product.imageBase64 || loadedImages.get(product.imageUrl ?? '') || null;
}

onBeforeUnmount(() => {
  loadedImages.forEach((blobUrl) => {
    URL.revokeObjectURL(blobUrl);
  });
  loadedImages.clear();
});

function loadProductImages(products: Product[]): void {
  for (const product of products) {
    if (!product.imageBase64 && product.imageUrl) {
      fetchProductImage({ imageUrl: product.imageUrl });
    }
  }
}

watch(
  () => props.supplier,
  (s) => {
    if (s) {
      form.name = s.name || '';
      form.products = s.products
        ? structuredClone
          ? structuredClone(s.products)
          : JSON.parse(JSON.stringify(s.products))
        : [];
      loadProductImages(form.products);
      showNewProductFields.value = !form.products || form.products.length === 0;
    } else {
      form.name = '';
      form.products = [];
      showNewProductFields.value = true;
    }
    editingIndex.value = null;
    newProduct.name = '';
    newProduct.price = 0;
    productSearchTerm.value = '';
    showProductSearch.value = false;
  },
  { immediate: true },
);

watch(
  () => props.submitTrigger,
  (val, oldVal) => {
    console.log('[SupplierFormComponent] submitTrigger changed', { val, oldVal });
    if (val !== undefined && val !== oldVal) {
      onSubmit();
    }
  },
);

const filteredProducts = computed(() => {
  const term = (productSearchTerm.value || '').toString().toLowerCase().trim();
  const products = (form.products || []) as Product[];
  const mapped = products.map((p, idx) => ({ product: p, originalIndex: idx }));
  if (!term) return mapped;
  return mapped.filter((item) => {
    const name = (item.product.name || '').toString().toLowerCase();
    const price = item.product.price != null ? String(item.product.price) : '';
    return name.includes(term) || price.includes(term);
  });
});

function toggleProductSearch() {
  showProductSearch.value = !showProductSearch.value;
  if (!showProductSearch.value) productSearchTerm.value = '';
}

function addProduct() {
  const inputElements = document.querySelectorAll('input[placeholder="Nombre del producto"]');
  const inputElement = (inputElements.length > 1 ? inputElements[1] : inputElements[0]) as HTMLInputElement | undefined;
  const priceElements = document.querySelectorAll('input[placeholder="Precio"]');
  const priceInputElement = (priceElements.length > 1 ? priceElements[1] : priceElements[0]) as HTMLInputElement | undefined;

  const productName = (inputElement?.value || newProduct.name || '').trim();
  const productPrice = priceInputElement
    ? parseFloat(priceInputElement.value)
    : Number(newProduct.price);

  if (!productName) return;

  const productData = {
    name: productName,
    price: isNaN(productPrice) ? 0 : productPrice,
    imageBase64: newProduct.imageBase64 || null,
  };

  if (editingIndex.value != null && form.products[editingIndex.value]) {
    form.products.splice(editingIndex.value, 1, productData);
  } else {
    form.products.push(productData);
  }

  editingIndex.value = null;
  newProduct.name = '';
  newProduct.price = 0;
  if (inputElement) inputElement.value = '';
  if (priceInputElement) priceInputElement.value = '';
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
  console.log('[SupplierFormComponent] onSubmit called', { name: form.name, productsCount: form.products?.length });
  v$.value.$touch();
  if (v$.value.$invalid) return;
  if (!form.products || form.products.length === 0) {
    showNewProductFields.value = true;
    presentToast({
      message: 'Debes agregar al menos un producto',
      duration: 2000,
      color: 'warning',
      position: 'bottom',
    });
    return;
  }
  const payload: SupplierFormPayload = {
    name: form.name,
    products: form.products,
  };
  if (props.supplier?.id != null) (payload as any).id = props.supplier.id;
  if (props.supplier?.sync_id) (payload as any).sync_id = props.supplier.sync_id;
  console.log('[SupplierFormComponent] emitting saved', payload);
  emit('saved', payload);
}

function onCancel() {
  emit('dismiss');
}

defineExpose({ submit: onSubmit, cancel: onCancel });
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

ion-item:hover .supplier-actions,
ion-item:focus-within .supplier-actions {
  opacity: 1;
  pointer-events: auto;
}

@media (pointer: fine) {
  ion-item:hover .supplier-actions,
  ion-item:focus-within .supplier-actions {
    opacity: 1;
    pointer-events: auto;
  }
}

@media (pointer: coarse) {
  .supplier-actions {
    opacity: 1;
    pointer-events: auto;
  }
}

</style>
