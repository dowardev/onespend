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
            @click="toggleSupplierSelection(s)"
          >
            <ion-label>{{ s.name }}</ion-label>
            <ion-checkbox
              slot="end"
              :checked="form.supplierIds.includes(s.id)"
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
// end controllers

// intefaces
type TemplateSummary = {
  id: string | number | null;
  name: string;
  description?: string;
  suppliers?: any[];
  suppliersSnapshot?: any[];
};
// end inteface

// mian
const props = defineProps<{
  editingTmpl?: TemplateSummary | null;
}>();
const emit = defineEmits(['saved', 'close']);
// end main

// vars
const form = reactive({
  name: '',
  supplierIds: [] as any[],
});
const suppliers = ref<any[]>([]);
const supplierQuery = ref('');
const searchVisible = ref(false);
const supplierSearchbar = ref<any | null>(null);
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
        .filter((x): x is any => !!x)
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
    const list = (await suppliersController.listSuppliers()) as any[];
    suppliers.value = list || [];
  } catch (_e) {
    console.error('AddTemplateComponent.loadSuppliers error', _e);
  }
}

function openSearch() {
  searchVisible.value = true;
  // try focusing the searchbar
  setTimeout(() => {
    try {
      const el: any = supplierSearchbar.value;
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

function toggleSupplierSelection(s: any) {
  const id = s.id as IDBValidKey;
  const idx = form.supplierIds.indexOf(id);
  if (idx === -1) form.supplierIds.push(id);
  else form.supplierIds.splice(idx, 1);
}

function getSupplierNameById(id: IDBValidKey): string | null {
  const s = suppliers.value.find(x => x.id === id);
  return s ? s.name : null;
}

function parseProvidersFromDescription(desc?: string): string[] {
  if (!desc) return [];
  const prefix = 'Proveedores:';
  const i = desc.indexOf(prefix);
  if (i === -1) return [];
  const rest = desc.slice(i + prefix.length).trim();
  if (!rest) return [];
  return rest
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s);
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
    const exists = (list || []).some((t: any) => {
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
    .map((id: IDBValidKey) => getSupplierNameById(id))
    .filter((n: unknown): n is string => !!(typeof n === 'string' && n.trim()));

  const description = selectedNames.length
    ? `Proveedores: ${selectedNames.join(', ')}`
    : undefined;

  try {
    const payloadTemplate: any = {
      name: newName,
      description,
      suppliers: form.supplierIds.slice(),
      suppliersSnapshot: form.supplierIds.map((id: IDBValidKey) => ({
        id,
        name: getSupplierNameById(id) || '',
      })),
    };

    if (isEditMode.value && props.editingTmpl && props.editingTmpl.id) {
      payloadTemplate.id = props.editingTmpl.id;
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
