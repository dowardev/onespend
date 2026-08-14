<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

# Provider Type Select - Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el ion-segment (Inicio/Productos) en ProviderEditPage.vue con un ion-select (Simple/Múltiple) que cambie dinámicamente el contenido del formulario.

**Architecture:** Reemplazar segment con select usando v-if condicional. Simple muestra 1 item (cantidad + cuenta). Múltiple muestra productos con cantidades + items por cuenta.

**Tech Stack:** Vue 3, Ionic Vue, TypeScript

---

### Task 1: Agregar imports de IonSelect

**Files:**
- Modify: `front/src/views/budget/suppliers/ProviderEditPage.vue:441-450`

- [ ] **Step 1: Agregar IonSelect e IonSelectOption a imports**

Agregar después de IonSegment, IonSegmentButton:
```ts
IonSelect,
IonSelectOption,
```

- [ ] **Step 2: Agregar icon si es necesario**

No se necesita icono nuevo.

- [ ] **Step 3: Commit**

```bash
git add front/src/views/budget/suppliers/ProviderEditPage.vue
git commit -m "feat: add IonSelect imports for provider type select"
```

---

### Task 2: Agregar estado expenseType y computed hasProviderProducts

**Files:**
- Modify: `front/src/views/budget/suppliers/ProviderEditPage.vue:571-665`

- [ ] **Step 1: Agregar variable expenseType**

En la sección "vars and const", reemplazar `const selectedSegment = ref('inicio');` por:
```ts
const expenseType = ref<'simple' | 'multiple'>('simple');
```

- [ ] **Step 2: Agregar computed hasProviderProducts**

Agregar después de `filteredAccounts` computed (línea 864):
```ts
const hasProviderProducts = computed(() => {
  return selectedProvider.value?.products?.length > 0;
});
```

- [ ] **Step 3: Commit**

```bash
git add front/src/views/budget/suppliers/ProviderEditPage.vue
git commit -m "feat: add expenseType state and hasProviderProducts computed"
```

---

### Task 3: Reemplazar ion-segment por ion-select en template

**Files:**
- Modify: `front/src/views/budget/suppliers/ProviderEditPage.vue:71-81`

- [ ] **Step 1: Reemplazar ion-segment por ion-select**

Reemplazar:
```html
<div v-if="!isEntryMode" class="ion-padding-start ion-padding-end">
  <ion-segment v-model="selectedSegment" scrollable>
    <ion-segment-button value="inicio">
      <ion-label>Inicio</ion-label>
    </ion-segment-button>

    <ion-segment-button value="productos">
      <ion-label>Productos</ion-label>
    </ion-segment-button>
  </ion-segment>
</div>
```

Por:
```html
<ion-item
  v-if="!isEntryMode"
  class="transparent"
  lines="none"
>
  <ion-label>Tipo de gasto</ion-label>
  <ion-select
    v-model="expenseType"
    interface="popover"
    slot="end"
    style="width: auto"
  >
    <ion-select-option value="simple">Simple</ion-select-option>
    <ion-select-option value="multiple">Múltiple</ion-select-option>
  </ion-select>
</ion-item>
```

- [ ] **Step 2: Commit**

```bash
git add front/src/views/budget/suppliers/ProviderEditPage.vue
git commit -m "feat: replace ion-segment with ion-select for expense type"
```

---

### Task 4: Agregar watcher para cambio de tipo y lógica de.provider sin productos

**Files:**
- Modify: `front/src/views/budget/suppliers/ProviderEditPage.vue:831-832`

- [ ] **Step 1: Agregar watcher para expenseType**

En la sección "watch", agregar:
```ts
watch(expenseType, (newType, oldType) => {
  if (newType === 'simple' && oldType === 'multiple') {
    // Multiple -> Simple: colapsar a un item, limpiar productos
    items.value = items.value.slice(0, 1);
    providerProducts.value = [];
  }
  // Simple -> Multiple: mantener items, productos quedan vacíos (ya es el default)
});
```

- [ ] **Step 2: Agregar watcher para selectedProvider**

Cuando cambie el proveedor, verificar si tiene productos:
```ts
watch(selectedProvider, (newProvider) => {
  if (newProvider && !hasProviderProducts.value && expenseType.value === 'multiple') {
    // Proveedor sin productos en modo multiple -> forzar a simple
    expenseType.value = 'simple';
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add front/src/views/budget/suppliers/ProviderEditPage.vue
git commit -m "feat: add watchers for expenseType and provider changes"
```

---

### Task 5: Modificar condiciones v-if para Simple (sección cantidad + cuenta única)

