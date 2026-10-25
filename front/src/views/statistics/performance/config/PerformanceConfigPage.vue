<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/statistics/performance"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ t('statistics.performance.config.performanceconfigpage.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="8" size-lg="6">
            <ion-card class="shadow1 ion-margin-top">
              <ion-item lines="full" class="transparent">
                <ion-label>{{ t('statistics.performance.config.performanceconfigpage.label') }}</ion-label>
                <ion-button slot="end" fill="clear" @click="openSectionPicker()">
                  {{ t('common.edit') }}
                </ion-button>
              </ion-item>
              <ion-card-content>
                <ion-note color="medium" class="ion-text-wrap">
                      {{ t('statistics.performance.config.performanceconfigpage.description') }}
                </ion-note>
              </ion-card-content>
            </ion-card>

          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>

    <SectionAssignModal
      :is-open="showAssignModal"
      :categories="allCategories"
      :sections="sections"
      :section-map="sectionMap"
      @confirm="onSectionConfirm"
      @created="onCategoriesReloadNeeded"
      @dismiss="closeSectionPicker"
    />
  </ion-page>
</template>

<script lang="ts" setup>
// Imports (ionic/vue/ionicons)
import {
  IonPage,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonItem,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonNote,
  IonBackButton,
} from '@ionic/vue';
import { useLocale } from '@/composables/useLocale';
import { ref, onMounted } from 'vue';

// Import utils
import { entryCategoriesDb } from '@/db/controllers/entryCategoriesDb';
import type { EntryCategoryRow, IncomeStatementSection, IncomeStatementSectionMap } from '@/db/types';
import SectionAssignModal from '@/components/SectionAssignModal.vue';

const { t } = useLocale();
// end imports

// Vars
const allCategories = ref<EntryCategoryRow[]>([]);
const sectionMap = ref<IncomeStatementSectionMap>({
  incomes: [],
  costOfLife: [],
  discretionaryExpenses: [],
  financialExpenses: [],
});

const sections: Array<{ key: IncomeStatementSection; label: string }> = [
  { key: 'incomes', label: t('statistics.performance.useincomestatement.incomes') },
  { key: 'costOfLife', label: t('statistics.performance.useincomestatement.costOfLife') },
  { key: 'discretionaryExpenses', label: t('statistics.performance.useincomestatement.discretionaryExpenses') },
  { key: 'financialExpenses', label: t('statistics.performance.useincomestatement.financialExpenses') },
];

const showAssignModal = ref(false);
// end vars

// OnMounted
onMounted(async () => {
  await entryCategoriesDb.ensureSeeded();
  allCategories.value = await entryCategoriesDb.getAll();
  sectionMap.value = await entryCategoriesDb.getSectionMap();
});
// end onmounted

// Functions
function openSectionPicker() {
  showAssignModal.value = true;
}

function closeSectionPicker() {
  showAssignModal.value = false;
}

async function onSectionConfirm(map: IncomeStatementSectionMap) {
  sectionMap.value = { ...map };
  await entryCategoriesDb.setSectionMap({ map: sectionMap.value });
  showAssignModal.value = false;
}

async function onCategoriesReloadNeeded() {
  allCategories.value = await entryCategoriesDb.getAll();
}


// end functions
</script>
