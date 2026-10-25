<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <!-- Accordion mode (mobile) -->
  <ion-accordion-group v-if="accordion" expand="inset" class="accounts-accordion">
    <ion-accordion value="accounts" class=shadow1>
      <ion-item slot="header" class="transparent">
        <ion-label>{{ t('budget.components.accountcards.label') }}</ion-label>
        <ion-button slot="end" fill="clear" @click="openModal()">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-button>
      </ion-item>

      <div slot="content">
        <ion-card class="shadow1">
          <!-- Summary: ingresos/egresos totales -->
          <template v-if="summary">
            <ion-card-header>
              <ion-card-title :color="summary.color">{{ summary.label }}</ion-card-title>
              <ion-button slot="end" fill="clear">
                <ion-icon :icon="informationCircleOutline"></ion-icon>
              </ion-button>
            </ion-card-header>

            <ion-card-content>
              <p>
                <span style="color: var(--ion-color-success)"
                  >{{ t("budget.account.incomes") }}: {{ formatCurrency({ value: summary.ingresos }) }}</span
                >
                <br />
                <span style="color: var(--ion-color-danger)"
                  >{{ t("budget.account.expenses") }}: {{ formatCurrency({ value: summary.egresos }) }}</span
                >
              </p>
            </ion-card-content>
          </template>

          <ion-list class="transparent">
            <template v-if="accounts.length > 0">
              <div v-for="acc in accounts" :key="acc.id">
                <ion-item
                  class="transparent"
                  lines="none"
                  :button="acc.id != null"
                  @click="acc.id != null && edit({ acc })"
                >
                  <ion-label>
                    {{ acc.name }}
                  </ion-label>

                  <ion-label slot="end">
                    {{ t('budget.account.initialBalance') }}: {{ formatCurrency({ value: acc.initialBalance }) }}
                  </ion-label>
                </ion-item>

                <ion-item
                  class="transparent"
                  lines="full"
                  :button="acc.id != null"
                  @click="acc.id != null && edit({ acc })"
                >
                  <ion-label>
                    <h2 :color="acc.balance >= 0 ? 'success' : 'danger'">
                      {{ formatCurrency({ value: acc.balance }) }}
                    </h2>
                    <p v-if="acc.ingresos > 0 || acc.egresos > 0">
                      <span color="success">+{{ formatCurrency({ value: acc.ingresos }) }}</span>
                      /
                      <span color="danger">-{{ formatCurrency({ value: acc.egresos }) }}</span>
                    </p>
                  </ion-label>

                  <div slot="end" class="chart-wrapper">
                    <AccountBarChart
                      v-if="acc.ingresos > 0 || acc.egresos > 0"
                      :ingresos="acc.ingresos"
                      :egresos="acc.egresos"
                    />
                  </div>
                </ion-item>
              </div>
            </template>

            <template v-else>
              <ion-item lines="none">
                <ion-label>{{ t('budget.components.accountcards.empty') }}</ion-label>
              </ion-item>
            </template>
          </ion-list>
        </ion-card>
      </div>
    </ion-accordion>
  </ion-accordion-group>

  <!-- Full list mode (desktop) -->
  <template v-else>
      <ion-card class="shadow1">
      <ion-card-header>
        <ion-card-title>{{ t("budget.account.title") }}</ion-card-title>
        <ion-button slot="end" fill="clear" @click="openModal()">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-button>
      </ion-card-header>

      <!-- Summary: ingresos/egresos totales -->
      <template v-if="summary">
        <ion-card-header>
          <ion-card-title :color="summary.color">{{ summary.label }}</ion-card-title>
          <ion-button slot="end" fill="clear">
            <ion-icon :icon="informationCircleOutline"></ion-icon>
          </ion-button>
        </ion-card-header>

        <ion-card-content>
          <p>
            <span style="color: var(--ion-color-success)"
              >{{ t("budget.account.incomes") }}: {{ formatCurrency({ value: summary.ingresos }) }}</span
            >
            <br />
            <span style="color: var(--ion-color-danger)"
              >{{ t("budget.account.expenses") }}: {{ formatCurrency({ value: summary.egresos }) }}</span
            >
          </p>
        </ion-card-content>
      </template>

      <ion-list class="transparent">
        <template v-if="accounts.length > 0">
          <div v-for="acc in accounts" :key="acc.id">
            <ion-item
              class="transparent"
              lines="none"
              :button="acc.id != null"
              @click="acc.id != null && edit({ acc })"
            >
              <ion-label>
                {{ acc.name }}
              </ion-label>

              <ion-label slot="end">
                {{ t('budget.account.initialBalance') }}: {{ formatCurrency({ value: acc.initialBalance }) }}
              </ion-label>
            </ion-item>

            <ion-item
              class="transparent"
              lines="full"
              :button="acc.id != null"
              @click="acc.id != null && edit({ acc })"
            >
              <ion-label>
                <h2 :color="acc.balance >= 0 ? 'success' : 'danger'">
                  {{ formatCurrency({ value: acc.balance }) }}
                </h2>
                <p v-if="acc.ingresos > 0 || acc.egresos > 0">
                  <span color="success">+{{ formatCurrency({ value: acc.ingresos }) }}</span>
                  /
                  <span color="danger">-{{ formatCurrency({ value: acc.egresos }) }}</span>
                </p>
              </ion-label>

              <div slot="end" class="chart-wrapper">
                <AccountBarChart
                  v-if="acc.ingresos > 0 || acc.egresos > 0"
                  :ingresos="acc.ingresos"
                  :egresos="acc.egresos"
                />
              </div>
            </ion-item>
          </div>
        </template>

        <template v-else>
          <ion-item lines="none">
            <ion-label>{{ t('budget.components.accountcards.empty') }}</ion-label>
          </ion-item>
        </template>
      </ion-list>
    </ion-card>
  </template>

  <ion-modal :is-open="showModal" :backdrop-dismiss="false" @did-dismiss="cancelModal">
    <AddAccountComponent
      :account="modalAccount"
      @dismiss="cancelModal"
      @saved="(p: any) => onModalSaved({ payload: p })"
      @delete="(id) => onDeleteAccount({ id })"
    />
  </ion-modal>
