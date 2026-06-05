<template>
  <ion-page>
    <!-- header -->
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="handleBack">
            <ion-icon :icon="arrowBackOutline" />
          </ion-button>
        </ion-buttons>

        <ion-title>{{ pageTitle }}</ion-title>

        <ion-buttons slot="end">
          <ion-button :disabled="v$.$invalid" @click="handleSave">
            <ion-icon :icon="saveOutline" />
          </ion-button>
          <ion-button v-if="isEditing" fill="clear" @click="openHeaderPopover({ e: $event })">
            <ion-icon :icon="ellipsisVerticalOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <!-- end header -->

    <!-- content -->
    <ion-content>
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="4">
            <!-- Section 1: Information -->
            <ion-list class="ion-padding-start ion-padding-end">
              <ion-list-header>
                <ion-label>Información</ion-label>
              </ion-list-header>

              <ion-card class="shadow1">
                <ion-item lines="full" class="transparent">
                  <ion-input
                    v-model="formData.name"
                    label="Nombre"
                    label-placement="floating"
                    placeholder="Nombre del registro"
                  />
                </ion-item>
                <ion-note v-if="v$.name.$error" color="danger" class="validation-error">
                  El nombre es obligatorio
                </ion-note>

                <ion-item lines="full" class="transparent">
                  <ion-select
                    v-model="formData.type"
                    interface="popover"
                    label="Tipo"
                    label-placement="stacked"
                  >
                    <ion-select-option value="cargo">Cargo</ion-select-option>
                    <ion-select-option value="provedor">Proveedor</ion-select-option>
                  </ion-select>
                </ion-item>

                <ion-item v-if="isCargo" lines="full" class="transparent">
                  <ion-select
                    v-model="formData.entryType"
                    interface="popover"
                    label="Tipo de entrada"
                    label-placement="stacked"
                  >
                    <ion-select-option value="ingreso">Ingreso</ion-select-option>
                    <ion-select-option value="egreso">Egreso</ion-select-option>
                  </ion-select>
                </ion-item>

                <ion-item
                  v-if="isProvedor"
                  lines="full"
                  class="transparent"
                  button
                  @click="showSupplierModal = true"
                >
                  <ion-label class="truncate">
                    Proveedor
                    <p class="truncate">
                      {{ selectedSupplierName || 'Seleccionar proveedor' }}
                    </p>
                  </ion-label>
                </ion-item>
              </ion-card>
            </ion-list>
            <!-- end Section 1 -->

            <!-- Section 2b: Distribución por Cuenta (if cargo) -->
            <template v-if="isCargo">
              <div class="ion-padding-start ion-padding-end">
                <AccountDistributionPicker
                  :items="cargoItems"
                  header-label="Distribución por Cuenta"
                  :can-add-more="true"
                  @add-item="handleAddCargoItem"
                  @remove-item="removeCargoItem"
                  @update-item-amount="updateCargoItemAmount"
                  @update-item-account="onUpdateCargoItemAccount"
                />
              </div>
            </template>
            <!-- end Section 2b -->

            <!-- Section 3: Concurrencia/fecha/etc -->
            <ion-list class="ion-padding-start ion-padding-end">
              <ion-list-header>
                <ion-label>Fecha</ion-label>
              </ion-list-header>
              <ion-card class="shadow1">
                <ion-item lines="full" class="transparent">
                  <ion-select
                    v-model="formData.repeatFrequency"
                    interface="popover"
                    label="Frecuencia"
                    label-placement="stacked"
                  >
                    <ion-select-option value="day">Día</ion-select-option>
                    <ion-select-option value="week">Semana</ion-select-option>
                    <ion-select-option value="month">Mes</ion-select-option>
                    <ion-select-option value="year">Año</ion-select-option>
                  </ion-select>
                </ion-item>
                <ion-note v-if="v$.repeatFrequency.$error" color="danger" class="validation-error">
                  La frecuencia es obligatoria
                </ion-note>

                <ion-item lines="full" class="transparent">
                  <ion-input
                    v-model="formData.repeatInterval"
                    label="Cada"
                    label-placement="floating"
                    type="number"
                    placeholder="1"
                    min="1"
                  />
                </ion-item>

                <!-- Weekday chips -->
                <ion-item
                  v-if="formData.repeatFrequency === 'week'"
                  lines="none"
                  class="transparent"
                >
                  <div class="weekday-chips">
                    <ion-chip
                      v-for="day in weekDays"
                      :key="day.value"
                      :class="{ 'chip-selected': formData.repeatDays?.includes(day.value) }"
                      @click="toggleDayOfWeek({ day: day.value })"
                    >
                      {{ day.label }}
                    </ion-chip>
                  </div>
                </ion-item>

                <!-- Month selector -->
                <template v-if="formData.repeatFrequency === 'month'">
                  <ion-item lines="full" class="transparent">
                    <ion-toggle v-model="formData.repeatMonthWeekdayMode" label-placement="start">
                      {{ formData.repeatMonthWeekdayMode ? 'Día de semana' : 'Día fijo' }}
                    </ion-toggle>
                  </ion-item>

                  <ion-item
                    v-if="!formData.repeatMonthWeekdayMode"
                    lines="full"
                    class="transparent"
                  >
                    <ion-input
                      v-model="formData.repeatMonthDay"
                      label="Día del mes"
                      label-placement="floating"
                      type="number"
                      placeholder="1"
                      min="1"
                      max="31"
                    />
                  </ion-item>

                  <template v-if="formData.repeatMonthWeekdayMode">
                    <ion-item lines="full" class="transparent">
                      <ion-select
                        v-model="formData.repeatMonthWeekdayOrdinal"
                        interface="popover"
                        label="Ocurrencia"
                        label-placement="stacked"
                      >
                        <ion-select-option
                          v-for="ord in monthOrdinals"
                          :key="ord.value"
                          :value="ord.value"
                        >
                          {{ ord.label }}
                        </ion-select-option>
                      </ion-select>
                    </ion-item>

                    <ion-item lines="full" class="transparent">
                      <ion-select
                        v-model="formData.repeatMonthWeekday"
                        interface="popover"
                        label="Día de la semana"
                        label-placement="stacked"
                      >
                        <ion-select-option
                          v-for="day in weekDayLabels"
                          :key="day.value"
                          :value="day.value"
                        >
                          {{ day.label }}
                        </ion-select-option>
                      </ion-select>
                    </ion-item>
                  </template>
                </template>

                <!-- Year selector -->
                <template v-if="formData.repeatFrequency === 'year'">
                  <ion-item lines="full" class="transparent">
                    <ion-select
                      v-model="formData.repeatYearMonth"
                      interface="popover"
                      label="Mes"
                      label-placement="stacked"
                    >
                      <ion-select-option v-for="m in months" :key="m.value" :value="m.value">
                        {{ m.label }}
                      </ion-select-option>
                    </ion-select>
                  </ion-item>

                  <ion-item lines="full" class="transparent">
                    <ion-input
                      v-model="formData.repeatYearDay"
                      label="Día"
                      label-placement="floating"
                      type="number"
                      placeholder="1"
                      min="1"
                      max="31"
                    />
                  </ion-item>
                </template>
              </ion-card>

              <ion-card class="shadow1">
                <ion-item
                  lines="full"
                  class="transparent"
                  button
                  @click="startDatePicker.openPopover({ e: $event })"
                >
                  <ion-label>Fecha de inicio</ion-label>
                  <ion-label slot="end">{{
                    toShortDate({ isoDate: startDatePicker.dateISO.value })
                  }}</ion-label>
                </ion-item>
                <ion-note v-if="v$.startDate.$error" color="danger" class="validation-error">
                  La fecha de inicio es obligatoria
                </ion-note>

                <ion-item
                  lines="full"
                  class="transparent"
                  button
                  @click="endDatePicker.openPopover({ e: $event })"
                >
                  <ion-label>Fecha de fin (opcional)</ion-label>
                  <ion-label slot="end">{{
                    toShortDate({ isoDate: endDatePicker.dateISO.value })
                  }}</ion-label>
                </ion-item>

                <ion-item lines="none" class="transparent">
                  <ion-toggle v-model="formData.autoInsert" label-placement="start">
                    Auto-insertar
                  </ion-toggle>
                </ion-item>

                <ion-item
                  v-if="formData.autoInsert"
                  lines="full"
                  class="transparent"
                  button
                  @click="openTimePicker({ e: $event })"
                >
                  <ion-label>Hora</ion-label>
                  <ion-label slot="end">{{ formData.time || '--:--' }}</ion-label>
                </ion-item>
              </ion-card>
            </ion-list>
            <!-- end Section 3 -->

            <!-- Section 5: Productos (if provedor) -->
            <template v-if="isProvedor">
              <ion-list class="ion-padding-start ion-padding-end">
                <ion-list-header>
                  <ion-label>Productos</ion-label>
                  <ion-button @click="addTemporaryProduct()">
                    <ion-icon slot="start" :icon="addOutline" />
                  </ion-button>
                </ion-list-header>

                <ion-card class="shadow1">
                  <ion-item
                    v-for="(product, index) in formData.products"
                    :key="'prod_' + index"
                    lines="full"
                    class="transparent"
                  >
                    <ion-input
                      placeholder="Nombre"
                      :value="product.productName"
                      style="flex: 1; --padding-start: 0"
                      @ion-input="
                        updateProductField({
                          index,
                          field: 'productName',
                          value: $event.detail.value || '',
                        })
                      "
                    />

                    <ion-input
                      type="number"
                      placeholder="Precio"
                      :value="product.productPrice || ''"
                      style="width: 90px; text-align: end"
                      @ion-input="
                        updateProductField({
                          index,
                          field: 'productPrice',
                          value: $event.detail.value || '0',
                        })
                      "
                    />

                    <ion-input
                      type="number"
                      placeholder="Cant"
                      :value="product.quantity || ''"
                      style="width: 65px; text-align: end"
                      @ion-input="
                        updateProductField({
                          index,
                          field: 'quantity',
                          value: $event.detail.value || '0',
                        })
                      "
                    />

                    <ion-button
                      slot="end"
                      fill="clear"
                      color="danger"
                      size="small"
                      @click="removeProduct({ index })"
                    >
                      <ion-icon slot="icon-only" :icon="trashOutline" />
                    </ion-button>
                  </ion-item>
                </ion-card>
              </ion-list>
            </template>
            <!-- end Section 5 -->

            <!-- Section 6: Distribución (if provedor) -->
            <template v-if="isProvedor">
              <div class="ion-padding-start ion-padding-end">
                <AccountDistributionPicker
                  :items="formData.items"
                  header-label="Distribución por Cuenta"
                  :can-add-more="true"
                  @add-item="handleAddItem"
                  @remove-item="removeItem"
                  @update-item-amount="updateItemAmount"
                  @update-item-account="onUpdateItemAccount"
                />
              </div>
            </template>
            <!-- end Section 6 -->

            <!-- Section 7: Mas detalles -->
            <ion-list class="ion-padding-start ion-padding-end">
              <ion-list-header>
                <ion-label>Mas detalles</ion-label>
              </ion-list-header>
              <ion-card class="shadow1">
                <ion-item lines="none" class="transparent">
                  <ion-textarea
                    v-model="formData.notes"
                    label="Notas"
                    label-placement="stacked"
                    placeholder="Agregar notas..."
                    :auto-grow="true"
                    :rows="3"
                  />
                </ion-item>
              </ion-card>
            </ion-list>
            <!-- end Section 7 -->
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
    <!-- end content -->

    <!-- Supplier Selection Modal -->
    <ion-modal :is-open="showSupplierModal" @will-dismiss="onSupplierModalDismiss">
      <ion-header class="ion-no-border" mode="ios">
        <ion-toolbar v-if="!showCreateSupplierView">
          <ion-buttons>
            <ion-button @click="showSupplierModal = false">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
          <ion-title>Seleccionar Proveedor</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showCreateSupplierView = true">
              <ion-icon :icon="addOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
        <ion-toolbar v-else>
          <ion-buttons>
            <ion-button @click="showCreateSupplierView = false">
              <ion-icon :icon="arrowBackOutline" />
            </ion-button>
          </ion-buttons>
          <ion-title>Crear Proveedor</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="onCreateSupplier">
              <ion-icon :icon="saveOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
        <ion-toolbar v-if="!showCreateSupplierView">
          <div class="ion-padding-start ion-padding-end">
            <ion-searchbar
              v-model="supplierSearchQuery"
              mode="ios"
              placeholder="Buscar proveedor"
              class="ion-no-padding"
            />
          </div>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <template v-if="!showCreateSupplierView">
          <ion-list class="transparent ion-padding-start ion-padding-end">
            <ion-list-header>
              <ion-label>Proveedores</ion-label>
            </ion-list-header>
            <ion-card class="shadow1">
              <ion-item
                v-for="s in filteredSuppliers"
                :key="s.id"
                lines="full"
                button
                class="transparent"
                @click="
                  selectSupplier({ supplier: s });
                  showSupplierModal = false;
                "
              >
                <ion-label>{{ s.name }}</ion-label>
              </ion-item>
            </ion-card>
          </ion-list>
        </template>
        <SupplierFormComponent
          v-else
          :submit-trigger="submitTrigger"
          @saved="onSupplierFormSaved"
          @dismiss="showCreateSupplierView = false"
        />
      </ion-content>
    </ion-modal>

    <!-- Account Selection Modal is inside AccountDistributionPicker -->

    <!-- popovers -->
    <DatePickerPopover
      :popover-state="endDatePicker.popoverState"
      :temp-picker-date-iso="endDatePicker.tempPickerDateISO.value"
      :can-apply="endDatePicker.canApply.value"
      @did-dismiss="endDatePicker.closePopover()"
      @cancel="endDatePicker.closePopover()"
      @apply="confirmEndDate"
      @update:temp-picker-date-iso="endDatePicker.tempPickerDateISO.value = $event"
    />

    <DatePickerPopover
      :popover-state="startDatePicker.popoverState"
      :temp-picker-date-iso="startDatePicker.tempPickerDateISO.value"
      :can-apply="startDatePicker.canApply.value"
      @did-dismiss="startDatePicker.closePopover()"
      @cancel="startDatePicker.closePopover()"
      @apply="confirmStartDate"
      @update:temp-picker-date-iso="startDatePicker.tempPickerDateISO.value = $event"
    />

    <ion-popover
      :is-open="timePickerState.open"
      :event="timePickerState.event"
      keep-contents-mounted
      @did-dismiss="timePickerState.open = false"
    >
      <ion-content class="ion-padding">
        <ion-datetime
          :key="'timepicker-' + timePickerKey"
          :model-value="tempTime"
          presentation="time"
          style="background: transparent; width: 100%"
          @ion-value-change="onTimeWheelChange"
          @ion-change="onTimeWheelChange"
        />
        <ion-item>
          <ion-button slot="end" fill="clear" size="small" @click="cancelTime">
            Cancelar
          </ion-button>
          <ion-button slot="end" size="small" color="primary" @click="confirmTime">
            Aplicar
          </ion-button>
        </ion-item>
      </ion-content>
    </ion-popover>

    <ion-popover
      :is-open="popoverMenu.open"
      :event="popoverMenu.event"
      @did-dismiss="closeMenuPopover"
    >
      <ion-content>
        <ion-item lines="full" button @click="handleDeleteFromPopover">
          <ion-icon slot="start" color="danger" :icon="trashOutline" />
          <ion-label>Eliminar</ion-label>
        </ion-item>
      </ion-content>
    </ion-popover>
    <!-- end popovers -->

    <!-- alerts -->
    <DeleteConfirmAlert
      :is-open="deleteConfirm.showDeleteAlert.value"
      message="¿Estás seguro de que deseas eliminar este registro recurrente?"
      :buttons="deleteConfirm.deleteAlertButtons"
      @did-dismiss="deleteConfirm.showDeleteAlert.value = false"
    />

    <!-- end alerts -->
  </ion-page>