**Files:**
- Modify: `front/src/views/budget/suppliers/ProviderEditPage.vue:84-189`

- [ ] **Step 1: Cambiar condición de la sección de items**

Cambiar:
```html
<template v-if="!isEntryMode && selectedSegment === 'inicio'">
```

Por:
```html
<template v-if="!isEntryMode && expenseType === 'simple'">
```

- [ ] **Step 2: Modificar la sección para modo Simple (un solo item sin botón +)**

Reemplazar todo el contenido de la sección (líneas 84-189) con la versión Simple:
```html
<template v-if="!isEntryMode && expenseType === 'simple'">
  <div class="ion-padding-start ion-padding-end">
    <ion-list class="transparent">
      <ion-list-header>
        <ion-label>Monto</ion-label>
      </ion-list-header>

      <ion-card class="shadow1">
        <ion-item lines="full" class="transparent">
          <ion-input
            v-model="items[0].amount"
            label="Cantidad"
            label-placement="floating"
            type="number"
            placeholder="0"
            :class="{
              'ion-invalid': isAmountInvalid({ index: 0 }),
              'ion-touched': isAmountTouched({ index: 0 }),
            }"
            :error-text="getAmountError({ index: 0 })"
          ></ion-input>
        </ion-item>

        <ion-item
          lines="full"
          class="transparent"
          button
          @click="openAccountModal(0)"
        >
          <ion-label>
            Cuenta
            <p>
              {{
                getAccountName(items[0].accountId) ||
                'Seleccionar cuenta'
              }}
            </p>
          </ion-label>
        </ion-item>
      </ion-card>
    </ion-list>
  </div>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add front/src/views/budget/suppliers/ProviderEditPage.vue
git commit -v "feat: add simple mode section with single item"
```

---

### Task 6: Modificar condición para sección de productos (Modo Múltiple)

**Files:**
- Modify: `front/src/views/budget/suppliers/ProviderEditPage.vue:192-251`

- [ ] **Step 1: Cambiar condición de sección de productos**

Cambiar:
```html
<div
  v-if="!isEntryMode && selectedSegment === 'productos'"
  class="ion-margin-top"
>
```

Por:
```html
<div
  v-if="!isEntryMode && expenseType === 'multiple'"
  class="ion-margin-top"
>
```

- [ ] **Step 2: Agregar products coverage warning entre productos y items por cuenta**

El warning de coverage (líneas 96-134) ya está incluido en la sección de inicio. En modo múltiple, debe mostrarse después de los productos y antes de los items por cuenta. Mover el block de coveragewarning a la sección de múltiples, o ya está en la posición correcta.

- [ ] **Step 3: Commit**

```bash
git add front/src/views/budget/suppliers/ProviderEditPage.vue
git commit -m "feat: update products section condition for multiple mode"
```

---

### Task 7: Modificar condición para items por cuenta (Modo Múltiple)

**Files:**
- Modify: `front/src/views/budget/suppliers/ProviderEditPage.vue:84-189`

- [ ] **Step 1: La sección de items por cuenta ya se modificó en Task 5**

El bloque completo de items por cuenta ahora está bajo `expenseType === 'simple'` en Task 5. Para Múltiple, necesitamos una versión separada que incluya:
- Warning de cobertura de productos
- Items por cuenta (con botón +)

- [ ] **Step 2: Crear nueva sección para items por cuenta en modo Multiple**