</template>

<script setup lang="ts">
// Imports
import { ref,  } from 'vue';
import { useLocale } from '@/composables/useLocale';
import {
  IonAccordion,
  IonAccordionGroup,
  IonList,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonButton,
  IonIcon,
  IonModal,
} from '@ionic/vue';
import { addOutline, informationCircleOutline } from 'ionicons/icons';
import { formatCurrency } from '@/utils/currency';
import accountsController from '@/controllers/accountsController';
import budgetEntriesController from '@/controllers/budgetEntriesController';
// End Imports

// Components
import AccountBarChart from './AccountBarChart.vue';
import AddAccountComponent from '@/views/suppliers/accounts/modals/AddAccountComponent.vue';
// End Components

// Vars
import type { AccountWithBalance } from '@/utils/budgetTypes';
import type { Account } from '@/stores/accountsStore';


const { t } = useLocale();
interface Summary {
  label: string;
  color: string | undefined;
  ingresos: number;
  egresos: number;
}

defineProps<{
  accounts: AccountWithBalance[];
  accordion?: boolean;
  summary?: Summary;
}>();

const createAccount = accountsController.addAccount.bind(accountsController);
const updateAccount = accountsController.updateAccount.bind(accountsController);
const deleteAccount = accountsController.deleteAccount.bind(accountsController);
const loadAll = accountsController.loadAll.bind(accountsController);

const showModal = ref(false);
const modalAccount = ref<AccountWithBalance | null>(null);
// End Vars

// Functions
function openModal() {
  modalAccount.value = null;
  showModal.value = true;
}

function edit(params: { acc: AccountWithBalance }) {
  const { acc } = params;
  modalAccount.value = acc;
  showModal.value = true;
}

function cancelModal() {
  showModal.value = false;
  modalAccount.value = null;
}

async function onModalSaved(params: { payload: Record<string, unknown> }) {
  const { payload } = params;
  if (!payload) return;
  if (payload.id != null) {
    await updateAccount({ account: payload as Account });
  } else {
    await createAccount({ account: payload as Account });
  }
  cancelModal();
  await loadAll();
}

async function onDeleteAccount(params: { id: string | number }) {
  const { id } = params;
  for (const entry of budgetEntriesController.getEntries()) {
    if (String(entry.accountId) === String(id)) {
      budgetEntriesController.updateIngreso({ id: entry.id, changes: { accountId: null } });
    }
  }
  await deleteAccount({ id });
  cancelModal();
  await loadAll();
}
// End Functions

// Life cycle

// End Life cycle

// Computed

// End Computed

// Watch
// End Watch
</script>

<style scoped>
.chart-wrapper {
  width: 80px;
  height: 40px;
  margin-left: 8px;
}

/* In mobile the accordion content hosts the single card wrapper; no height
   constraints so the accordion can size naturally. */
.accounts-accordion .shadow1 {
  margin: 0;
}
</style>
