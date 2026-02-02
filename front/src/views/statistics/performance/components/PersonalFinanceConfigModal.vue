<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="close">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>Configuración</ion-title>

        <ion-buttons slot="end">
          <ion-button color="danger" @click="resetDefaults">
            <ion-icon :icon="trashOutline"></ion-icon>
          </ion-button>

          <ion-button :disabled="isFormInvalid" @click="saveConfig">
            <ion-icon :icon="saveOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="10">
            <ion-list>
              <ion-list-header>
                <ion-label>Ahorro</ion-label>
              </ion-list-header>

              <div class="list-content">
                <ion-item class="transparent" lines="full">
                  <ion-input
                    :value="form.savingsPercent"
                    label="Porcentaje de ahorro esperado"
                    label-placement="start"
                    type="number"
                    placeholder="20"
                    style="border: none"
                    :error-text="
                      v$.form.savingsPercent.$errors[0]?.$message?.toString()
                    "
                    :class="{
                      'ion-invalid':
                        v$.form.savingsPercent.$invalid &&
                        v$.form.savingsPercent.$dirty,
                      'ion-touched': v$.form.savingsPercent.$dirty,
                    }"
                    @ion-input="
                      form.savingsPercent = Number($event.detail.value)
                    "
                    @click="v$.form.savingsPercent.$touch()"
                  ></ion-input>
                </ion-item>

                <ion-item lines="none">
                  <ion-label color="medium">
                    <small>Ejemplo: 20% de tus ingresos destinados al ahorro</small>
                  </ion-label>
                </ion-item>
              </div>
            </ion-list>

            <ion-list>
              <ion-list-header>
                <ion-label>Presupuestos por categoría</ion-label>

                <ion-button @click="openCategoryPopover($event)">
                  <ion-icon :icon="addOutline"></ion-icon>
                </ion-button>
              </ion-list-header>

              <div class="list-content">
                <ion-item
                  v-for="(category, index) in form.categories"
                  :key="index"
                  class="transparent"
                  lines="full"
                >
                  <ion-label class="category-name">{{ category.name }}</ion-label>
                  
                  <ion-input
                    :value="category.amount"
                    type="number"
                    :placeholder="category.placeholder || '0'"
                    class="category-amount"
                    @ion-input="category.amount = Number($event.detail.value)"
                  ></ion-input>

                  <ion-input
                    :value="category.interval"
                    type="number"
                    placeholder="1"
                    class="category-interval"
                    @ion-input="category.interval = Number($event.detail.value)"
                  ></ion-input>

                  <ion-select
                    v-model="category.period"
                    interface="popover"
                    class="category-period"
                  >
                    <ion-select-option
                      v-for="opt in periodOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </ion-select-option>
                  </ion-select>

                  <ion-button
                    slot="end"
                    fill="clear"
                    color="danger"
                    @click="removeCategory(index)"
                  >
                    <ion-icon :icon="trashOutline"></ion-icon>
                  </ion-button>
                </ion-item>

                <ion-item v-if="form.categories.length === 0" lines="none">
                  <ion-label color="medium"
                    >Sin categorías configuradas</ion-label
                  >
                </ion-item>
              </div>
            </ion-list>

            <ion-list>
            </ion-list>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-popover
        :is-open="showCategoryPopover"
        :event="popoverEvent"
        @did-dismiss="showCategoryPopover = false"
      >
        <ion-content>
          <ion-list>
            <ion-list-header>
              <ion-label>Seleccionar categoría</ion-label>
            </ion-list-header>
            <ion-item
              v-for="cat in availableCategoriesFiltered"
              :key="cat.key"
              button
              @click="addCategory(cat)"
            >
              <ion-label>{{ cat.name }}</ion-label>
            </ion-item>
            <ion-item-divider></ion-item-divider>
            <ion-list-header>
              <ion-label>Campo personalizado</ion-label>
            </ion-list-header>
            <ion-item>
              <ion-input
                v-model="customCategoryName"
                label-placement="floating"
                placeholder="Nombre de la categoría"
                style="border: none"
              ></ion-input>
              <ion-button
                slot="end"
                fill="clear"
                :disabled="!customCategoryName.trim()"
                @click="addCustomCategory"
              >
                <ion-icon :icon="addOutline"></ion-icon>
              </ion-button>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-popover>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
// ionic components imports
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
  IonInput,
  IonButton,
  IonButtons,
  IonIcon,
  IonPopover,
  IonSelect,
  IonSelectOption,
  IonDatetime,
} from '@ionic/vue';
// end ionic components imports

// ionic icons
import {
  addOutline,
  closeOutline,
  saveOutline,
  trashOutline,
  checkmarkOutline,
} from 'ionicons/icons';
// end ionic icons

// other imports
import { reactive, ref, onMounted, computed } from 'vue';
import useVuelidate from '@vuelidate/core';
import { required, minValue, maxValue, helpers } from '@vuelidate/validators';
// end other imports

// controllers
import { DixieController } from '@/controllers/dixie';
// end controllers

// components
// end components

// interface and types imports
interface PersonalFinanceConfig {
  savingsPercent: number;
  categories: BudgetCategory[];
}

interface BudgetCategory {
  key: string;
  name: string;
  amount: number;
  interval: number;
  period: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  placeholder?: string;
}

const periodOptions = [
  { value: 'daily', label: 'días' },
  { value: 'weekly', label: 'semanas' },
  { value: 'biweekly', label: 'quincenas' },
  { value: 'monthly', label: 'meses' },
  { value: 'yearly', label: 'años' },
];
// end interface and types imports

