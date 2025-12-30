<template>
  <!-- content -->
  <ion-grid>
    <ion-row class="ion-justify-content-center">
      <ion-col size="4">
        <!-- preview of template providers -->
        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Proveedores del template (vista previa)</ion-label>

            <ion-button @click="addEmptyPreviewProvider">
              <ion-icon :icon="addOutline"></ion-icon>
            </ion-button>
          </ion-list-header>

          <div class="list-content">
            <template v-if="previewProviders && previewProviders.length">
              <ProviderCardComponent
                v-for="p in previewProviders"
                :key="p.id"
                :provider="p"
                :is-closed="false"
                :has-products="false"
                @update-provider="handlePreviewUpdateProvider"
                @confirm-remove-proveedor="onPreviewConfirmRemove"
              />
            </template>

            <template v-else>
              <ion-item lines="none">
                <ion-label
                  >No hay proveedores para la fecha seleccionada. Pulsa "+" para
                  agregar uno o selecciona un template.</ion-label
                >
              </ion-item>
            </template>
          </div>
        </ion-list>
      </ion-col>

      <ion-col size="3">
        <div class="ion-padding-start ion-padding-end">
          <ion-item lines="none" class="transparent">
            <ion-label>Template</ion-label>

            <ion-button
              slot="end"
              color="primary"
              :fill="hasAppliedTemplate ? 'solid' : 'clear'"
              class="no-shadow"
              @click="openTemplatesModal"
              >{{
                hasAppliedTemplate ? 'Cambiar template' : 'Aplicar template'
              }}
            </ion-button>
          </ion-item>
        </div>

        <ProvidersSummary
          :efectivo="previewEfectivo"
          :tarjeta="previewTarjeta"
          :credito="previewCredito"
          :ingreso-efectivo="ingresoEfectivo"
          :ingreso-tarjeta="ingresoTarjeta"
          :ingreso-credito="ingresoCredito"
        />
      </ion-col>
    </ion-row>
  </ion-grid>

  <!-- end content -->

  <!-- modals -->
  <!-- templates modal -->
  <ion-modal
    v-model:is-open="showTemplatesModal"
    :keep-contents-mounted="true"
    @did-dismiss="onTemplatesModalDidDismiss"
  >
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="onTemplatesModalDidDismiss">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Aplicar template</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1">
        <ion-list class="transparent">
          <div v-if="templatesModalList.length">
            <ion-item
              v-for="tmpl in templatesModalList"
              :key="String(tmpl.id || tmpl.name)"
              lines="full"
              button
              class="transparent"
              @click.stop="applyTemplateFromModal(tmpl)"
            >
              <ion-label>
                <h2>{{ tmpl.name }}</h2>
                <p>{{ tmpl.description }}</p>
              </ion-label>
            </ion-item>
          </div>

          <template v-else>
            <ion-item>
              <ion-label>No hay templates</ion-label>
            </ion-item>
          </template>
        </ion-list>
      </ion-card>
    </ion-content>
  </ion-modal>
  <!-- end modals -->

  <!-- alerts -->
  <!-- apply conflict alert -->
  <ion-alert
    :is-open="showApplyConflictModal"
    header="Conflicto de datos"
    :message="applyConflictMessage"
    :buttons="[
      { text: 'Cancelar', role: 'cancel', handler: onApplyConflictDismiss },
      { text: 'Combinar', handler: handleApplyConflictCombine },
      {
        text: 'Sobrescribir',
        cssClass: 'danger',
        handler: handleApplyConflictOverwrite,
      },
    ]"
    @did-dismiss="onApplyConflictDismiss"
  ></ion-alert>
  <!-- end alerts -->
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonModal,
  IonList,
  IonItem,
  IonLabel,
  IonCard,
  IonAlert,
  IonButtons,
  IonIcon,
} from '@ionic/vue';
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { format } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';

import TemplateController from '@/controllers/TempalteController';
import suppliersController from '@/controllers/suppliersController';
import {
  buildAndSaveTemplateApplication,
  buildPayloadFromTemplate,
} from '@/controllers/templateService';
import { formatLocalDate, parseLocalDate } from '@/utils/date';

import { addOutline, closeOutline } from 'ionicons/icons';
import ProviderCardComponent from './ProviderCardComponent.vue';
import ProvidersSummary from './components/ProvidersSummary.vue';

// Local storage key used by Budget view
const STORAGE_KEY = 'budget:selectedDate';

