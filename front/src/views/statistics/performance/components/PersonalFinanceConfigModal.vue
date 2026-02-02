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
                <ion-label>Metas</ion-label>
              </ion-list-header>

              <div class="list-content">
                <ion-item class="transparent" lines="full">
                  <ion-input
                    :value="form.monthlySavingsGoal"
                    label="Meta de ahorro mensual"
                    label-placement="start"
                    type="number"
                    placeholder="5000"
                    style="border: none"
                    :error-text="v$.form.monthlySavingsGoal.$errors[0]?.$message?.toString()"
                    :class="{
                      'ion-invalid': v$.form.monthlySavingsGoal.$invalid && v$.form.monthlySavingsGoal.$dirty,
                      'ion-touched': v$.form.monthlySavingsGoal.$dirty,
                    }"
                    @ion-input="form.monthlySavingsGoal = Number($event.detail.value)"
                    @click="v$.form.monthlySavingsGoal.$touch()"
                  ></ion-input>
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
                  <ion-input
                    :value="category.amount"
                    :label="category.name"
                    label-placement="start"
                    type="number"
                    :placeholder="category.placeholder || '0'"
                    style="border: none"
                    :error-text="v$.form.categories.$errors[0]?.$message?.toString()"
                    :class="{
                      'ion-invalid': category.amount <= 0 && category.amount !== undefined && category.amount !== '' && v$.form.categories.$dirty,
                      'ion-touched': v$.form.categories.$dirty,
                    }"
                    @ion-input="category.amount = Number($event.detail.value)"
                    @click="v$.form.categories.$touch()"
                  ></ion-input>

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
              <ion-list-header>
                <ion-label>Alertas</ion-label>
              </ion-list-header>

              <div class="list-content">
                <ion-item class="transparent" lines="full">
                  <ion-input
                    :value="form.minSavingsPercent"
                    label="Ahorro esperado(%)"
                    label-placement="start"
                    type="number"
                    placeholder="20"
                    style="border: none"
                    :error-text="v$.form.minSavingsPercent.$errors[0]?.$message?.toString()"
                    :class="{
                      'ion-invalid': v$.form.minSavingsPercent.$invalid && v$.form.minSavingsPercent.$dirty,
                      'ion-touched': v$.form.minSavingsPercent.$dirty,
                    }"
                    @ion-input="form.minSavingsPercent = Number($event.detail.value)"
                    @click="v$.form.minSavingsPercent.$touch()"
                  ></ion-input>
                </ion-item>
              </div>
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
  IonInput,
  IonButton,
  IonButtons,
  IonIcon,
  IonPopover,
} from '@ionic/vue';
import {
  addOutline,
  closeOutline,
  saveOutline,
  trashOutline,
  checkmarkOutline,
} from 'ionicons/icons';
import { reactive, ref, onMounted, computed } from 'vue';
import { DixieController } from '@/controllers/dixie';
import useVuelidate from '@vuelidate/core';
import { required, minValue, helpers } from '@vuelidate/validators';

interface PersonalFinanceConfig {
  monthlySavingsGoal: number;
  minSavingsPercent: number;
}

interface BudgetCategory {
  key: string;
  name: string;
  amount: number;
  placeholder?: string;
}

const availableCategories: BudgetCategory[] = [
  { key: 'housing', name: 'Vivienda', placeholder: '3000' },
  { key: 'food', name: 'Alimentación', placeholder: '2000' },
  { key: 'transport', name: 'Transporte', placeholder: '1000' },
  { key: 'entertainment', name: 'Entretenimiento', placeholder: '500' },
  { key: 'health', name: 'Salud', placeholder: '800' },
  { key: 'other', name: 'Otros gastos', placeholder: '500' },
  { key: 'subscriptions', name: 'Suscripciones', placeholder: '300' },
  { key: 'education', name: 'Educación', placeholder: '400' },
  { key: 'clothing', name: 'Ropa', placeholder: '300' },
  { key: 'personal', name: 'Cuidado personal', placeholder: '200' },
];

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', config: PersonalFinanceConfig): void;
}>();

const defaultConfig: PersonalFinanceConfig = {
  monthlySavingsGoal: 5000,
  minSavingsPercent: 20,
};

const form = reactive({
  monthlySavingsGoal: 5000,
  minSavingsPercent: 20,
  categories: [] as BudgetCategory[],
});

const dixieController = new DixieController({
  storeName: 'config',
});

const showCategoryPopover = ref(false);
const popoverEvent = ref<Event | null>(null);
const customCategoryName = ref('');

const rules = {
  form: {
    monthlySavingsGoal: {
      required: helpers.withMessage('El valor es obligatorio', required),
      minValue: helpers.withMessage('El valor debe ser mayor a 0', minValue(1)),
    },
    minSavingsPercent: {
      required: helpers.withMessage('El valor es obligatorio', required),
      minValue: helpers.withMessage('El valor debe ser mayor a 0', minValue(1)),
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

const isFormInvalid = computed(() => v$.value?.$invalid ?? false);

onMounted(async () => {
  try {
    const savedConfig = ((await dixieController.listBackups()) as any[]) || [];
    if (savedConfig.length > 0) {
      const latest = savedConfig.sort(
        (a, b) => (b as any).createdAt - (a as any).createdAt
      )[0];
      if (latest.data) {
        form.monthlySavingsGoal = latest.data.monthlySavingsGoal;
        form.minSavingsPercent = latest.data.minSavingsPercent;
        if (Array.isArray(latest.data.categories)) {
          form.categories.splice(0, form.categories.length, ...latest.data.categories);
        }
      }
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }
});

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
  Object.assign(form, {
    monthlySavingsGoal: defaultConfig.monthlySavingsGoal,
    minSavingsPercent: defaultConfig.minSavingsPercent,
  });
  form.categories.splice(0, form.categories.length);
}

function openCategoryPopover(event: Event) {
  popoverEvent.value = event;
  showCategoryPopover.value = true;
}

function isCategoryAdded(key: string): boolean {
  return form.categories.some(cat => cat.key === key);
}

const availableCategoriesFiltered = computed(() => {
  return availableCategories.filter(cat => !isCategoryAdded(cat.key));
});

function addCategory(category: BudgetCategory) {
  if (!isCategoryAdded(category.key)) {
    form.categories.push({
      key: category.key,
      name: category.name,
      amount: 0,
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
    });
    customCategoryName.value = '';
  }
  showCategoryPopover.value = false;
}
</script>

<style scoped>
ion-input {
  --padding-start: 8px;
  border: 1px solid var(--ion-color-light, #e0e0e0);
  border-radius: 4px;
  margin-top: 4px;
}

.transparent {
  --background: transparent;
}
</style>
