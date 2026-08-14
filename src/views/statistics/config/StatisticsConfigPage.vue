<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode"></ion-menu-button>
        </ion-buttons>

        <ion-title>Configuracion estadistica </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1 main-card-content">
        Para una mejor precision registra todos los gastos de tu negocio.

        <ion-grid>
          <ion-row>
            <ion-col size="6">
              <div v-for="category in categories" :key="category.key">
                <ion-list class="transparent">
                  <ion-list-header>
                    <ion-label>
                      <div>{{ category.title }}</div>
                      <ion-note>Ingresa una estimacion diaria</ion-note>
                    </ion-label>

                    <ion-button
                      :disabled="hasUnfilled(category)"
                      @click="addItem(category.key)"
                    >
                      <ion-icon :icon="addOutline"></ion-icon>
                    </ion-button>
                  </ion-list-header>

                  <div class="list-content">
                    <template v-if="category.items.length === 0">
                      <ion-item>
                        <ion-label
                          >Pulsa el botón «+» para agregar un nuevo
                          {{ category.title.toLowerCase() }}</ion-label
                        >
                      </ion-item>
                    </template>

                    <template v-else>
                      <ion-item
                        v-for="(item, idx) in category.items"
                        :key="item.id || idx"
                      >
                        <div
                          style="
                            width: 100%;
                            display: flex;
                            gap: 8px;
                            align-items: center;
                          "
                        >
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

                          <ion-button
                            color="danger"
                            fill="clear"
                            @click="removeItem(category.key, idx)"
                          >
                            <ion-icon :icon="trashOutline"></ion-icon>
                          </ion-button>
                        </div>
                      </ion-item>
                    </template>
                  </div>
                </ion-list>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonItem, IonLabel, IonNote, IonInput } from '@ionic/vue';
import { computed, reactive, onMounted } from 'vue';

// constrollers
import systemController from '@/controllers/systemConfigController';
import { addOutline, trashOutline } from 'ionicons/icons';
import { DixieController } from '@/controllers/dixie';
// end constrollers

// computed
const designMode = computed(() => systemController.getDesignMode());
// end computed

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
    const list: any = await dixie.listBackups();
    if (Array.isArray(list)) {
      for (const entry of list) {
        if (entry && entry.categoryKey) {
          const cat = (categories as any).find(
            (c: any) => c.key === entry.categoryKey
          );
          if (cat) {
            cat.items.push({
              id: entry.id,
              categoryKey: entry.categoryKey,
              name: entry.name || '',
              amount:
                entry.amount === undefined || entry.amount === null
                  ? null
                  : Number(entry.amount),
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to load statistics fields from dixie', e);
  }
}

function hasUnfilled(category: any) {
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

async function addItem(categoryKey: string) {
  const cat = (categories as any).find((c: any) => c.key === categoryKey);
  if (!cat) return;
  // Prevent adding if there's an unfilled existing item
  if (hasUnfilled(cat)) return;

  const newItem: StatItem = { categoryKey, name: '', amount: null };
  try {
    const id = await dixie.addEntry({ entry: newItem });
    // addEntry returns the generated key
    (newItem as any).id = id as number;
    cat.items.push(newItem);
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

async function removeItem(categoryKey: string, idx: number) {
  const cat = (categories as any).find((c: any) => c.key === categoryKey);
  if (!cat) return;
  const item = cat.items[idx];
  if (!item) return;
  try {
    if ((item as any).id) await dixie.deleteBackup((item as any).id);
  } catch (e) {
    console.error('Failed to delete item from dixie', e);
  } finally {
    cat.items.splice(idx, 1);
  }
}

onMounted(() => {
  loadItems();
});
</script>
