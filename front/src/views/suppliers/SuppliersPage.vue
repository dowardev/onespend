<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode" />
        </ion-buttons>

        <ion-title>Provedores</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="openModal()">
            <ion-icon :icon="addOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1 main-card-content">
        <ion-list style="height: 100%" class="ion-margin-top transparent">
          <ion-list-header>
            <ion-label>Lista de proveedores</ion-label>
          </ion-list-header>

          <!-- search providers -->
          <ion-searchbar
            v-model="searchTerm"
            mode="ios"
            placeholder="Buscar proveedores"
            show-clear-button="focus"
          ></ion-searchbar>

          <div class="list-content suppliers__content">
            <template v-for="group in groupedSuppliers" :key="group.letter">
              <ion-item-group>
                <ion-item-divider sticky>
                  <ion-label>{{ group.letter }}</ion-label>
                </ion-item-divider>

                <ion-item
                  v-for="s in group.items"
                  :key="s.id"
                  button
                  class="transparent"
                  @click="edit({ s })"
                >
                  <ion-label>
                    <h3>{{ s.name }}</h3>
                  </ion-label>

                  <ion-buttons slot="end" class="supplier-actions">
                    <ion-button
                      color="danger"
                      fill="clear"
                      @click.stop="
                        confirmRemoveSupplier({ id: s.id, name: s.name })
                      "
                    >
                      <ion-icon :icon="trashOutline" color="danger"></ion-icon>
                    </ion-button>
                  </ion-buttons>
                </ion-item>
              </ion-item-group>
            </template>
          </div>
        </ion-list>
      </ion-card>

      <!-- modals -->
      <ion-modal
        class="suppliers__modal"
        :is-open="showModal"
        :backdrop-dismiss="false"
        @did-dismiss="cancelModal"
      >
        <AddSupliersComponent
          :supplier="modalSupplier"
          @dismiss="cancelModal"
          @saved="onModalSaved"
        />
      </ion-modal>
      <!-- end modals -->

      <!-- alerts -->
      <ion-alert
        :is-open="deleteConfirmSupplier.open"
        :message="`¿Eliminar proveedor ${deleteConfirmSupplier.supplierName}?`"
        :buttons="getAlertButtonsSupplier()"
        @did-dismiss="onDeleteAlertDidDismissSupplier"
      ></ion-alert>
      <!-- end alerts -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Imports
import { onMounted, ref, computed, unref, reactive } from 'vue';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonButton,
  IonList,
  IonListHeader,
  IonItemGroup,
  IonItemDivider,
  IonModal,
  IonAlert,
  IonButtons,
  IonIcon,
  IonCard,
  IonMenuButton,
  IonSearchbar,
} from '@ionic/vue';
import { addOutline, trashOutline } from 'ionicons/icons';
// End Imports

// Components
import AddSupliersComponent from '../suppliers/modals/AddSupliersComponent.vue';
import type { Product } from '../controllers/suppliersController';

interface SupplierGroup {
  letter: string;
  items: Supplier[];
}
// End Components

// Controllers
import systemController from '@/controllers/systemConfigController';
import suppliersController from '@/controllers/suppliersController';
import type { Supplier } from '@/controllers/suppliersController';
// End Controllers

// Vars
const showModal = ref(false);
const modalSupplier = ref<Supplier | null>(null);
const searchTerm = ref('');
const deleteConfirmSupplier = reactive({
  open: false,
  supplierId: null as string | number | null,
  supplierName: '' as string,
});

// End Vars

// Functions
function openModal() {
  modalSupplier.value = null;
  showModal.value = true;
}

function edit(params: { supplier: Supplier }) {
  const { supplier } = params;
  console.log('Supplier data:', supplier);
  modalSupplier.value = supplier;
  showModal.value = true;
}

function cancelModal() {
  showModal.value = false;
  modalSupplier.value = null;
}

