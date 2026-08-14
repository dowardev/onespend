<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

# Budget Add Popover + Providers en Inicio - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El botón "+" en la pestaña inicio muestra un popover con opciones "Registro" y "Proveedores". Los proveedores creados se muestran en la tabla de inicio mezclados con los entries.

**Architecture:** Se modifica `InicioViewComponent.vue` para agregar el popover y un computed que mezcla entries + providers ordenados cronológicamente. Se agrega campo `createdAt` al tipo `Provider`.

**Tech Stack:** Ionic Vue, TypeScript, Pinia

---

## File Structure

- **Modify:** `front/src/stores/budgetStore.ts` — agregar campo `createdAt` al tipo `Provider`
- **Modify:** `front/src/views/budget/entries/InicioViewComponent.vue` — agregar popover y computed unificado

---

### Task 1: Agregar campo `createdAt` al tipo Provider

**Files:**
- Modify: `front/src/stores/budgetStore.ts:35-59`

- [ ] **Step 1: Agregar campo `createdAt` al tipo Provider**

En el archivo `front/src/stores/budgetStore.ts`, buscar la interfaz `Provider` (líneas 35-59) y agregar el campo `createdAt: number`:

```ts
export interface Provider {
  id: string | number;
  sync_id?: string;
  serverId?: number | null;
  name: string;
  date: string;
  estimated: number;
  accountId: number;
  efectivo: number;
  tarjeta: number;
  credito: number;
  products?: BudgetProviderProduct[];
  items?: Array<{ amount: number; accountId: string | number | null }>;
  notes: string;
  visited: boolean;
  synced_at?: number;
  createdAt?: number; // AGREGAR ESTE CAMPO
  _justAdded?: boolean;
  _fromTemplate?: boolean;
  _pendingProducts?: BudgetProviderProduct[];
  _supplierKey?: string;
  _supplierId?: string | number;
  _supplierName?: string;
  _supplierProducts?: BudgetProviderProduct[];
  _supplier?: Supplier;
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/stores/budgetStore.ts
git commit -m "feat: add createdAt field to Provider type"
```

---

### Task 2: Modificar InicioViewComponent.vue - Agregar popover y computed unificado

**Files:**
- Modify: `front/src/views/budget/entries/InicioViewComponent.vue`

- [ ] **Step 1: Agregar imports del popover**

En la sección de imports (líneas 130-160), agregar:

```ts
import {
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonListHeader,
  IonLabel,
  IonButton,
  IonIcon,
  IonItem,
  IonCard,
  IonCardTitle,
  IonCardContent,
  IonPopover,    // AGREGAR
  IonContent,    // AGREGAR
  IonList as IonPopoverList, // AGREGAR (renombrar para evitar conflicto con IonList)
} from '@ionic/vue';
import {
  addOutline,
  informationCircleOutline,
  documentTextOutline, // AGREGAR - icono para Registro
  peopleOutline,      // AGREGAR - icono para Proveedores
} from 'ionicons/icons';
```

- [ ] **Step 2: Agregar template del popover después del cierre de ion-grid**

Antes de la línea `</template>` (línea 127), después del `</ion-grid>`, agregar:

```html
  <!-- Popover para Add -->
  <ion-popover
    trigger="add-btn"
    trigger-action="click"
    side="bottom"
    alignment="end"
    dismiss-on-select
  >
    <ion-content>
      <ion-list lines="none">
        <ion-item button @click="handleRegistroClick" :disabled="isDayClosed">
          <ion-icon :icon="documentTextOutline" slot="start"></ion-icon>
          <ion-label>Registro</ion-label>
        </ion-item>
        <ion-item button @click="handleProveedoresClick" :disabled="isDayClosed">
          <ion-icon :icon="peopleOutline" slot="start"></ion-icon>
          <ion-label>Proveedores</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-popover>
</template>
```

- [ ] **Step 3: Modificar el botón "+" para abrir el popover**

Buscar (líneas 9-11):
```html
<ion-button :disabled="isDayClosed" @click="navigateToNewEntry">
  <ion-icon :icon="addOutline"></ion-icon>
</ion-button>
```