</template>

<script setup lang="ts">
// imports
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonListHeader,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonCard,
  IonToggle,
  IonTextarea,
  IonPopover,
  IonModal,
  IonChip,
  IonSearchbar,
  IonDatetime,
  IonNote,
} from '@ionic/vue';
import {
  addOutline,
  trashOutline,
  closeOutline,
  arrowBackOutline,
  saveOutline,
  ellipsisVerticalOutline,
} from 'ionicons/icons';
import { ref, computed, reactive, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useVuelidate } from '@vuelidate/core';
import { required, numeric, minValue, helpers } from '@vuelidate/validators';
import { format, getHours, getMinutes } from 'date-fns';
import { toShortDate } from '@/utils/dateHelpers';
import { useDeleteConfirm } from '@/composables/useDeleteConfirm';
import { useDatePicker } from '@/composables/useDatePicker';
import { useSync } from '@/composables/useSync';
import recurringRecordsController from '@/controllers/recurringRecordsController';
import type { Supplier } from '@/controllers/suppliersController';
import type { Product } from '@/controllers/supplierProductsController';
import type { SupplierFormPayload } from '@/views/suppliers/modals/SupplierFormComponent.vue';
import type {
  RecurringType,
  RepeatFrequency,
  RecurringRecord,
  RecurringProduct,
  RecurringItem,
} from '@/controllers/recurringRecordsController';
// end imports