function confirmRemoveSupplier(params: {
  id: string | number | null | undefined;
  name?: string;
}) {
  const { id, name } = params;
  deleteConfirmSupplier.open = true;
  deleteConfirmSupplier.supplierId = id ?? null;
  deleteConfirmSupplier.supplierName = name ?? '';
}

function getAlertButtonsSupplier() {
  return [
    {
      text: 'Cancelar',
      role: 'cancel',
      handler: () => {},
    },
    {
      text: 'Eliminar',
      role: 'destructive',
      handler: () => {
        void removeSupplierConfirmed();
      },
    },
  ];
}

async function removeSupplierConfirmed() {
  const id = deleteConfirmSupplier.supplierId;
  deleteConfirmSupplier.open = false;
  deleteConfirmSupplier.supplierId = null;
  deleteConfirmSupplier.supplierName = '';

  if (id == null) return;
  await remove(id);
}

function onDeleteAlertDidDismissSupplier() {
  deleteConfirmSupplier.open = false;
  deleteConfirmSupplier.supplierId = null;
  deleteConfirmSupplier.supplierName = '';
}

async function onModalSaved(payload: Supplier) {
  if (!payload) return;
  
  if (payload.id != null) {
    const existingSupplier = suppliers.value.find((s: Supplier) => String(s.id) === String(payload.id));
    if (existingSupplier && existingSupplier.sync_id) {
      payload.sync_id = existingSupplier.sync_id;
    }
    await suppliersController.updateSupplier({ s: payload });
  } else {
    await suppliersController.addSupplier({ s: payload });
  }

  cancelModal();
  await suppliersController.listSuppliers();
}

async function remove(id: IDBValidKey | undefined) {
  if (id == null) return;
  await suppliersController.deleteSupplier({ id });
  await suppliersController.listSuppliers();
}

const groupedSuppliers = computed(() => {
  const list = (unref(suppliers) || []).slice();
  list.sort((a: Supplier, b: Supplier) => {
    const na = (a.name || '').toString().toLowerCase();
    const nb = (b.name || '').toString().toLowerCase();
    return na.localeCompare(nb);
  });

  const map = new Map<string, Supplier[]>();
  list.forEach((s: Supplier) => {
    const name = (s.name || '').toString().trim();
    const letter = name ? name[0].toUpperCase() : '#';
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(s);
  });

  return Array.from(map.keys())
    .sort()
    .map(letter => ({ letter, items: map.get(letter) || [] }));
});

// End Life cycle

// Computed
const designMode = computed(() => systemController.getDesignMode());

const suppliers = computed(() => suppliersController.getSuppliers());

const filteredSuppliers = computed(() => {
  const term = (searchTerm.value || '').toString().toLowerCase().trim();
  const list = unref(suppliers) || [];
  if (!term) return list;
  return list.filter((s: Supplier) => {
    const name = (s.name || '').toString().toLowerCase();
    const products = (s.products || [])
      .map((p: Product) => (p.name || '').toString().toLowerCase())
      .join(' ');
    return name.includes(term) || products.includes(term);
  });
});

// End Computed

// Methods

// Watch
</script>

<style scoped>
.suppliers__content {
  height: calc(100% - 117px);
  overflow-y: auto;
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

/* Large phones / small tablets (portrait) */
@media (min-width: 426px) and (max-width: 768px) {
  /* .suppliers__modal { */
  /*   --height: 60dvh; */
  /* } */
}

/* Tablets / small desktop */
@media (min-width: 769px) and (max-width: 1024px) {
  /* .suppliers__modal { */
  /*   --height: 60dvh; */
  /* } */
}

/* Desktop */
@media (min-width: 1025px) and (max-width: 1440px) {
  .suppliers__modal {
    --height: 80dvh;
  }
}

/* Large desktop / wide screens */
@media (min-width: 1441px) {
  .suppliers__modal {
    --height: 80dvh;
  }
}
</style>