Reemplazar por:
```html
<ion-button :disabled="isDayClosed" id="add-btn">
  <ion-icon :icon="addOutline"></ion-icon>
</ion-button>
```

- [ ] **Step 4: Agregar la interfaz UnifiedItem**

En la sección de imports de tipos (después de línea 159), agregar:

```ts
// Interface y tipos
interface UnifiedItem {
  id: string | number
  name: string
  amount: number
  date: string
  type: 'entry' | 'provider'
  entryType?: 'ingreso' | 'egreso'
  accountId?: string | number | null
  createdAt: number
  _providerName?: string
}
```

- [ ] **Step 5: Modificar el computed renderedEntries para incluir providers**

Buscar el computed `renderedEntries` (líneas 283-289):

```ts
const renderedEntries = computed(() => {
  const entries =
    isDayClosed.value && frozenSnapshot.value
      ? frozenSnapshot.value.entries
      : budgetController.getEntries();
  return entries.map((item: Income) => ({ type: 'item', item }));
});
```

Reemplazar por:

```ts
const unifiedItems = computed((): UnifiedItem[] => {
  // Obtener entries
  const entries: Income[] =
    isDayClosed.value && frozenSnapshot.value
      ? frozenSnapshot.value.entries
      : budgetController.getEntries();

  // Obtener providers del día seleccionado
  const selectedDateStr = String(budgetController.getSelectedDate() || '').slice(0, 10);
  const providers: Provider[] = budgetController.getProviders().filter(
    (p: Provider) => String(p.date || '').slice(0, 10) === selectedDateStr
  );

  // Mapear entries a UnifiedItem
  const entryItems: UnifiedItem[] = entries.map((entry: Income) => ({
    id: entry.id,
    name: entry._providerName || entry.name || '-',
    amount: entry.amount || 0,
    date: entry.date,
    type: 'entry',
    entryType: entry.entryType,
    accountId: entry.accountId,
    createdAt: entry.createdAt || 0,
    _providerName: entry._providerName,
  }));

  // Mapear providers a UnifiedItem
  const providerItems: UnifiedItem[] = providers.map((provider: Provider) => ({
    id: provider.id,
    name: provider._supplierName || provider.name || '-',
    amount: Number(provider.efectivo || 0) + Number(provider.tarjeta || 0),
    date: provider.date,
    type: 'provider',
    accountId: provider.accountId,
    createdAt: provider.createdAt || Date.now(),
    _providerName: provider._supplierName,
  }));

  // Combinar y ordenar cronológicamente por createdAt
  return [...entryItems, ...providerItems].sort(
    (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
  );
});

const renderedEntries = computed(() => {
  return unifiedItems.value.map((item: UnifiedItem) => ({
    type: 'unified',
    item,
  }));
});
```

- [ ] **Step 6: Modificar el template para usar los nuevos datos**

El template actual usa `block.item` como `Income`. Ahora necesita diferenciar entre entry y provider.

Buscar las líneas del v-for (34-72) que renderizan cada item:

```html
<template
  v-for="(block, bIdx) in renderedEntries"
  :key="blockKey(block, bIdx)"
>
  <ion-item
    v-if="block.type === 'item'"
    ...
    @click="navigateToEditEntry(block.item)"
  >
    <ion-label>
      {{ block.item._providerName || block.item.name || '-' }}
      <p>{{ formatTimeLocal(block.item.createdAt) }}</p>
    </ion-label>

    <ion-label
      slot="end"
      class="ion-text-end"
      :style="`color: ${block.item.entryType === 'egreso' ? 'var(--ion-color-danger)' : 'var(--ion-color-success)'}`"
    >
      {{ formatCurrencyLocal({ v: block.item.amount || 0 }) }}

      <p>
        {{ getEntryAccountInfo(block.item).name }}:
        {{
          formatCurrencyLocal({
            v: getAccountRemaining(
              getEntryAccountInfo(block.item).accountId,
              block.item.id
            ),
          })
        }}
      </p>
    </ion-label>
  </ion-item>
</template>
```

Reemplazar por:

