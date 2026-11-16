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
        <ion-title>{{ t('components.categoryPicker.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button :aria-label="t('categorypickermodal.aria')" @click="openQuickCategoryAlert()">
            <ion-icon :icon="addOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          mode="ios"
          :placeholder="t('categorypickermodal.placeholder')"
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
          <ion-item
            v-for="cat in group.items"
            :key="cat.id"
            lines="full"
            button
            class="transparent"
            @click="selectCategory({ category: cat })"
          >
            <ion-label>{{ cat.name }}</ion-label>
            <ion-icon
              v-if="selectedId === cat.id"
              slot="end"
              :icon="checkmarkCircleOutline"
            />
          </ion-item>
        </template>
      </ion-list>

      <div v-else class="ion-text-center ion-padding">
        <ion-label color="medium">{{ t('components.categoryPicker.empty') }}</ion-label>
      </div>
    </ion-content>

    <QuickCategoryAlert
      :is-open="showQuickCategoryAlert"
      :inputs="quickCategoryInputs"
      :buttons="quickCategoryButtons"
      @did-dismiss="showQuickCategoryAlert = false"
    />
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
  IonSearchbar,
  IonCard,
} from '@ionic/vue';
import { useLocale } from '@/composables/useLocale';
import { closeOutline, addOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { ref, computed, watch } from 'vue';
import QuickCategoryAlert from '@/components/QuickCategoryAlert.vue';
import { useQuickCategory } from '@/composables/useQuickCategory';
import type { EntryCategoryRow } from '@/db/types';

const { t } = useLocale();
// end imports

// Props / emits
const props = defineProps<{
  isOpen: boolean;
  categories: EntryCategoryRow[];
  selectedId?: string | null;
}>();
const emit = defineEmits<{
  select: [category: EntryCategoryRow];
  dismiss: [];
}>();
// end props/emits

// Vars
const searchQuery = ref('');

// Quick create (name only — section assignment lives in the Performance config page)
const {
  showQuickCategoryAlert,
  quickCategoryInputs,
  quickCategoryButtons,
  openQuickCategoryAlert,
} = useQuickCategory({
  onCategoryCreated: (params: { newCategory: EntryCategoryRow }) => {
    const { newCategory } = params;
    emit('select', newCategory);
    searchQuery.value = '';
    showQuickCategoryAlert.value = false;
    emit('dismiss');
  },
});
// end vars

// Watch
watch(() => props.isOpen, (open) => {
  if (open) searchQuery.value = '';
});
// end watch

// Computed — all categories, alphabetical, grouped by first letter (ion-item-divider).
const groupedCategories = computed<Array<{ letter: string; items: EntryCategoryRow[] }>>(() => {
  const q =
    searchQuery.value?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ||
    '';
  const sorted = props.categories
    .filter(
      (c) =>
        !q ||
        c.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .includes(q)
    )
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
function selectCategory(params: { category: EntryCategoryRow }) {
  const { category } = params;
  emit('select', category);
  emit('dismiss');
}
// end functions
</script>