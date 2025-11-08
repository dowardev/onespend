<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-title>Provedores</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="openModal()">
            <ion-icon :icon="addOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list class="ion-margin-top">
        <ion-list-header>
          <ion-label>Lista de proveedores</ion-label>
        </ion-list-header>
        <ion-item v-for="s in suppliers" :key="s.id">
          <ion-label>
            <h3>{{ s.name }}</h3>
            <p v-if="s.contact">{{ s.contact }}</p>
            <p v-if="s.phone">{{ s.phone }}</p>
            <p v-if="s.email">{{ s.email }}</p>
          </ion-label>

          <ion-buttons slot="end">
            <ion-button color="primary" fill="clear" @click="edit(s)">
              Editar
            </ion-button>

            <ion-button color="danger" fill="clear" @click="remove(s.id)">
              Eliminar
            </ion-button>
          </ion-buttons>
        </ion-item>
      </ion-list>

      <ion-modal :is-open="showModal" @did-dismiss="cancelModal">
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

        <ion-content class="ion-padding">
          <ion-item>
            <ion-label position="stacked">Nombre</ion-label>
            <ion-input v-model="form.name" required></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Contacto</ion-label>
            <ion-input v-model="form.contact"></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Teléfono</ion-label>
            <ion-input v-model="form.phone"></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Email</ion-label>
            <ion-input v-model="form.email"></ion-input>
          </ion-item>

          <ion-list>
            <ion-list-header>
              <ion-label>Productos</ion-label>
            </ion-list-header>

            <ion-item v-for="(p, idx) in form.products" :key="idx">
              <template v-if="editingIndex !== idx">
                <ion-label>
                  <h3>{{ p.name }}</h3>
                  <p v-if="p.price">Precio: {{ p.price }}</p>
                </ion-label>

                <ion-buttons slot="end">
                  <ion-button fill="clear" @click="editProduct(idx)">
                    Editar
                  </ion-button>

                  <ion-button fill="clear" color="danger" @click="removeProduct(idx)">
                    <ion-icon :icon="trashOutline"></ion-icon>
                  </ion-button>
                </ion-buttons>
              </template>

              <template v-else>
                <ion-label position="stacked">Nombre</ion-label>
                <ion-input v-model="editProductCopy.name"></ion-input>

                <ion-label position="stacked">Precio</ion-label>
                <ion-input type="number" v-model.number="editProductCopy.price"></ion-input>

                <ion-buttons slot="end">
                  <ion-button @click="saveProduct(idx)">Guardar</ion-button>
                  <ion-button color="medium" @click="cancelEditProduct">Cancelar</ion-button>
                </ion-buttons>
              </template>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Producto - Nombre</ion-label>
              <ion-input v-model="newProduct.name"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Producto - Precio</ion-label>
              <ion-input type="number" v-model.number="newProduct.price"></ion-input>
            </ion-item>

            <ion-button expand="full" @click="addProduct">Agregar producto</ion-button>
          </ion-list>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonList,
  IonListHeader,
  IonModal,
} from '@ionic/vue';
import { useSuppliers } from '../stores/useSuppliers';
import { addOutline, closeOutline, saveOutline, trashOutline } from 'ionicons/icons';

const supplierStore = useSuppliers();
const suppliers = supplierStore.suppliers;
const loadAll = supplierStore.loadAll;
const createSupplier = supplierStore.createSupplier;
const updateSupplier = supplierStore.updateSupplier;
const deleteSupplier = supplierStore.deleteSupplier;

type Product = { name: string; price: number };

const form = reactive({ name: '', contact: '', phone: '', email: '', products: [] as Product[] });
const newProduct = reactive({ name: '', price: 0 });
const showModal = ref(false);
const selectedId = ref<any>(null);

// editing state for products
const editingIndex = ref<number | null>(null);
const editProductCopy = reactive({ name: '', price: 0 });

function openModal() {
  // abrir modal en modo creación
  selectedId.value = null;
  form.name = '';
  form.contact = '';
  form.phone = '';
  form.email = '';
  form.products = [];
  newProduct.name = '';
  newProduct.price = 0;
  // reset product editing state
  editingIndex.value = null;
  editProductCopy.name = '';
  editProductCopy.price = 0;
  showModal.value = true;
}

function edit(s: any) {
  // abrir modal en modo edición y poblar formulario
  selectedId.value = s.id ?? null;
  form.name = s.name || '';
  form.contact = s.contact || '';
  form.phone = s.phone || '';
  form.email = s.email || '';
  form.products = s.products ? JSON.parse(JSON.stringify(s.products)) : [];
  newProduct.name = '';
  newProduct.price = 0;
  // reset product editing state
  editingIndex.value = null;
  editProductCopy.name = '';
  editProductCopy.price = 0;
  showModal.value = true;
}

function cancelModal() {
  showModal.value = false;
  // reset form
  selectedId.value = null;
  form.name = '';
  form.contact = '';
  form.phone = '';
  form.email = '';
  form.products = [];
  newProduct.name = '';
  newProduct.price = 0;
  // reset product editing state
  editingIndex.value = null;
  editProductCopy.name = '';
  editProductCopy.price = 0;
}

function addProduct() {
  if (!newProduct.name) return;
  form.products.push({ name: newProduct.name, price: Number(newProduct.price) });
  newProduct.name = '';
  newProduct.price = 0;
}

function removeProduct(idx: number) {
  form.products.splice(idx, 1);
  // if we were editing this product, cancel editing
  if (editingIndex.value === idx) {
    editingIndex.value = null;
    editProductCopy.name = '';
    editProductCopy.price = 0;
  }
}

function editProduct(idx: number) {
  const p = form.products[idx];
  if (!p) return;
  editingIndex.value = idx;
  editProductCopy.name = p.name || '';
  editProductCopy.price = Number(p.price) || 0;
}

function saveProduct(idx: number) {
  if (editingIndex.value !== idx) return;
  if (!editProductCopy.name) return;
  form.products.splice(idx, 1, { name: editProductCopy.name, price: Number(editProductCopy.price) });
  editingIndex.value = null;
  editProductCopy.name = '';
  editProductCopy.price = 0;
}

function cancelEditProduct() {
  editingIndex.value = null;
  editProductCopy.name = '';
  editProductCopy.price = 0;
}

onMounted(() => {
  loadAll();
});

async function onSubmit() {
  if (!form.name) return;

  const payload = {
    name: form.name,
    contact: form.contact || undefined,
    phone: form.phone || undefined,
    email: form.email || undefined,
    products: form.products && form.products.length ? form.products : undefined,
  } as any;

  if (selectedId.value == null) {
    // crear
    await createSupplier(payload);
  } else {
    // actualizar
    await updateSupplier({ ...(payload as any), id: selectedId.value });
  }

  cancelModal();
}

async function remove(id: IDBValidKey | undefined) {
  if (id == null) return;
  await deleteSupplier(id);
}
</script>
