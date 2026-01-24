<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button fill="clear" @click="emitClose">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>{{
          isEditMode ? 'Editar template' : 'Nuevo template'
        }}</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="submitTemplate">
            <ion-icon :icon="saveOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1 ion-padding-start">
        <ion-input
          v-model="form.name"
          label="Nombre del template"
          label-placement="floating"
          placeholder="Ej: Día base"
        ></ion-input>
      </ion-card>

      <!-- Suppliers selection: search + multi-select -->
      <ion-list class="transparent templates__suppliers-list">
        <ion-list-header>
          <ion-label>Proveedores</ion-label>

          <ion-buttons>
            <ion-button
              color="primary"
              fill="clear"
              :disabled="searchVisible"
              @click="openSearch"
            >
              <ion-icon :icon="searchOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-list-header>

        <div
          class="list-content templates__suppliers-content"
          style="overflow-y: auto"
        >
          <template v-if="searchVisible">
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
                ref="supplierSearchbar"
                v-model="supplierQuery"
                mode="ios"
                :debounce="300"
                placeholder="Buscar proveedores"
                show-cancel-button="focus"
                @ion-clear="onSearchCancel"
                @ion-cancel="onSearchCancel"
              ></ion-searchbar>

              <ion-button slot="end" fill="clear" @click="searchVisible = false"
                >Cancelar</ion-button
              >
            </ion-item>
          </template>

          <ion-item
            v-for="s in filteredSuppliers"
            :key="String(s.id)"
            button
            @click="toggleSupplierSelection({ supplier: s })"
          >
            <ion-label>{{ s.name }}</ion-label>
            <ion-checkbox
              slot="end"
              :checked="form.supplierIds.includes(s.id)"
              :disabled="props.dayClosed"
            ></ion-checkbox>
          </ion-item>
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
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonButton,
  IonInput,
  IonIcon,
  IonSearchbar,
  IonCheckbox,
  IonButtons,
  IonCard,
} from '@ionic/vue';
import { closeOutline, saveOutline, searchOutline } from 'ionicons/icons';
import { reactive, ref, computed, watch, onMounted } from 'vue';

// controllers
import TemplateController from '@/controllers/TempalteController';
import suppliersController from '@/controllers/suppliersController';
import { parseProvidersFromDescription } from '@/controllers/templateService';
// end controllers

// intefaces
type SupplierOption = {
  id: IDBValidKey;
  name: string;
  products?: Array<{ name: string; price: number }>;
};

type TemplateSummary = {
  id: string | number | null;
  sync_id?: string;
  name: string;
  description?: string;
  suppliers?: IDBValidKey[];
  suppliersSnapshot?: Array<{ id: IDBValidKey; name: string }>;
};
// end inteface

// mian
const props = defineProps<{
  editingTmpl?: TemplateSummary | null;
  dayClosed?: boolean;
}>();
const emit = defineEmits(['saved', 'close']);
// end main

// vars
const form = reactive({
  name: '',
  supplierIds: [] as IDBValidKey[],
});
const suppliers = ref<SupplierOption[]>([]);
const supplierQuery = ref('');
const searchVisible = ref(false);
const supplierSearchbar = ref<HTMLIonSearchbarElement | null>(null);
const isEditMode = computed(() => !!props.editingTmpl);
// end vars

// life
onMounted(async () => {
  await loadSuppliers();
});
// end life

// watch
// populate form when editingTmpl changes
watch(
  () => props.editingTmpl,
  tmpl => {
    if (!tmpl) {
      form.name = '';
      form.supplierIds.splice(0, form.supplierIds.length);
      return;
    }

    form.name = tmpl.name || '';
    form.supplierIds.length = 0;
    if (Array.isArray(tmpl.suppliers) && tmpl.suppliers.length) {
      for (const id of tmpl.suppliers) form.supplierIds.push(id);
    } else {
      // try to match names from description
      const names = parseProvidersFromDescription(tmpl.description);
      const matchedIds = (names || [])
        .map((n: string) => suppliers.value.find(s => s.name === n))
        .filter((x): x is SupplierOption => !!x)
        .map(s => s.id);
      if (matchedIds.length)
        form.supplierIds.splice(0, form.supplierIds.length, ...matchedIds);
    }
  },
  { immediate: true }
);
// end watch

// computed
const filteredSuppliers = computed(() => {
  const q = (supplierQuery.value || '').toLowerCase().trim();
  if (!q) return suppliers.value.slice();
  return suppliers.value.filter(
    s => s && s.name && String(s.name).toLowerCase().includes(q)
  );
});
// end computed

// functions
async function loadSuppliers() {
  try {
    const list = await suppliersController.listSuppliers();
    // Ensure we only keep valid supplier objects
    suppliers.value = ((list as SupplierOption[]) || []).filter(s => s && (s as any).id != null && (s as any).name);
  } catch (_e) {
    console.error('AddTemplateComponent.loadSuppliers error', _e);
  }
}