// Templates modal state
const templatesModalList = reactive<any[]>([]);
const showTemplatesModal = ref(false);
const showApplyConflictModal = ref(false);
const applyConflictMessage = ref('');
const pendingApplyPayload = ref<any | null>(null);
const pendingApplyTemplate = ref<any | null>(null);

const props = defineProps<{
  selectedDate?: string | null;
  providers?: any[];
  // ingresos disponibles para la fecha (opcional) - se usan para comparar con lo requerido por proveedores
  ingresoEfectivo?: number | string;
  ingresoTarjeta?: number | string;
  ingresoCredito?: number | string;
}>();

// Preview providers extracted from the template (rendered with ProviderCardComponent)
const previewProviders = reactive<any[]>([]);

const router = useRouter();

// Preview totals by payment method
const previewEfectivo = computed(() => {
  try {
    return previewProviders.reduce((s, p) => s + Number(p.efectivo || 0), 0);
  } catch (_e) {
    return 0;
  }
});
const previewTarjeta = computed(() => {
  try {
    return previewProviders.reduce((s, p) => s + Number(p.tarjeta || 0), 0);
  } catch (_e) {
    return 0;
  }
});

// Handler to remove a preview provider when child requests deletion
function onPreviewConfirmRemove(payload: {
  id?: string | number;
  name?: string;
}) {
  try {
    const id = payload && payload.id !== undefined ? payload.id : payload;
    const idx = previewProviders.findIndex((p: any) => p.id === id);
    if (idx >= 0) previewProviders.splice(idx, 1);
  } catch (err) {
    console.error('onPreviewConfirmRemove error', err);
  }
}
const previewCredito = computed(() => {
  try {
    return previewProviders.reduce((s, p) => s + Number(p.credito || 0), 0);
  } catch (_e) {
    return 0;
  }
});

// Computed: whether the currently selected date already has a template applied
const hasAppliedTemplate = computed(() => {
  try {
    if (Array.isArray(props.providers) && props.providers.length) {
      return props.providers.some((p: any) => !!p._fromTemplate);
    }
    return false;
  } catch (_e) {
    return false;
  }
});

// If parent provides an initial payload, populate preview on mount
try {
  if (props.initialPreviewPayload && props.initialPreviewPayload.data) {
    const p = props.initialPreviewPayload.data.proveedores || [];
    previewProviders.splice(0, previewProviders.length, ...(p || []));
  } else if (Array.isArray(props.providers) && props.providers.length) {
    // No preview payload: populate preview with existing providers for the selected date
    previewProviders.splice(
      0,
      previewProviders.length,
      ...(props.providers || [])
    );
  }
} catch (_e) {
  /* noop */
}

function selectedDateFallback() {
  try {
    return formatLocalDate();
  } catch (_e) {
    return formatLocalDate();
  }
}

// react to selectedDate prop changes to refresh preview if needed
import { watch } from 'vue';
watch(
  () => props.selectedDate,
  newVal => {
    // If an initial payload exists and it references selectedDate, keep it; otherwise, no-op
    // For now we just leave preview as-is. Could rebuild preview using tmpl when needed.
  }
);

async function loadTemplatesForModal() {
  try {
    if (typeof (TemplateController as any).listTemplates === 'function') {
      const list = await (TemplateController as any).listTemplates();
      templatesModalList.splice(0, templatesModalList.length, ...(list || []));
    } else if (typeof (TemplateController as any).list === 'function') {
      const list = await (TemplateController as any).list();
      templatesModalList.splice(0, templatesModalList.length, ...(list || []));
    } else {
      templatesModalList.splice(0, templatesModalList.length);
    }
  } catch (e) {
    console.error('loadTemplatesForModal error', e);
    templatesModalList.splice(0, templatesModalList.length);
  }
}

function openTemplatesModal() {
  try {
    loadTemplatesForModal();
    setTimeout(() => (showTemplatesModal.value = true), 50);
  } catch (e) {
    console.error('openTemplatesModal error', e);
  }
}

function onTemplatesModalDidDismiss() {
  try {
    showTemplatesModal.value = false;
  } catch (_e) {
    /* noop */
  }
}

function handlePreviewUpdateProvider(payload: {
  id: string | number;
  field: string;
  value: any;
}) {
  try {
    const { id, field, value } = payload || ({} as any);
    const p = previewProviders.find((x: any) => x.id === id);
    if (!p) return;
    if (['efectivo', 'tarjeta', 'credito'].includes(field)) {
      (p as any)[field] = Number(value) || 0;
    } else if (field === 'name') {
      p.name = String(value || '');
    }
    console.log('handlePreviewUpdateProvider updated', { id, field, value, p });
  } catch (e) {
    console.error('handlePreviewUpdateProvider error', e);
  }
}

