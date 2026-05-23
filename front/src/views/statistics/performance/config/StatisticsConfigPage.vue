<template>
  <ion-header class="ion-no-border" mode="ios">
    <ion-toolbar>
      <ion-buttons slot="end">
        <ion-button @click="closeModal">
          <ion-icon :icon="closeOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
      <ion-title>Configuración</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item lines="full">
      <ion-label>Registra tus gastos</ion-label>
    </ion-item>

    <ion-list class="transparent">
      <ion-list-header>
        <ion-label>
          <div>Servicios</div>
          <ion-note>Ingresa una estimacion diaria</ion-note>
        </ion-label>

        <ion-button :disabled="hasUnfilledService" @click="addItem()">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-button>
      </ion-list-header>

      <div class="list-content">
        <template v-if="serviceItems.length === 0">
          <ion-item>
            <ion-label>Pulsa el botón «+» para agregar un nuevo servicio</ion-label>
          </ion-item>
        </template>

        <template v-else>
          <ion-item v-for="(item, idx) in serviceItems" :key="item.id || idx">
            <div style="width: 100%; display: flex; gap: 8px; align-items: center">
              <ion-input
                v-model="item.name"
                placeholder="Descripción"
                style="flex: 2"
                @ion-blur="() => updateItem(item)"
              ></ion-input>

              <ion-input
                v-model.number="item.amount"
                type="number"
                placeholder="Cantidad"
                style="width: 120px"
                @ion-blur="() => updateItem(item)"
              ></ion-input>

              <ion-button color="danger" fill="clear" @click="removeItem(idx)">
                <ion-icon :icon="trashOutline"></ion-icon>
              </ion-button>
            </div>
          </ion-item>
        </template>
      </div>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonPage, IonItem, IonLabel, IonNote, IonInput } from '@ionic/vue';
import { computed, reactive, onMounted, defineEmits } from 'vue';

// constrollers
import systemController from '@/controllers/systemConfigController';
import { addOutline, trashOutline, closeOutline } from 'ionicons/icons';
import { DixieController } from '@/controllers/dixie';
// end constrollers

const serviceItems = computed(() => categories[0].items);
const hasUnfilledService = computed(() =>
  serviceItems.value.some((it) => !it.name?.trim() || !it.amount || Number(it.amount) <= 0),
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();

function closeModal() {
  emit('close');
}

// dixie instance for statistics fields
const dixie = new DixieController({ storeName: 'statisticsFields' });

type StatItem = {
  id?: number;
  categoryKey: string;
  name: string;
  amount: number | null;
};

const categories = reactive([
  { key: 'services', title: 'Servicios', items: [] as StatItem[] },
  { key: 'employees', title: 'Empleados', items: [] as StatItem[] },
  { key: 'others', title: 'Otros servicios', items: [] as StatItem[] },
]);

async function loadItems() {
  try {
    const list: StatsField[] = await dixie.listBackups();
    if (Array.isArray(list)) {
      for (const entry of list) {
        if (entry && entry.categoryKey) {
          const cat = categories.find((c: Category) => c.key === entry.categoryKey);
          if (cat) {
            cat.items.push({
              id: entry.id,
              categoryKey: entry.categoryKey,
              name: entry.name || '',
              amount:
                entry.amount === undefined || entry.amount === null ? null : Number(entry.amount),
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to load statistics fields from dixie', e);
  }
}

function hasUnfilled(category: Category) {
  // returns true if any existing item has empty name or amount is not a valid number > 0
  if (!category || !Array.isArray(category.items)) return false;
  return category.items.some((it: StatItem) => {
    const nameEmpty = !it.name || String(it.name).trim().length === 0;
    const amountInvalid =
      it.amount === null ||
      it.amount === undefined ||
      Number.isNaN(Number(it.amount)) ||
      Number(it.amount) <= 0; // require amount > 0
    return nameEmpty || amountInvalid;
  });
}

async function addItem() {
  if (hasUnfilledService.value) return;

  const newItem: StatItem = { categoryKey: 'services', name: '', amount: null };
  try {
    const id = await dixie.addEntry({ entry: newItem });
    newItem.id = id as number;
    serviceItems.value.push(newItem);
  } catch (e) {
    console.error('Failed to add item', e);
  }
}

async function updateItem(item: StatItem) {
  try {
    await dixie.putEntry({ entry: item });
  } catch (e) {
    console.error('Failed to update item', e);
  }
}

async function removeItem(idx: number) {
  const item = serviceItems.value[idx];
  if (!item) return;
  try {
    if (item.id) await dixie.deleteBackup({ id: item.id as number });
  } catch (e) {
    console.error('Failed to delete item from dixie', e);
  } finally {
    serviceItems.value.splice(idx, 1);
  }
}

onMounted(() => {
  loadItems();
});
</script>
