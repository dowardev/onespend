<template>
  <ion-list class="transparent">
    <ion-list-header>
      <ion-label>Cuentas</ion-label>

      <ion-button @click="openModal()">
        <ion-icon :icon="addOutline"></ion-icon>
      </ion-button>
    </ion-list-header>

    <div class="list-content">
      <template v-if="accounts.length > 0">
        <ion-item
          v-for="acc in accounts"
          :key="acc.id"
          class="transparent"
          lines="full"
          :button="acc.id != null"
          @click="acc.id != null && edit(acc)"
        >
          <ion-label>
            <h2>{{ acc.name }}</h2>
            <p>Inicial: {{ formatCurrency(acc.initialBalance) }}</p>
          </ion-label>

          <ion-label slot="end" class="ion-text-end">
            <h2 :color="acc.balance >= 0 ? 'success' : 'danger'">
              {{ formatCurrency(acc.balance) }}
            </h2>
            <p v-if="acc.ingresos > 0 || acc.egresos > 0">
              <span color="success">+{{ formatCurrency(acc.ingresos) }}</span>
              /
              <span color="danger">-{{ formatCurrency(acc.egresos) }}</span>
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
      </template>

      <template v-else>
        <ion-item lines="none">
          <ion-label>No hay cuentas creadas</ion-label>
        </ion-item>
      </template>
    </div>

    <ion-modal
      :is-open="showModal"
      :backdrop-dismiss="false"
      @did-dismiss="cancelModal"
    >
      <AddAccountComponent
        :account="modalAccount"
        @dismiss="cancelModal"
        @saved="onModalSaved"
        @delete="onDeleteAccount"
      />
    </ion-modal>
  </ion-list>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  IonList,
  IonListHeader,
  IonLabel,
  IonCard,
  IonItem,
  IonButton,
  IonIcon,
  IonModal,
} from '@ionic/vue';
import AccountBarChart from './AccountBarChart.vue';
import { addOutline } from 'ionicons/icons';
import accountsController from '@/controllers/accountsController';
import budgetController from '@/controllers/budgetController';
import AddAccountComponent from '@/views/suppliers/accounts/modals/AddAccountComponent.vue';

interface AccountWithBalance {
  id: string | number;
  name: string;
  initialBalance: number;
  ingresos: number;
  egresos: number;
  balance: number;
}

defineProps<{
  accounts: AccountWithBalance[];
}>();

const createAccount = accountsController.addAccount.bind(accountsController);
const updateAccount = accountsController.updateAccount.bind(accountsController);
const deleteAccount = accountsController.deleteAccount.bind(accountsController);
const loadAll = accountsController.loadAll.bind(accountsController);

const showModal = ref(false);
const modalAccount = ref<any | null>(null);

function formatCurrency(v: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(v || 0);
}

function openModal() {
  modalAccount.value = null;
  showModal.value = true;
}

function edit(acc: AccountWithBalance) {
  modalAccount.value = acc;
  showModal.value = true;
}

function cancelModal() {
  showModal.value = false;
  modalAccount.value = null;
}

async function onModalSaved(payload: any) {
  if (!payload) return;
  if (payload.id != null) {
    await updateAccount(payload as any);
  } else {
    await createAccount(payload as any);
  }
  cancelModal();
  await loadAll();
}

async function onDeleteAccount(id: string | number) {
  for (const entry of budgetController.getEntries()) {
    if (String(entry.accountId) === String(id)) {
      budgetController.updateIngreso(entry.id, { accountId: null });
    }
  }
  await deleteAccount(id);
  cancelModal();
  await loadAll();
}
</script>

<style scoped>
.account-card {
  margin-bottom: 8px;
}

.list-content {
  max-height: calc(100dvh - 210px);
  overflow-y: auto;
}

.chart-wrapper {
  width: 80px;
  height: 40px;
  margin-left: 8px;
}

</style>