// Add an empty provider to the preview list
function addEmptyPreviewProvider() {
  try {
    const newItem = {
      id: Date.now() + Math.random(),
      name: '',
      efectivo: 0,
      tarjeta: 0,
      credito: 0,
      dollar: 0,
      estimated: 0,
      notes: '',
      visited: false,
      _justAdded: true,
    } as any;
    previewProviders.push(newItem);
    // remove new-mark after a short delay (for animation if applicable)
    setTimeout(() => {
      try {
        newItem._justAdded = false;
      } catch (_e) {
        /* noop */
      }
    }, 400);
  } catch (err) {
    console.error('addEmptyPreviewProvider error', err);
  }
}

// Helper: attempt to load suppliers list from suppliersController (various method names)
async function loadSuppliersListForTemplates(): Promise<any[]> {
  try {
    let suppliersList: any[] = [];
    if (typeof (suppliersController as any).listSuppliers === 'function') {
      try {
        const res = await (suppliersController as any).listSuppliers();
        if (Array.isArray(res)) return res;
      } catch (_e) {
        /* noop */
      }
    }

    const candidates = ['list', 'listAll', 'getAll', 'getSuppliers'];
    for (const name of candidates) {
      const fn = (suppliersController as any)[name];
      if (typeof fn === 'function') {
        try {
          const r = await fn();
          if (Array.isArray(r)) return r;
        } catch (_e) {
          /* noop */
        }
      }
    }
    return suppliersList;
  } catch (_e) {
    return [];
  }
}

function handleTemplateConflict(result: any, tmpl: any, dateISO: string) {
  try {
    try {
      const parsedDate = parseLocalDate(String(dateISO));
      applyConflictMessage.value = `Ya existen proveedores guardados para ${format(parsedDate, "d 'de' MMMM 'de' yyyy", { locale: esLocale })}. ¿Deseas combinar el template con los proveedores existentes o sobrescribirlos?`;
    } catch (_e) {
      applyConflictMessage.value = `Ya existen proveedores guardados para la fecha seleccionada. ¿Deseas combinar el template con los proveedores existentes o sobrescribirlos?`;
    }
    pendingApplyPayload.value = result.payloadToSave;
    pendingApplyTemplate.value = tmpl;
    showApplyConflictModal.value = true;
  } catch (err) {
    console.error('handleTemplateConflict error', err);
  }
}

async function navigateToBudget(dateISO: string) {
  try {
    try {
      localStorage.setItem(STORAGE_KEY, String(dateISO));
    } catch (_e) {
      /* noop */
    }

    showTemplatesModal.value = false;
    try {
      if ((router.currentRoute.value.name || '') === 'Budget') {
        // if already in budget route, push a refresh query
        await router.push({
          name: 'Budget',
          query: { refresh: String(Date.now()), date: dateISO },
        });
      } else {
        await router.push({
          name: 'Budget',
          query: { refresh: String(Date.now()), date: dateISO },
        });
      }
    } catch (_e) {
      // fallback
      window.location.href =
        '#/budget?refresh=' +
        String(Date.now()) +
        '&date=' +
        encodeURIComponent(dateISO);
    }
  } catch (err) {
    console.error('navigateToBudget error', err);
  }
}

async function applyTemplateFromModal(tmpl: any) {
  try {
    if (!tmpl) return;
    // Use today's date as default target date for templates in providers view
    const dateISO = formatLocalDate(
      props.selectedDate ?? selectedDateFallback()
    );

    // Load suppliers list (helper encapsulates fallbacks)
    const suppliersList = await loadSuppliersListForTemplates();

    const resolveName = (id: any) => {
      try {
        const found = suppliersList.find((s: any) => s && s.id === id);
        return found ? found.name : null;
      } catch (_e) {
        return null;
      }
    };

    // Build a preview payload from template so we can show providers before saving
    try {
      const payload = buildPayloadFromTemplate(tmpl, dateISO, resolveName);
      if (payload && Array.isArray(payload.proveedores)) {
        previewProviders.splice(
          0,
          previewProviders.length,
          ...payload.proveedores
        );
      } else {
        previewProviders.splice(0, previewProviders.length);
      }
    } catch (_e) {
      previewProviders.splice(0, previewProviders.length);
    }

    // Actually attempt to save/apply template (this will prompt conflict if needed)
    const result = await buildAndSaveTemplateApplication(
      tmpl,
      dateISO,
      resolveName,
      { conflictStrategy: 'ask' }
    );

    if (result && result.conflict) {
      handleTemplateConflict(result, tmpl, dateISO);
      return;
    }

    if (result && result.success) {
      await navigateToBudget(dateISO);
      pendingApplyTemplate.value = null;
      return;
    }

    console.error('applyTemplateFromModal: unexpected result', result);
  } catch (e) {
    console.error('applyTemplateFromModal error', e);
  }
}