// components
import AccountDistributionPicker from '@/views/budget/components/AccountDistributionPicker.vue';
import DatePickerPopover from '@/views/budget/components/DatePickerPopover.vue';
import DeleteConfirmAlert from '@/views/budget/components/DeleteConfirmAlert.vue';
import SupplierFormComponent from '@/views/suppliers/modals/SupplierFormComponent.vue';
// end components

// interface and types imports
interface WeekDay {
  label: string;
  value: number;
}

interface MonthOption {
  label: string;
  value: number;
}

interface OrdinalOption {
  label: string;
  value: number;
}

// end interface and types imports

// router
const router = useRouter();
const route = useRoute();
// end router

// main
const isEditing = computed(() => !!route.query.recurringId);
// end main

// vars and const
const formData = ref({
  type: 'cargo' as RecurringType,
  entryType: 'ingreso' as 'ingreso' | 'egreso',
  name: '',
  amount: '' as string | number,
  accountId: null as string | number | null,
  repeatFrequency: 'day' as RepeatFrequency,
  repeatInterval: 1,
  repeatDays: [] as number[],
  repeatMonthDay: 1,
  repeatMonthWeekdayMode: false,
  repeatMonthWeekday: 0,
  repeatMonthWeekdayOrdinal: 1,
  repeatYearMonth: 1,
  repeatYearDay: 1,
  startDate: '',
  endDate: null as string | null,
  time: '',
  autoInsert: false,
  notes: '',
  products: [] as RecurringProduct[],
  items: [{ amount: '', accountId: null }] as RecurringItem[],
});