// main
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', config: PersonalFinanceConfig): void;
}>();

const availableCategories: BudgetCategory[] = [
  { key: 'housing', name: 'Vivienda', amount: 0, interval: 1, period: 'monthly', placeholder: '3000' },
  { key: 'food', name: 'Alimentación', amount: 0, interval: 1, period: 'monthly', placeholder: '2000' },
  { key: 'transport', name: 'Transporte', amount: 0, interval: 1, period: 'monthly', placeholder: '1000' },
  {
    key: 'entertainment',
    name: 'Entretenimiento',
    amount: 0,
    interval: 1,
    period: 'monthly',
    placeholder: '500',
  },
  { key: 'health', name: 'Salud', amount: 0, interval: 1, period: 'monthly', placeholder: '800' },
  { key: 'other', name: 'Otros gastos', amount: 0, interval: 1, period: 'monthly', placeholder: '500' },
  {
    key: 'subscriptions',
    name: 'Suscripciones',
    amount: 0,
    interval: 1,
    period: 'monthly',
    placeholder: '300',
  },
  { key: 'education', name: 'Educación', amount: 0, interval: 1, period: 'monthly', placeholder: '400' },
  { key: 'clothing', name: 'Ropa', amount: 0, interval: 1, period: 'monthly', placeholder: '300' },
  { key: 'personal', name: 'Cuidado personal', amount: 0, interval: 1, period: 'monthly', placeholder: '200' },
];

const defaultConfig: PersonalFinanceConfig = {
  savingsPercent: 20,
  categories: [],
};

const form = reactive({
  savingsPercent: 20,
  categories: [] as BudgetCategory[],
});
// end main

// vars and const
const dixieController = new DixieController({
  storeName: 'config',
});

const showCategoryPopover = ref(false);
const popoverEvent = ref<Event | null>(null);
const customCategoryName = ref('');

const rules = {
  form: {
    savingsPercent: {
      required: helpers.withMessage('El valor es obligatorio', required),
      minValue: helpers.withMessage('El valor debe ser mayor a 0', minValue(1)),
      maxValue: helpers.withMessage('El valor no puede ser mayor a 100', maxValue(100)),
    },
    categories: {
      validCategories: helpers.withMessage(
        'Todos los montos deben ser mayores a 0',
        (cats: BudgetCategory[]) =>
          cats.length === 0 || cats.every(cat => cat.amount > 0)
      ),
    },
  },
};

const v$ = useVuelidate(rules, { form });
// end vars and const

// watch
// end watch

// computed
const isFormInvalid = computed(() => v$.value?.$invalid ?? false);

const availableCategoriesFiltered = computed(() => {
  return availableCategories.filter(cat => !isCategoryAdded(cat.key));
});
// end computed

// onmounted
onMounted(async () => {
  try {
    const savedConfig = ((await dixieController.listBackups()) as any[]) || [];
    if (savedConfig.length > 0) {
      const latest = savedConfig.sort(
        (a, b) => (b as any).createdAt - (a as any).createdAt
      )[0];
      if (latest.data) {
        form.savingsPercent = latest.data.savingsPercent ?? latest.data.minSavingsPercent ?? 20;
        if (Array.isArray(latest.data.categories)) {
          form.categories.splice(
            0,
            form.categories.length,
            ...latest.data.categories
          );
        }
      }
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }
});
// end onmounted

// functions
function close() {
  emit('close');
}

async function saveConfig() {
  const isValid = await v$.value.$validate();
  if (!isValid) return;

  try {
    await dixieController.addEntry({
      entry: {
        component: 'PersonalFinanceConfig',
        data: {
          ...form,
          categories: [...form.categories],
        },
        createdAt: Date.now(),
      },
    });
    emit('save', { ...form });
    emit('close');
  } catch (e) {
    console.error('Error saving config:', e);
    emit('save', { ...form });
    emit('close');
  }
}

function resetDefaults() {
  form.savingsPercent = defaultConfig.savingsPercent;
  form.categories.splice(0, form.categories.length);
}

function openCategoryPopover(event: Event) {
  popoverEvent.value = event;
  showCategoryPopover.value = true;
}

function isCategoryAdded(key: string): boolean {
  return form.categories.some(cat => cat.key === key);
}

function addCategory(category: BudgetCategory) {
  if (!isCategoryAdded(category.key)) {
    form.categories.push({
      key: category.key,
      name: category.name,
      amount: 0,
      interval: category.interval || 1,
      period: category.period || 'monthly',
      placeholder: category.placeholder,
    });
  }
  showCategoryPopover.value = false;
}

function removeCategory(index: number) {
  form.categories.splice(index, 1);
}

function addCustomCategory() {
  const name = customCategoryName.value.trim();
  if (
    name &&
    !form.categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())
  ) {
    form.categories.push({
      key: `custom_${Date.now()}`,
      name: name,
      amount: 0,
      interval: 1,
      period: 'monthly',
    });
    customCategoryName.value = '';
  }
  showCategoryPopover.value = false;
}
// end functions
</script>

<style scoped>
ion-input {
  --padding-start: 8px;
  border: 1px solid var(--ion-color-light, #e0e0e0);
  border-radius: 4px;
  margin-top: 4px;
}

.category-name {
  width: 80px;
  font-weight: 600;
}

.category-amount {
  width: 80px;
}

.category-interval {
  width: 50px;
  text-align: center;
}

.category-period {
  width: 90px;
}

.transparent {
  --background: transparent;
}
</style>
