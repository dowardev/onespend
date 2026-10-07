<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

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
      <ion-grid class="suppliers__grid">
        <ion-row class="ion-justify-content-center">
          <ion-col size-xs="12" size-md="10" size-lg="8" size-xl="6" class="suppliers__col">
            <ion-list class="transparent">
              <ion-list-header>
                <ion-label>{{ t('suppliers.supplierspage.label') }}</ion-label>

                <ion-button v-if="!showSearch" @click="showSearch = true">
                  <ion-icon :icon="searchOutline"></ion-icon>
                </ion-button>
              </ion-list-header>

              <!-- search providers -->
              <div class="search-row" :class="{ 'search-row--open': showSearch }">
                <div class="search-row__inner">
                  <ion-item lines="none">
                    <ion-searchbar
                      v-model="searchTerm"
                      mode="ios"
                      :placeholder="t('suppliers.supplierspage.placeholder')"
                      show-clear-button="focus"
                    ></ion-searchbar>

                    <ion-button fill="clear" @click="showSearch = false">{{ t('common.cancel') }}</ion-button>
                  </ion-item>
                </div>
              </div>

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
                      @click="edit({ supplier: s })"
                    >
                      <ion-label>
                        <h3>{{ s.name }}</h3>
                      </ion-label>

                      <ion-buttons slot="end" class="supplier-actions">
                        <ion-button
                          color="danger"
                          fill="clear"
                          @click.stop="confirmRemoveSupplier({ id: s.id, name: s.name })"
                        >
                          <ion-icon :icon="trashOutline" color="danger"></ion-icon>
                        </ion-button>
                      </ion-buttons>
                    </ion-item>
                  </ion-item-group>
                </template>
              </div>
            </ion-list>
          </ion-col>
        </ion-row>
      </ion-grid>

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
import { onMounted, ref, computed, unref, reactive,  } from 'vue';
import { useLocale } from '@/composables/useLocale';
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
  IonMenuButton,
  IonSearchbar,
} from '@ionic/vue';
import { addOutline, searchOutline, trashOutline } from 'ionicons/icons';
// End Imports

// Components
import AddSupliersComponent from '../suppliers/modals/AddSupliersComponent.vue';
import type { Product } from '@/controllers/supplierProductsController';

interface SupplierGroup {
  letter: string;
  items: Supplier[];
}
// End Components

// Controllers
import systemController from '@/controllers/systemConfigController';
import suppliersController from '@/controllers/suppliersController';
import type { Supplier } from '@/controllers/suppliersController';

const { t } = useLocale();
// End Controllers

// Vars
const showModal = ref(false);
const modalSupplier = ref<Supplier | null>(null);
const searchTerm = ref('');
const showSearch = ref(false);
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

function confirmRemoveSupplier(params: { id: string | number | null | undefined; name?: string }) {
  const { id, name } = params;
  deleteConfirmSupplier.open = true;
  deleteConfirmSupplier.supplierId = id ?? null;
  deleteConfirmSupplier.supplierName = name ?? '';
}

function getAlertButtonsSupplier() {
  return [
    {
      text: t('suppliers.supplierspage.text1'),
      role: 'cancel',
      handler: () => {},
    },
    {
      text: t('suppliers.supplierspage.text2'),
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

  try {
    if (payload.id != null) {
      const existingSupplier = suppliers.value.find(
        (s: Supplier) => String(s.id) === String(payload.id),
      );
      if (existingSupplier && existingSupplier.sync_id) {
        payload.sync_id = existingSupplier.sync_id;
      }
      await suppliersController.updateSupplier({ s: payload });
    } else {
      await suppliersController.addSupplier({ s: payload });
    }
  } catch (e) {
    console.error('[SuppliersPage] onModalSaved - error saving supplier:', e);
  } finally {
    try {
      cancelModal();
      await suppliersController.listSuppliers();
    } catch (e) {
      console.error('[SuppliersPage] onModalSaved - error during final steps:', e);
    }
  }
}

async function remove(id: string | number | undefined) {
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
    .map((letter) => ({ letter, items: map.get(letter) || [] }));
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

// Load suppliers when the page mounts
onMounted(async () => {
  try {
    await suppliersController.listSuppliers();
  } catch (e) {
    console.error('[SuppliersPage] Error loading suppliers on mount:', e);
  }
});
</script>

<style scoped>
/* cadena de altura: grid/row/col ocupan todo el alto del content */
.suppliers__grid {
  height: 100%;
}

.suppliers__grid .ion-row,
.suppliers__grid ion-row {
  height: 100%;
}

.suppliers__col {
  height: 100%;
}

/* el list ocupa todo el alto disponible del content */
ion-list.transparent {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* scroll interno: el div se adapta al espacio restante (searchbar abierto/cerrado) */
/* y activa su scroll solo cuando el contenido choca con el borde */
.suppliers__content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* searchbar show/hide animation */
.search-row {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 300ms ease;
}

.search-row--open {
  grid-template-rows: 1fr;
}

.search-row__inner {
  min-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: opacity 200ms ease;
}

.search-row--open .search-row__inner {
  opacity: 1;
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