const itemsValidator = (items: RecurringItem[]) => {
  return items.every(item => {
    const val = String(item.amount).trim()
    return val !== '' && !isNaN(Number(val)) && Number(val) > 0 && item.accountId != null
  })
}

const rules = computed(() => ({
  name: { required },
  amount: { numeric, minValue: minValue(0) },
  startDate: { required },
  repeatFrequency: { required },
  items: { itemsValid: helpers.withMessage('Todos los items deben tener un monto válido y cuenta asignada', itemsValidator) },
}));
const v$ = useVuelidate(rules, computed(() => ({
  ...formData.value,
  items: isCargo.value ? cargoItems.value : formData.value.items,
})));

const cargoItems = ref<RecurringItem[]>([{ amount: '', accountId: null }]);

const recordId = ref<string | number | null>(null);
const recordSyncId = ref<string | null>(null);

const timePickerState = reactive({ open: false, event: null as Event | null });
const timePickerKey = ref(0);
const tempTime = ref('');

// Supplier modal state
const showSupplierModal = ref(false);
const showCreateSupplierView = ref(false);
const supplierSearchQuery = ref('');
const allSuppliers = ref<Supplier[]>([]);
const selectedSupplierName = ref('');
const submitTrigger = ref(0);

// Popover menu state
const popoverMenu = reactive({ open: false, event: null as Event | null });