Después de la sección de productos (líneas 251), agregar:
```html
<template v-if="!isEntryMode && expenseType === 'multiple'">
  <!-- Products coverage warning -->
  <div
    v-if="hasProductsWithQuantity"
    class="ion-padding-start ion-padding-end ion-margin-bottom"
  >
    <ion-item
      lines="none"
      :class="
        productsCoverage.falta > 0
          ? 'border-warning'
          : 'border-success'
      "
      style="margin-top: 8px"
    >
      <ion-icon
        slot="start"
        :icon="
          productsCoverage.falta > 0
            ? warningOutline
            : checkmarkCircleOutline
        "
        :color="
          productsCoverage.falta > 0 ? 'warning' : 'success'
        "
      ></ion-icon>
      <ion-label
        :color="
          productsCoverage.falta > 0 ? 'warning' : 'success'
        "
      >
        <h3>Productos: {{ formatPrice(productsTotal) }}</h3>

        <p v-if="productsCoverage.falta > 0">
          Faltante: {{ formatPrice(productsCoverage.falta) }}
        </p>

        <p v-else>Cubierto</p>
      </ion-label>
    </ion-item>
  </div>

  <!-- Items por cuenta (igual que antes) -->
  <div class="ion-padding-start ion-padding-end">
    <ion-list class="transparent">
      <ion-list-header>
        <ion-label>Distribución por Cuenta</ion-label>

        <ion-button :disabled="!canAddMoreItems" @click="addItem">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-button>
      </ion-list-header>

      <template v-for="(item, index) in items" :key="index">
        <ion-card class="shadow1">
          <div
            v-if="items.length > 1"
            style="display: flex; justify-content: flex-end"
          >
            <ion-button
              fill="clear"
              size="small"
              @click="removeItem({ index })"
            >
              <ion-icon
                :icon="closeOutline"
                color="danger"
              ></ion-icon>
            </ion-button>
          </div>

          <ion-item lines="full" class="transparent">
            <ion-input
              v-model="item.amount"
              label="Cantidad"
              label-placement="floating"
              type="number"
              placeholder="0"
              :class="{
                'ion-invalid': isAmountInvalid({ index }),
                'ion-touched': isAmountTouched({ index }),
              }"
              :error-text="getAmountError({ index })"
            ></ion-input>
          </ion-item>

          <ion-item
            lines="full"
            class="transparent"
            button
            @click="openAccountModal(index)"
          >
            <ion-label>
              Cuenta
              <p>
                {{
                  getAccountName(item.accountId) ||
                  'Seleccionar cuenta'
                }}
              </p>
            </ion-label>
          </ion-item>
        </ion-card>
      </template>
    </ion-list>
  </div>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add front/src/views/budget/suppliers/ProviderEditPage.vue
git commit -m "feat: add items-by-account section for multiple mode"
```

---

### Task 8: Actualizar isFormValid para considerar ambos modos

**Files:**
- Modify: `front/src/views/budget/suppliers/ProviderEditPage.vue:914-919`

- [ ] **Step 1: Modificar isFormValid computed**

Reemplazar:
```ts
const isFormValid = computed(() => {
  if (isEntryMode.value) {
    return isItemsValid.value;
  }
  return selectedProvider.value != null && isItemsValid.value;
});
```

Por:
```ts
const isFormValid = computed(() => {
  if (isEntryMode.value) {
    return isItemsValid.value;
  }
  if (!selectedProvider.value) return false;
  
  if (expenseType.value === 'simple') {
    // Simple: un item con cantidad y cuenta
    const firstItem = items.value[0];
    const amount = Number(firstItem?.amount);
    const hasAccount = firstItem?.accountId != null;
    return amount > 0 && hasAccount;
  }
  
  // Multiple: productos con cantidad Y items válidos
  const hasProductsWithQty = providerProducts.value.some(p => (p.quantity || 0) > 0);
  return hasProductsWithQty && isItemsValid.value;
});
```

- [ ] **Step 2: Commit**

```bash
git add front/src/views/budget/suppliers/ProviderEditPage.vue
git commit -m "feat: update isFormValid for simple and multiple modes"
```

---

### Task 9: Testing manual

- [ ] **Step 1: Abrir la página de agregar proveedor (/budget/provider/new)**

- [ ] **Step 2: Verificar que se muestra el select "Tipo de gasto" con opción Simple por defecto**

- [ ] **Step 3: Seleccionar un proveedor SIN productos → Solo debe mostrar Simple (Multiple deshabilitado)**

- [ ] **Step 4: Seleccionar un proveedor CON productos → Debe permitir cambiar a Múltiple**

- [ ] **Step 5: En Simple: verificar que muestra solo 1 item (cantidad + cuenta), sin botón +**

- [ ] **Step 6: En Multiple: verificar que muestra productos con cantidades, y debajo items por cuenta**

- [ ] **Step 7: Cambiar Simple → Multiple: debe mantener items, productos vacíos**

- [ ] **Step 8: Cambiar Multiple → Simple: debe colapsar a 1 item**

- [ ] **Step 9: Guardar y verificar que los datos se persisten correctamente**

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "test: manual testing of provider type select feature"
```

---

## Spec Coverage Checklist

| Requisito del Spec | Task |
|--------------------|------|
| Ion-select como reemplazo del segment | Task 3 |
| Variables expenseType y hasProviderProducts | Task 2 |
| Lógica Simple → Multiple | Task 4 |
| Lógica Multiple → Simple | Task 4 |
| Proveedor sin productos → force Simple | Task 4 |
| Sección Simple (1 item) | Task 5 |
| Sección Multiple (productos + items) | Tasks 6, 7 |
| isFormValid para ambos modos | Task 8 |
| Testing manual | Task 9 |