function openSearch() {
  searchVisible.value = true;
  // try focusing the searchbar
  setTimeout(() => {
    try {
      const el = supplierSearchbar.value;
      if (el && typeof el.setFocus === 'function') el.setFocus();
    } catch (_e) {
      // ignore
    }
  }, 0);
}

function onSearchCancel() {
  supplierQuery.value = '';
  searchVisible.value = false;
}

function toggleSupplierSelection(params: { supplier?: SupplierOption } | SupplierOption | null | undefined) {
  // Accept either an object { supplier } or the supplier directly to be defensive
  const supplier = params && (typeof params === 'object' && 'supplier' in params ? (params as any).supplier : params) as SupplierOption | undefined | null;
  if (props.dayClosed) return;
  if (!supplier) return; // defensive guard

  const id = supplier.id as IDBValidKey;
  if (id == null) return;
  const idx = form.supplierIds.indexOf(id);
  if (idx === -1) form.supplierIds.push(id);
  else form.supplierIds.splice(idx, 1);
}

function getSupplierNameById(param: { id: IDBValidKey } | IDBValidKey): string | null {
  // Allow calling with either the id or an object { id }
  const id = param && typeof param === 'object' && 'id' in param ? (param as any).id : (param as any);
  const s = suppliers.value.find(x => x.id === id);
  return s ? s.name : null;
}

async function submitTemplate() {
  if (!form.name.trim()) {
    // simple UI feedback using browser alert to avoid coupling to parent's alert system
    alert('Por favor ingresa el nombre del template');
    return;
  }

  const newName = form.name.trim();

  try {
    const list = await TemplateController.listTemplates();
    const exists = (list || []).some((t: TemplateSummary) => {
      const tName = t && t.name ? String(t.name).trim().toLowerCase() : '';
      const editingId =
        props.editingTmpl && props.editingTmpl.id
          ? String(props.editingTmpl.id)
          : '';
      const compareId = t.id == null ? '' : String(t.id);
      return (
        tName && tName === newName.toLowerCase() && compareId !== editingId
      );
    });

    if (exists) {
      alert('Ya existe un template con ese nombre');
      return;
    }
  } catch (_e) {
    console.warn('duplicate name check failed', _e);
  }

  const selectedNames = form.supplierIds
    .map((id: IDBValidKey) => getSupplierNameById({ id }))
    .filter((n: unknown): n is string => !!(typeof n === 'string' && n.trim()));

  const description = selectedNames.length
    ? `Proveedores: ${selectedNames.join(', ')}`
    : undefined;

  interface PayloadTemplate {
  name: string;
  description?: string;
  suppliers: IDBValidKey[];
  suppliersSnapshot: Array<{ id: IDBValidKey; name: string }>;
  id?: string | number | null;
  sync_id?: string;
}

try {
    const payloadTemplate: PayloadTemplate = {
      name: newName,
      description,
      suppliers: form.supplierIds.slice(),
        suppliersSnapshot: form.supplierIds.map((id: IDBValidKey) => ({
          id,
          name: getSupplierNameById({ id }) || '',
        })),
    };

    if (isEditMode.value && props.editingTmpl && props.editingTmpl.id) {
      payloadTemplate.id = props.editingTmpl.id;
      if (props.editingTmpl.sync_id) {
        payloadTemplate.sync_id = props.editingTmpl.sync_id;
      }
    }

    await TemplateController.saveTemplate({ template: payloadTemplate });

    emit('saved');
  } catch (e) {
    console.error('submitTemplate error', e);
    alert('Error al guardar el template');
  }
}

function emitClose() {
  emit('close');
}
// end functions
</script>

<style scoped>
/* Styles moved from TemplatesView.vue so the modal component has its own rules */
/* Hide action buttons by default on non-touch devices */
.list-content ion-item.transparent ion-button[slot='end'] {
  display: none !important;
}

/* Show when hovering the ion-item */
.list-content ion-item.transparent:hover ion-button[slot='end'] {
  display: inline-flex !important;
}

.templates__suppliers-list {
  height: calc(100% - 82px);
}

.templates__suppliers-content {
  height: calc(100% - 53px);
}

/* On touch devices (no hover), show buttons always */
@media (hover: none), (pointer: coarse) {
  .list-content ion-item.transparent ion-button[slot='end'] {
    display: inline-flex !important;
  }
}

/* Desktop sizing for modal */
@media (min-width: 1025px) and (max-width: 1440px) {
  .suppliers__modal {
    --height: 80dvh;
  }
}

@media (min-width: 1441px) {
  .suppliers__modal {
    --height: 80dvh;
  }
}
</style>