// Weekday constants
const weekDays: WeekDay[] = [
  { label: 'D', value: 0 },
  { label: 'L', value: 1 },
  { label: 'M', value: 2 },
  { label: 'M', value: 3 },
  { label: 'J', value: 4 },
  { label: 'V', value: 5 },
  { label: 'S', value: 6 },
];

const weekDayLabels: WeekDay[] = [
  { label: 'Domingo', value: 0 },
  { label: 'Lunes', value: 1 },
  { label: 'Martes', value: 2 },
  { label: 'Miércoles', value: 3 },
  { label: 'Jueves', value: 4 },
  { label: 'Viernes', value: 5 },
  { label: 'Sábado', value: 6 },
];

const months: MonthOption[] = [
  { label: 'Enero', value: 1 },
  { label: 'Febrero', value: 2 },
  { label: 'Marzo', value: 3 },
  { label: 'Abril', value: 4 },
  { label: 'Mayo', value: 5 },
  { label: 'Junio', value: 6 },
  { label: 'Julio', value: 7 },
  { label: 'Agosto', value: 8 },
  { label: 'Septiembre', value: 9 },
  { label: 'Octubre', value: 10 },
  { label: 'Noviembre', value: 11 },
  { label: 'Diciembre', value: 12 },
];

const monthOrdinals: OrdinalOption[] = [
  { label: 'Primer', value: 1 },
  { label: 'Segundo', value: 2 },
  { label: 'Tercer', value: 3 },
  { label: 'Cuarto', value: 4 },
  { label: 'Último', value: -1 },
];

// Composable instances
const startDatePicker = useDatePicker();
const endDatePicker = useDatePicker();

const deleteConfirm = useDeleteConfirm({
  onConfirm: confirmDelete,
});

const { syncRecurringRecord } = useSync();
// end vars and const

// computed
const pageTitle = computed(() => {
  if (isEditing.value) {
    return formData.value.type === 'cargo' ? 'Editar Cargo' : 'Editar Proveedor';
  }
  return formData.value.type === 'cargo' ? 'Nuevo Cargo' : 'Nuevo Proveedor';
});

const isCargo = computed(() => formData.value.type === 'cargo');
const isProvedor = computed(() => formData.value.type === 'provedor');

