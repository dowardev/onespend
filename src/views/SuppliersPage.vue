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
import { addOutline, closeOutline, saveOutline } from 'ionicons/icons';

const supplierStore = useSuppliers();
const suppliers = supplierStore.suppliers;
const loadAll = supplierStore.loadAll;
const createSupplier = supplierStore.createSupplier;
const updateSupplier = supplierStore.updateSupplier;
const deleteSupplier = supplierStore.deleteSupplier;

const form = reactive({ name: '', contact: '', phone: '', email: '' });
const showModal = ref(false);
const selectedId = ref<any>(null);

function openModal() {
  // abrir modal en modo creación
  selectedId.value = null;
  form.name = '';
  form.contact = '';
  form.phone = '';
  form.email = '';
  showModal.value = true;
}

function edit(s: any) {
  // abrir modal en modo edición y poblar formulario
  selectedId.value = s.id ?? null;
  form.name = s.name || '';
  form.contact = s.contact || '';
  form.phone = s.phone || '';
  form.email = s.email || '';
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