function onApplyConflictDismiss() {
  try {
    showApplyConflictModal.value = false;
    pendingApplyPayload.value = null;
  } catch (_e) {
    /* noop */
  }
}

async function handleApplyConflictCombine() {
  try {
    const payloadToSave = pendingApplyPayload.value;
    if (!payloadToSave) return onApplyConflictDismiss();

    const dateISO = payloadToSave.data?.selectedDate;
    let suppliersList: any[] = [];
    try {
      const resList =
        typeof (suppliersController as any).listSuppliers === 'function'
          ? await (suppliersController as any).listSuppliers()
          : null;
      if (Array.isArray(resList)) suppliersList = resList;
    } catch (_e) {
      try {
        const candidates = ['list', 'listAll', 'getAll', 'getSuppliers'];
        for (const name of candidates) {
          const fn = (suppliersController as any)[name];
          if (typeof fn === 'function') {
            try {
              const r = await fn();
              if (Array.isArray(r)) {
                suppliersList = r;
                break;
              }
            } catch (_ee) {
              /* noop */
            }
          }
        }
      } catch (_ee) {
        /* noop */
      }
    }

    const res = await buildAndSaveTemplateApplication(
      pendingApplyTemplate.value || null,
      dateISO,
      (id: any) => {
        try {
          const found = suppliersList.find((s: any) => s && s.id === id);
          return found ? found.name : null;
        } catch (_e) {
          return null;
        }
      },
      {
        conflictStrategy: 'combine',
        prebuiltPayload: pendingApplyPayload.value,
      }
    );

    if (res && res.success) {
      try {
        localStorage.setItem(STORAGE_KEY, String(dateISO));
      } catch (_e) {
        /* noop */
      }

      showApplyConflictModal.value = false;
      pendingApplyPayload.value = null;
      showTemplatesModal.value = false;

      await navigateToBudget(dateISO);
      return;
    }

    console.error('handleApplyConflictCombine: unexpected result', res);
  } catch (e) {
    console.error('handleApplyConflictCombine error', e);
  }
}

async function handleApplyConflictOverwrite() {
  try {
    const payloadToSave = pendingApplyPayload.value;
    if (!payloadToSave) return onApplyConflictDismiss();

    const dateISO = payloadToSave.data?.selectedDate;
    let suppliersList: any[] = [];
    try {
      const resList =
        typeof (suppliersController as any).listSuppliers === 'function'
          ? await (suppliersController as any).listSuppliers()
          : null;
      if (Array.isArray(resList)) suppliersList = resList;
    } catch (_e) {
      try {
        const candidates = ['list', 'listAll', 'getAll', 'getSuppliers'];
        for (const name of candidates) {
          const fn = (suppliersController as any)[name];
          if (typeof fn === 'function') {
            try {
              const r = await fn();
              if (Array.isArray(r)) {
                suppliersList = r;
                break;
              }
            } catch (_ee) {
              /* noop */
            }
          }
        }
      } catch (_ee) {
        /* noop */
      }
    }

    const res = await buildAndSaveTemplateApplication(
      pendingApplyTemplate.value || null,
      dateISO,
      (id: any) => {
        try {
          const found = suppliersList.find((s: any) => s && s.id === id);
          return found ? found.name : null;
        } catch (_e) {
          return null;
        }
      },
      {
        conflictStrategy: 'overwrite',
        prebuiltPayload: pendingApplyPayload.value,
      }
    );

    if (res && res.success) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          String(payloadToSave.data?.selectedDate)
        );
      } catch (_e) {
        /* noop */
      }

      showApplyConflictModal.value = false;
      pendingApplyPayload.value = null;
      showTemplatesModal.value = false;

      await navigateToBudget(dateISO);
      return;
    }

    console.error('handleApplyConflictOverwrite: unexpected result', res);
  } catch (e) {
    console.error('handleApplyConflictOverwrite error', e);
  }
}
</script>

<style scoped>
ion-card {
  margin-top: 8px;
}
</style>