const filteredSuppliers = computed<Supplier[]>(() => {
  if (!supplierSearchQuery.value) return allSuppliers.value;
  return allSuppliers.value.filter((s) =>
    s.name.toLowerCase().includes(supplierSearchQuery.value.toLowerCase()),
  ) as Supplier[];
});

// end computed

// watch
watch(
  () => formData.value.time,
  (newTime) => {
    if (!newTime && formData.value.autoInsert) {
      formData.value.autoInsert = false;
    }
  },
);
// end watch

// onMounted
onMounted(async () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  startDatePicker.setDate({ date: today });

  if (isEditing.value && route.query.recurringId) {
    await loadRecord({ recurringId: route.query.recurringId as string });
  }

  // Load suppliers for provedor type
  try {
    const { SuppliersController } = await import('@/controllers/suppliersController');
    const suppliersCtrl = new SuppliersController();
    const suppliers = await suppliersCtrl.listSuppliers();
    allSuppliers.value = suppliers || [];
  } catch {
    // Suppliers not available - ignore
  }
});
// end onMounted

// functions
function loadRecord(params: { recurringId: string }) {
  const { recurringId } = params;
  const record = recurringRecordsController
    .getRecordBySyncId({ syncId: recurringId })
    .then((found) => found || recurringRecordsController.getRecordById({ id: recurringId }));
  record.then((found: RecurringRecord | null) => {
    if (!found) return;
    recordId.value = found.id ?? null;
    recordSyncId.value = found.sync_id ?? null;

    formData.value.type = found.type;
    formData.value.entryType = found.entryType;
    formData.value.name = found.name;
    formData.value.amount = found.amount ?? '';
    formData.value.accountId = found.accountId ?? null;
    formData.value.repeatFrequency = found.repeatFrequency;
    formData.value.repeatInterval = found.repeatInterval;

    if (found.type === 'cargo') {
      if (found.items?.length) {
        cargoItems.value = found.items.map((i: RecurringItem) => ({ ...i }));
      } else {
        cargoItems.value = [{ amount: found.amount ?? '', accountId: found.accountId ?? null }];
      }
    }
    formData.value.repeatDays = found.repeatDays ?? [];
    formData.value.repeatMonthDay = found.repeatMonthDay ?? 1;
    formData.value.repeatMonthWeekdayMode = found.repeatMonthWeekdayMode ?? false;
    formData.value.repeatMonthWeekday = found.repeatMonthWeekday ?? 0;
    formData.value.repeatMonthWeekdayOrdinal = found.repeatMonthWeekdayOrdinal ?? 1;
    formData.value.repeatYearMonth = found.repeatYearMonth ?? 1;
    formData.value.repeatYearDay = found.repeatYearDay ?? 1;
    formData.value.time = found.time ?? '';
    formData.value.autoInsert = found.autoInsert ?? false;
    formData.value.notes = found.notes ?? '';
    formData.value.products = found.products ?? [];
    formData.value.items = found.items?.length
      ? found.items.map((i: RecurringItem) => ({ ...i }))
      : [{ amount: '', accountId: null }];

    if (found.startDate) {
      startDatePicker.setDate({ date: found.startDate });
    }
    if (found.endDate) {
      endDatePicker.setDate({ date: found.endDate });
    }
  });
}

function handleBack() {
  router.back();
}

