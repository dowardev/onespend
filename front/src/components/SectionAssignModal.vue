<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-modal
    :is-open="isOpen"
    @will-dismiss="$emit('dismiss')"
  >
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="$emit('dismiss')">
            <ion-icon :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>Categorías por sección</ion-title>
        <ion-buttons slot="end">
          <ion-button aria-label="Nueva categoría" @click="openQuickCategoryAlert()">
            <ion-icon :icon="addOutline" />
          </ion-button>
          <ion-button aria-label="Guardar" @click="onConfirm">
            <ion-icon :icon="saveOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          mode="ios"
          placeholder="Buscar categoría"
          class="ion-no-padding"
          :debounce="300"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list
        v-if="groupedCategories.length > 0"
        class="transparent ion-padding-start ion-padding-end"
      >
        <template v-for="group in groupedCategories" :key="group.letter">
          <ion-item-divider sticky>
            <ion-label>{{ group.letter }}</ion-label>
          </ion-item-divider>
          <ion-item v-for="cat in group.items" :key="cat.id" lines="full">
            <ion-label>{{ cat.name }}</ion-label>
            <ion-select
              slot="end"
              :value="assignments[cat.id] || ''"
              placeholder="Sin asignar"
              interface="popover"
              :aria-label="'Sección de ' + cat.name"
              :data-test="'section-select-' + cat.id"
              @ion-change="onAssign({ id: cat.id, value: $event.detail.value })"
            >
              <ion-select-option value="">Sin asignar</ion-select-option>
              <ion-select-option
                v-for="s in sections"
                :key="s.key"
                :value="s.key"
              >{{ s.label }}</ion-select-option>
            </ion-select>
          </ion-item>
        </template>
      </ion-list>

      <div v-else class="ion-text-center ion-padding">
        <ion-label color="medium">Sin categorías. Presiona '+' para crear una nueva.</ion-label>
      </div>

      <QuickCategoryAlert
        :is-open="showQuickCategoryAlert"
        :inputs="quickCategoryInputs"
        :buttons="quickCategoryButtons"
        @did-dismiss="showQuickCategoryAlert = false"
      />
    </ion-content>
  </ion-modal>
</template>

<script lang="ts" setup>
// Imports (ionic/vue/ionicons)
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonItem,
  IonList,
  IonItemDivider,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonSearchbar,
} from '@ionic/vue';
import { closeOutline, addOutline, saveOutline } from 'ionicons/icons';
import { ref, computed, watch } from 'vue';
import QuickCategoryAlert from '@/components/QuickCategoryAlert.vue';
import { useQuickCategory } from '@/composables/useQuickCategory';
import type { EntryCategoryRow, IncomeStatementSection, IncomeStatementSectionMap } from '@/db/types';
// end imports

// Props / emits
const props = defineProps<{
  isOpen: boolean;
  categories: EntryCategoryRow[];
  sections: Array<{ key: IncomeStatementSection; label: string }>;
  sectionMap: IncomeStatementSectionMap;
}>();

const emit = defineEmits<{
  confirm: [map: IncomeStatementSectionMap];
  created: [];
  dismiss: [];
}>();
// end props/emits

// Vars
const searchQuery = ref('');
// Per-category assignment: id -> section key ('' = unassigned).
const assignments = ref<Record<string, IncomeStatementSection | ''>>({});
// end vars

// Quick create (a new category starts as "Sin asignar")
const {
  showQuickCategoryAlert,
  quickCategoryInputs,
  quickCategoryButtons,
  openQuickCategoryAlert,
} = useQuickCategory({
  onCategoryCreated: () => emit('created'),
});
// end vars

// Watch — build the assignment map from the incoming sectionMap on every open.
watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    searchQuery.value = '';
    const next: Record<string, IncomeStatementSection | ''> = {};
    for (const c of props.categories) next[c.id] = '';
    for (const [section, ids] of Object.entries(props.sectionMap) as Array<
      [IncomeStatementSection, string[]]
    >) {
      for (const id of ids) next[id] = section;
    }
    assignments.value = next;
  },
  { immediate: true },
);
// end watch

// Computed — alphabetical list grouped by first letter (accent/case-insensitive search).
const groupedCategories = computed<Array<{ letter: string; items: EntryCategoryRow[] }>>(() => {
  const q =
    searchQuery.value
      ?.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') || '';
  const sorted = props.categories
    .filter((c) => !q || c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const groups: Array<{ letter: string; items: EntryCategoryRow[] }> = [];
  for (const c of sorted) {
    const letter = (c.name.trim().charAt(0) || '?').toUpperCase();
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) {
      last.items.push(c);
    } else {
      groups.push({ letter, items: [c] });
    }
  }
  return groups;
});
// end computed

// Functions
function onAssign(params: { id: string; value: string }) {
  const { id, value } = params;
  if (value === '') {
    assignments.value[id] = '';
  } else {
    assignments.value[id] = value as IncomeStatementSection;
  }
}

function onConfirm() {
  const map: IncomeStatementSectionMap = {
    incomes: [],
    costOfLife: [],
    discretionaryExpenses: [],
    financialExpenses: [],
  };
  for (const c of props.categories) {
    const sec = assignments.value[c.id];
    if (sec) map[sec].push(c.id);
  }
  emit('confirm', map);
  emit('dismiss');
}
// end functions
</script>