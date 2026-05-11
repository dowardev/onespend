<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode" />
        </ion-buttons>

        <ion-title>Cuentas</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="openModal()">
            <ion-icon :icon="addOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1 main-card-content">
        <ion-list style="height: 100%" class="ion-margin-top transparent">
          <ion-list-header>
            <ion-label>Lista de cuentas</ion-label>
          </ion-list-header>

          <ion-searchbar
            v-model="searchTerm"
            mode="ios"
            placeholder="Buscar cuentas"
            show-clear-button="focus"
          ></ion-searchbar>

          <div class="list-content accounts__content">
            <template v-for="group in groupedAccounts" :key="group.letter">
              <ion-item-group>
                <ion-item-divider sticky>
                  <ion-label>{{ group.letter }}</ion-label>
                </ion-item-divider>

                <ion-item
                  v-for="c in group.items"
                  :key="c.id"
                  button
                  class="transparent"
                  @click="edit({ account: c })"
                >
                  <ion-label>
                    <h3>{{ c.name }}</h3>
                    <p>Balance inicial: {{ c.initialBalance ?? 0 }}</p>
                  </ion-label>

                  <ion-buttons slot="end" class="account-actions">
                    <ion-button
                      color="danger"
                      fill="clear"
                      @click.stop="
                        confirmRemoveAccount({ id: c.id, name: c.name })
                      "
                    >
                      <ion-icon :icon="trashOutline" color="danger"></ion-icon>
                    </ion-button>
                  </ion-buttons>
                </ion-item>
              </ion-item-group>
            </template>
          </div>
        </ion-list>
      </ion-card>

      <ion-modal
        class="accounts__modal"
        :is-open="showModal"
        :backdrop-dismiss="false"
        @did-dismiss="cancelModal"
      >
        <AddAccountComponent
          :account="modalAccount"
          @dismiss="cancelModal"
          @saved="onModalSaved"
        />
      </ion-modal>

      <ion-alert
        :is-open="deleteConfirmAccount.open"
        :message="`¿Eliminar cuenta ${deleteConfirmAccount.accountName}?`"
        :buttons="getAlertButtonsAccount()"
        @did-dismiss="onDeleteAlertDidDismissAccount"
      ></ion-alert>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Imports
import { onMounted, ref, computed, unref, reactive } from 'vue';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonButton,
  IonList,
  IonListHeader,
  IonItemGroup,
  IonItemDivider,
  IonModal,
  IonAlert,
  IonButtons,
  IonIcon,
  IonCard,
  IonMenuButton,
  IonSearchbar,
} from '@ionic/vue';
import { addOutline, trashOutline } from 'ionicons/icons';
// End Imports

// Controllers
import systemController from '@/controllers/systemConfigController';
import accountsController from '@/controllers/accountsController';
// End Controllers

// Components
import AddAccountComponent from './modals/AddAccountComponent.vue';
// End Components

// Vars
const showModal = ref(false);
const modalAccount = ref<any | null>(null);
const searchTerm = ref('');
const deleteConfirmAccount = reactive({
  open: false,
  accountId: null as string | number | null,
  accountName: '' as string,
});

// End Vars

// Functions
function openModal() {
  modalAccount.value = null;
  showModal.value = true;
}

function edit(params: { account: Account | null }) {
  const { account } = params;
  modalAccount.value = account;
  showModal.value = true;
}

function cancelModal() {
  showModal.value = false;
  modalAccount.value = null;
}

function confirmRemoveAccount(params: {
  id: string | number | null | undefined;
  name?: string;
}) {
  const { id, name } = params;
  deleteConfirmAccount.open = true;
  deleteConfirmAccount.accountId = id ?? null;
  deleteConfirmAccount.accountName = name ?? '';
}

function getAlertButtonsAccount() {
  return [
    {
      text: 'Cancelar',
      role: 'cancel',
      handler: () => {},
    },
    {
      text: 'Eliminar',
      role: 'destructive',
      handler: () => {
        void removeAccountConfirmed();
      },
    },
  ];
}

async function removeAccountConfirmed() {
  const id = deleteConfirmAccount.accountId;
  deleteConfirmAccount.open = false;
  deleteConfirmAccount.accountId = null;
  deleteConfirmAccount.accountName = '';

  if (id == null) return;
  await remove(id as string | number);
}

function onDeleteAlertDidDismissAccount() {
  deleteConfirmAccount.open = false;
  deleteConfirmAccount.accountId = null;
  deleteConfirmAccount.accountName = '';
}

async function onModalSaved(payload: AccountFormData) {
  if (!payload) return;
  if (payload.id != null) {
    await accountsController.updateAccount({ account: payload as AccountFormData });
  } else {
    await accountsController.addAccount({ account: payload as AccountFormData });
  }

  cancelModal();
  await accountsController.loadAll();
}

async function remove(params: { id: IDBValidKey | undefined }) {
  const { id } = params;
  if (id == null) return;
  await accountsController.deleteAccount({ id });
  await accountsController.loadAll();
}

// End Functions

// Life cycle
onMounted(() => {
  accountsController.loadAll();
});

// End Life cycle

// Computed
const designMode = computed(() => systemController.getDesignMode());

const accounts = computed(() => accountsController.getAccounts());

const filteredAccounts = computed(() => {
  const term = (searchTerm.value || '').toString().toLowerCase().trim();
  const list = accounts.value || [];
  if (!term) return list;
  return list.filter((a: Account) => {
    const name = (a.name || '').toString().toLowerCase();
    return name.includes(term);
  });
});

const groupedAccounts = computed(() => {
  const list = (filteredAccounts.value || []).slice();
  list.sort((a: Account, b: Account) => {
    const na = (a.name || '').toString().toLowerCase();
    const nb = (b.name || '').toString().toLowerCase();
    return na.localeCompare(nb);
  });

  const map = new Map<string, any[]>();
  list.forEach((a: Account) => {
    const name = (a.name || '').toString().trim();
    const letter = name ? name[0].toUpperCase() : '#';
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(a);
  });

  return Array.from(map.keys())
    .sort()
    .map(letter => ({ letter, items: map.get(letter) || [] }));
});

// End Computed

// Watch
</script>

<style scoped>
.accounts__content {
  height: calc(100% - 117px);
  overflow-y: auto;
}

.account-actions {
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms ease;
}

ion-item:hover .account-actions,
ion-item:focus-within .account-actions {
  opacity: 1;
  pointer-events: auto;
}

@media (pointer: fine) {
  ion-item:hover .account-actions,
  ion-item:focus-within .account-actions {
    opacity: 1;
    pointer-events: auto;
  }
}

@media (pointer: coarse) {
  .account-actions {
    opacity: 1;
    pointer-events: auto;
  }
}

@media (min-width: 426px) and (max-width: 768px) {
}

@media (min-width: 769px) and (max-width: 1024px) {
}

@media (min-width: 1025px) and (max-width: 1440px) {
  .accounts__modal {
    --height: 80dvh;
  }
}

@media (min-width: 1441px) {
  .accounts__modal {
    --height: 80dvh;
  }
}
</style>