async function handleSave() {
  v$.value.$touch();
  if (!await v$.value.$validate()) return;

  const data = formData.value;

  const totalAmount = isCargo.value
    ? cargoItems.value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    : isProvedor.value
      ? data.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      : 0;

  const recordData: Omit<RecurringRecord, 'id' | 'sync_id' | 'createdAt' | 'status'> = {
    type: data.type,
    entryType: data.entryType,
    name: data.name,
    amount: isCargo.value ? totalAmount : Number(data.amount) || 0,
    accountId: isCargo.value
      ? cargoItems.value[0]?.accountId
        ? typeof cargoItems.value[0].accountId === 'object'
          ? (cargoItems.value[0].accountId as { id: string | number }).id
          : cargoItems.value[0].accountId
        : null
      : data.accountId,
    repeatFrequency: data.repeatFrequency,
    repeatInterval: data.repeatInterval,
    repeatDays: data.repeatFrequency === 'week' ? data.repeatDays : undefined,
    repeatMonthDay:
      data.repeatFrequency === 'month' && !data.repeatMonthWeekdayMode
        ? data.repeatMonthDay
        : undefined,
    repeatMonthWeekdayMode:
      data.repeatFrequency === 'month' ? data.repeatMonthWeekdayMode : undefined,
    repeatMonthWeekday:
      data.repeatFrequency === 'month' && data.repeatMonthWeekdayMode
        ? data.repeatMonthWeekday
        : undefined,
    repeatMonthWeekdayOrdinal:
      data.repeatFrequency === 'month' && data.repeatMonthWeekdayMode
        ? data.repeatMonthWeekdayOrdinal
        : undefined,
    repeatYearMonth: data.repeatFrequency === 'year' ? data.repeatYearMonth : undefined,
    repeatYearDay: data.repeatFrequency === 'year' ? data.repeatYearDay : undefined,
    time: data.time || null,
    autoInsert: data.autoInsert,
    startDate: startDatePicker.dateISO.value?.slice(0, 10) || '',
    endDate: endDatePicker.dateISO.value?.slice(0, 10) ?? null,
    estimated: isProvedor.value ? totalAmount : undefined,
    products: isProvedor.value
      ? data.products.filter((p: RecurringProduct) => p.quantity > 0)
      : undefined,
    items: isCargo.value
      ? cargoItems.value.map((item: RecurringItem) => ({
          amount: Number(item.amount) || 0,
          accountId:
            typeof item.accountId === 'object'
              ? (item.accountId as { id: string | number }).id
              : item.accountId,
        }))
      : isProvedor.value
        ? data.items.map((item: RecurringItem) => ({
            amount: Number(item.amount) || 0,
            accountId:
              typeof item.accountId === 'object'
                ? (item.accountId as { id: string | number }).id
                : item.accountId,
          }))
        : undefined,
    notes: data.notes || undefined,
  };

  try {
    if (recordId.value) {
      await recurringRecordsController.updateRecord({
        id: recordId.value,
        changes: recordData as Partial<RecurringRecord>,
      });
      const updated = await recurringRecordsController.getRecordById({ id: recordId.value });
      if (updated) {
        syncRecurringRecord({ record: updated, operation: 'update' });
      }
    } else {
      const saved = await recurringRecordsController.addRecord({
        record: recordData as Omit<RecurringRecord, 'id' | 'sync_id' | 'createdAt'>,
      });
      syncRecurringRecord({ record: saved, operation: 'create' });
    }
  } catch (err) {
    console.error('RecurringEditPage.handleSave error', err);
  }

  router.back();
}

function confirmStartDate() {
  startDatePicker.applyDate();
}

function confirmEndDate() {
  endDatePicker.applyDate();
}

function openTimePicker(params: { e: Event }) {
  const { e } = params;
  timePickerKey.value++;
  if (formData.value.time) {
    const parts = formData.value.time.split(':');
    const d = new Date();
    d.setHours(parseInt(parts[0]) || 0, parseInt(parts[1]) || 0, 0, 0);
    tempTime.value = format(d, "yyyy-MM-dd'T'HH:mm:ss");
  } else {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    tempTime.value = format(midnight, "yyyy-MM-dd'T'HH:mm:ss");
  }
  timePickerState.event = e;
  timePickerState.open = true;
}

function onTimeWheelChange(e: CustomEvent | string) {
  let value: string | undefined;
  if (typeof e === 'string') {
    value = e;
  } else if (e && typeof e === 'object' && 'detail' in e) {
    value = (e as CustomEvent).detail?.value;
  }
  if (value) {
    tempTime.value = value;
  }
}

function confirmTime() {
  const value = tempTime.value;
  if (!value) return;
  let timeStr = '';
  if (value.includes('T')) {
    const d = new Date(value);
    timeStr = `${String(getHours(d)).padStart(2, '0')}:${String(getMinutes(d)).padStart(2, '0')}`;
  } else if (value.includes(':')) {
    timeStr = value.slice(0, 5);
  }
  if (timeStr) {
    formData.value.time = timeStr;
  }
  timePickerState.open = false;
}

function cancelTime() {
  tempTime.value = '';
  timePickerState.open = false;
}

function toggleDayOfWeek(params: { day: number }) {
  const { day } = params;
  if (!formData.value.repeatDays) {
    formData.value.repeatDays = [];
  }
  const idx = formData.value.repeatDays.indexOf(day);
  if (idx >= 0) {
    formData.value.repeatDays.splice(idx, 1);
  } else {
    formData.value.repeatDays.push(day);
  }
}

function addTemporaryProduct() {
  formData.value.products.push({
    supplierProductId: null,
    productName: '',
    productPrice: 0,
    quantity: 0,
  });
}

function removeProduct(params: { index: number }) {
  const { index } = params;
  formData.value.products.splice(index, 1);
}