```html
<template
  v-for="(block, bIdx) in renderedEntries"
  :key="blockKey(block, bIdx)"
>
  <ion-item
    v-if="block.type === 'unified'"
    :lines="bIdx === renderedEntries.length - 1 ? 'none' : 'full'"
    class="transparent"
    button
    :disabled="isDayClosed"
    @click="handleUnifiedItemClick(block.item)"
  >
    <ion-label>
      {{ block.item.name }}
      <p>{{ formatTimeLocal(block.item.createdAt) }}</p>
    </ion-label>

    <ion-label
      slot="end"
      class="ion-text-end"
      :style="`color: ${getItemColor(block.item)}`"
    >
      {{ formatCurrencyLocal({ v: block.item.amount || 0 }) }}

      <p v-if="block.item.type === 'entry'">
        {{ getEntryAccountInfo(block.item as any).name }}:
        {{
          formatCurrencyLocal({
            v: getAccountRemaining(
              getEntryAccountInfo(block.item as any).accountId,
              block.item.id
            ),
          })
        }}
      </p>
      <p v-else>
        Proveedor
      </p>
    </ion-label>
  </ion-item>
</template>
```

- [ ] **Step 7: Agregar funciones para manejar los clicks y colores**

En la sección Functions (después de línea 315), agregar:

```ts
function handleRegistroClick() {
  router.push('/budget/entry/new');
}

function handleProveedoresClick() {
  router.push('/budget/provider/new');
}

function handleUnifiedItemClick(item: UnifiedItem) {
  if (item.type === 'entry') {
    router.push(`/budget/entry/edit?entryId=${item.id}`);
  } else {
    router.push(`/budget/provider/edit?providerId=${item.id}`);
  }
}

function getItemColor(item: UnifiedItem): string {
  if (item.type === 'provider') {
    return 'var(--ion-color-warning)';
  }
  return item.entryType === 'egreso'
    ? 'var(--ion-color-danger)'
    : 'var(--ion-color-success)';
}
```

- [ ] **Step 8: Commit**

```bash
git add front/src/views/budget/entries/InicioViewComponent.vue
git commit -m "feat: add popover to add button and mix providers with entries in inicio tab"
```

---

### Task 3: Verificar que budgetController.addProvider asigna createdAt

**Files:**
- Modify: `front/src/controllers/budgetController.ts`

- [ ] **Step 1: Verificar que addProvider asigna createdAt**

Buscar el método `addProvider` en `budgetController.ts` (líneas 351-432 aproximadamente). Verificar que al crear un provider se asigna `createdAt: Date.now()`.

Si no existe, agregar:

```ts
const newProvider: Provider = {
  id: generateId(),
  sync_id: generateSyncId(),
  name: params.name,
  estimated: Number(params.estimated) || 0,
  accountId: Number(params.accountId),
  efectivo: Number(params.efectivo) || 0,
  tarjeta: Number(params.tarjeta) || 0,
  credito: Number(params.credito) || 0,
  items: params.items || [],
  products: params.products || [],
  notes: params.notes || '',
  visited: false,
  date: params.date || this.getSelectedDate(),
  createdAt: Date.now(), // AGREGAR ESTO
  _supplierId: params._supplierId,
  _supplierName: params._supplierName,
};
```

- [ ] **Step 2: Commit**

```bash
git add front/src/controllers/budgetController.ts
git commit -m "feat: add createdAt timestamp when creating provider"
```

---

## Verificación

Para verificar que funciona:

1. Ejecutar `pnpm run dev:front` y navegar a `http://localhost:8102/#/budget`
2. En la pestaña "Inicio", hacer click en el botón "+"
3. Verificar que aparece el popover con "Registro" y "Proveedores"
4. Click en "Proveedores" -> navegar a `/budget/provider/new`
5. Crear un provider y guardar
6. Volver a la pestaña inicio y verificar que el provider aparece en la lista mezclado con los entries
7. Verificar que el provider se muestra con color diferente (warning/amarillo)
8. Click en el provider navega a la página de edición del provider

---

## Notas

- El campo `createdAt` en Provider es opcional (`createdAt?`) porque providers existentes en IndexedDB pueden no tener este campo — el computed usa `provider.createdAt || Date.now()` como fallback.
- La pestaña "Proveedores" en BudgetView se eliminará manualmente por el usuario.
