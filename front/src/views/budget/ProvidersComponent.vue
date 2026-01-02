<template>
  <ion-grid>
    <ion-row class="ion-justify-content-center">
      <ion-col size="4">
        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Proveedores</ion-label>

            <ion-button @click="addEmptyProvider">
              <ion-icon :icon="addOutline"></ion-icon>
            </ion-button>

            <ion-button @click="openTemplatesModal">
              <ion-icon :icon="documentOutline"></ion-icon>
            </ion-button>
          </ion-list-header>

          <div class="list-content">
            <template v-if="store.providers.length">
              <ProviderCardComponent
                v-for="p in store.providers"
                :key="p.id"
                :provider="p"
                :has-products="false"
                @update-provider="handleUpdateProvider"
                @confirm-remove-proveedor="confirmRemoveProveedor"
              />
            </template>

            <template v-else>
              <ion-item lines="none">
                <ion-label
                  >No hay proveedores para la fecha seleccionada. Pulsa "+" para
                  agregar uno.</ion-label
                >
              </ion-item>
            </template>
          </div>
        </ion-list>
      </ion-col>

      <ion-col size="3">
        <ProvidersSummary
          :efectivo="store.totalEfectivo"
          :tarjeta="store.totalTarjeta"
          :credito="store.totalCredito"
          :ingreso-efectivo="store.ingresosEfectivo"
          :ingreso-tarjeta="store.ingresosTarjeta"
          :ingreso-credito="0"
        />
      </ion-col>
    </ion-row>
  </ion-grid>

  <ion-modal
    :is-open="showTemplatesModal"
    :keep-contents-mounted="true"
    @did-dismiss="showTemplatesModal = false"
  >
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="showTemplatesModal = false">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Aplicar template</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1">
        <ion-list class="transparent">
          <template v-if="templatesList.length">
            <ion-item
              v-for="tmpl in templatesList"
              :key="tmpl.id"
              lines="full"
              button
              class="transparent"
              @click.stop="checkTemplateConflict(tmpl)"
            >
              <ion-label>
                <h2>{{ tmpl.name }}</h2>
                <p>{{ tmpl.description }}</p>
              </ion-label>
            </ion-item>
          </template>

          <template v-else>
            <ion-item>
              <ion-label>No hay templates</ion-label>
            </ion-item>
          </template>
        </ion-list>
      </ion-card>
    </ion-content>
  </ion-modal>

  <ion-alert
    :is-open="showConflictModal"
    header="Conflicto de datos"
    :message="conflictMessage"
    :buttons="[
      {
        text: 'Cancelar',
        role: 'cancel',
        handler: () => {
          showConflictModal = false;
        },
      },
      { text: 'Combinar', handler: handleCombine },
      { text: 'Sobrescribir', cssClass: 'danger', handler: handleOverwrite },
    ]"
    @did-dismiss="showConflictModal = false"
  ></ion-alert>

  <ion-alert
    :is-open="deleteConfirm.open"
    header="Confirmar eliminación"
    :message="`¿Eliminar proveedor «${deleteConfirm.providerName}»? Esta acción no se puede deshacer.`"
    :buttons="[
      {
        text: 'Cancelar',
        role: 'cancel',
        cssClass: 'secondary',
        handler: () => {
          deleteConfirm.open = false;
          deleteConfirm.providerId = null;
          deleteConfirm.providerName = '';
        },
      },
      {
        text: 'Eliminar',
        cssClass: 'danger',
        handler: removeProveedorConfirmed,
      },
    ]"
    @did-dismiss="
      () => {
        deleteConfirm.open = false;
        deleteConfirm.providerId = null;
        deleteConfirm.providerName = '';
      }
    "
  ></ion-alert>
</template>

<script setup lang="ts">
import {
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonListHeader,
  IonLabel,
  IonButton,
  IonIcon,
  IonItem,
  IonAlert,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonCard,
} from '@ionic/vue';
import { ref, reactive } from 'vue';
import { addOutline, documentOutline, closeOutline } from 'ionicons/icons';

import ProviderCardComponent from './ProviderCardComponent.vue';
import ProvidersSummary from './components/ProvidersSummary.vue';
import { useBudgetStore } from '@/stores/budgetStore';
import TemplateController from '@/controllers/TempalteController';
import { buildPayloadFromTemplate } from '@/controllers/templateService';

const store = useBudgetStore();

const showTemplatesModal = ref(false);
const showConflictModal = ref(false);
const conflictMessage = ref('');
const templatesList = ref<any[]>([]);
const pendingTemplate = ref<any>(null);
const pendingProviders = ref<any[]>([]);

const deleteConfirm = reactive({
  open: false,
  providerId: null as string | number | null,
  providerName: '' as string,
});

function addEmptyProvider() {
  store.addProvider({ name: '', estimated: 0, dollar: 0, allowEmpty: true });
}

function handleUpdateProvider(payload: {
  id: string | number;
  field: string;
  value: any;
}) {
  const { id, field, value } = payload;
  store.updateProvider(id, { [field]: value });
}

function confirmRemoveProveedor(
  payload: { id?: string | number; name?: string } | any
) {
  const id =
    payload && (payload as any).id !== undefined
      ? (payload as any).id
      : (payload as any);
  const name =
    payload && (payload as any).name !== undefined
      ? (payload as any).name
      : (payload as any)?.name || '';
  deleteConfirm.providerId = id;
  deleteConfirm.providerName = name || '';
  deleteConfirm.open = true;
}

function removeProveedorConfirmed() {
  const pid = deleteConfirm.providerId;
  deleteConfirm.open = false;
  if (pid != null) store.removeProvider(pid);
  deleteConfirm.providerId = null;
  deleteConfirm.providerName = '';
}

async function openTemplatesModal() {
  try {
    const list = await TemplateController.listTemplates();
    templatesList.value = list || [];
  } catch (e) {
    templatesList.value = [];
  }
  showTemplatesModal.value = true;
}

async function checkTemplateConflict(tmpl: any) {
  try {
    const dateISO = store.selectedDate;
    const payload = buildPayloadFromTemplate(tmpl, dateISO, () => null);

    const templateProviders = payload.proveedores || [];

    if (store.providers.length > 0 && templateProviders.length > 0) {
      conflictMessage.value = `Ya hay ${store.providers.length} proveedor(es) registrado(s) para esta fecha. El template tiene ${templateProviders.length} proveedor(es). ¿Deseas combinar o sobrescribir?`;
      pendingTemplate.value = tmpl;
      pendingProviders.value = templateProviders;
      showConflictModal.value = true;
    } else {
      applyProviders(templateProviders);
      showTemplatesModal.value = false;
    }
  } catch (e) {
    console.error('checkTemplateConflict error', e);
    showTemplatesModal.value = false;
  }
}

function applyProviders(providers: any[]) {
  providers.forEach((p: any) => {
    store.addProvider({
      name: p.name,
      estimated: p.estimated,
      dollar: p.dollar,
    });
  });
}

function handleCombine() {
  if (pendingProviders.value.length > 0) {
    applyProviders(pendingProviders.value);
  }
  showConflictModal.value = false;
  pendingTemplate.value = null;
  pendingProviders.value = [];
  showTemplatesModal.value = false;
}

function handleOverwrite() {
  store.providers.splice(0, store.providers.length);
  if (pendingProviders.value.length > 0) {
    applyProviders(pendingProviders.value);
  }
  showConflictModal.value = false;
  pendingTemplate.value = null;
  pendingProviders.value = [];
  showTemplatesModal.value = false;
}
</script>