function updateProductField(params: { index: number; field: string; value: string | number }) {
  const { index, field, value } = params;
  const product = formData.value.products[index];
  if (!product) return;
  if (field === 'productName') {
    product.productName = String(value);
  } else if (field === 'productPrice') {
    product.productPrice = Number(value) || 0;
  } else if (field === 'quantity') {
    product.quantity = Number(value) || 0;
  }
}

function onCreateSupplier() {
  submitTrigger.value++;
}

async function onSupplierFormSaved(payload: SupplierFormPayload) {
  try {
    console.log('[RecurringEditPage] onSupplierFormSaved', payload);
    const { toastController } = await import('@ionic/vue');
    const { SuppliersController } = await import('@/controllers/suppliersController');
    const suppliersCtrl = new SuppliersController();
    await suppliersCtrl.addSupplier({ s: payload });
    const suppliers = await suppliersCtrl.listSuppliers();
    allSuppliers.value = suppliers || [];

    const newSupplier = allSuppliers.value.find(
      (s: Supplier) => s.name === payload.name,
    );
    if (newSupplier) {
      selectSupplier({ supplier: newSupplier });
    }

    const successToast = await toastController.create({
      message: 'Proveedor creado',
      duration: 1500,
      color: 'success',
      position: 'bottom',
    });
    await successToast.present();

    showCreateSupplierView.value = false;
    showSupplierModal.value = false;
  } catch (err) {
    console.error('[RecurringEditPage] onSupplierFormSaved error', err);
    const { toastController } = await import('@ionic/vue');
    const errorToast = await toastController.create({
      message: 'Error al crear proveedor',
      duration: 2000,
      color: 'danger',
      position: 'bottom',
    });
    await errorToast.present();
  }
}

function selectSupplier(params: { supplier: Supplier }) {
  const { supplier } = params;
  selectedSupplierName.value = supplier.name;
  formData.value.name = supplier.name;
  if (supplier.products) {
    formData.value.products = supplier.products.map((p: Product) => ({
      supplierProductId: p.sync_id ?? p.id ?? null,
      productName: p.name,
      productPrice: p.price ?? 0,
      quantity: 0,
    }));
  } else {
    formData.value.products = [];
  }
}

function onSupplierModalDismiss() {
  showSupplierModal.value = false;
  supplierSearchQuery.value = '';
  showCreateSupplierView.value = false;
}

function onUpdateItemAccount(params: { index: number; accountId: { id: string | number } | null }) {
  const { index, accountId } = params;
  if (formData.value.items[index]) {
    formData.value.items[index].accountId = accountId;
  }
}

function onUpdateCargoItemAccount(params: { index: number; accountId: { id: string | number } | null }) {
  const { index, accountId } = params;
  if (cargoItems.value[index]) {
    cargoItems.value[index].accountId = accountId;
  }
}

function addItem() {
  formData.value.items.push({ amount: '', accountId: null });
}

function handleAddItem() {
  if (!itemsValidator(formData.value.items)) return;
  addItem();
}

function removeItem(params: { index: number }) {
  const { index } = params;
  if (formData.value.items.length > 1) {
    formData.value.items.splice(index, 1);
  }
}

function updateItemAmount(params: { index: number; amount: string }) {
  const { index, amount } = params;
  formData.value.items[index].amount = amount;
}

function handleAddCargoItem() {
  if (!itemsValidator(cargoItems.value)) return;
  cargoItems.value.push({ amount: '', accountId: null });
}

function removeCargoItem(params: { index: number }) {
  const { index } = params;
  if (cargoItems.value.length > 1) {
    cargoItems.value.splice(index, 1);
  }
}

function updateCargoItemAmount(params: { index: number; amount: string }) {
  const { index, amount } = params;
  cargoItems.value[index].amount = amount;
}

function openHeaderPopover(params: { e: Event }) {
  const { e } = params;
  popoverMenu.event = e;
  popoverMenu.open = true;
}

function closeMenuPopover() {
  popoverMenu.open = false;
  popoverMenu.event = null;
}

function handleDeleteFromPopover() {
  closeMenuPopover();
  deleteConfirm.openDeleteAlert();
}

async function confirmDelete() {
  if (recordId.value) {
    try {
      const record = await recurringRecordsController.getRecordById({ id: recordId.value });
      if (record) {
        await recurringRecordsController.removeRecord({ id: recordId.value });
        syncRecurringRecord({ record, operation: 'delete' });
      }
    } catch (err) {
      console.error('RecurringEditPage.confirmDelete error', err);
    }
  }
  deleteConfirm.showDeleteAlert.value = false;
  router.back();
}
// end functions
</script>

<style scoped>
.weekday-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

ion-chip.chip-selected {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}

.truncate {
  flex: 1 1 auto;
  min-width: 0;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

</style>
