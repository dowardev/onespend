# Provider Type Select - Diseño

## Objetivo

Reemplazar el `ion-segment` (Inicio/Productos) en la página de agregar/editar proveedor (`ProviderEditPage.vue`) con un `ion-select` que permita elegir entre "Simple" (monto directo) o "Múltiple" (productos con cantidades), con la opción Múltiple habilitada solo si el proveedor tiene productos registrados.

## Problema Actual

El `ion-segment` actual tiene dos tabs:
- **Inicio**: Cantidades por cuenta (múltiples items)
- **Productos**: Lista de productos del proveedor con cantidades

El usuario debe navegar entre tabs para configurar productos y luego cuentas. El flujo no es intuitivo.

## Solución Propuesta

Reemplazar el segment con un `ion-select` "Tipo de gasto" que cambia dinámicamente el contenido mostrado:

### Opción Simple
- Un solo item con:
  - Input de cantidad (monto)
  - Selector de cuenta
- Sin botón de "+" para agregar más items
- Sin productos

### Opción Múltiple
- Paso 1: Lista de productos del proveedor con inputs de cantidad
- Paso 2: Total calculado (suma de precio × cantidad)
- Paso 3: Sección de items por cuenta para distribuir el total (con botón "+")

## Requisitos

### 1. Ion-Select como reemplazo del Segment

**Ubicación**: Reemplazar las líneas 71-81 del `ProviderEditPage.vue`:
```html
<!-- Segment for full mode -->
<div v-if="!isEntryMode" class="ion-padding-start ion-padding-end">
  <ion-segment v-model="selectedSegment">
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
<ion-item v-if="!isEntryMode" class="transparent">
  <ion-label>Tipo de gasto</ion-label>
  <ion-select
    v-model="expenseType"
    :disabled="expenseType === 'multiple' && !hasProviderProducts"
    interface="popover"
    slot="end"
  >
    <ion-select-option value="simple">Simple</ion-select-option>
    <ion-select-option
      value="multiple"
      :disabled="!hasProviderProducts"
    >
      Múltiple
    </ion-select-option>
  </ion-select>
</ion-item>
```

### 2. Variables de estado

Agregar:
```ts
const expenseType = ref<'simple' | 'multiple'>('simple');
```

Reemplazar `selectedSegment` por `expenseType`.

### 3. Computed para verificar productos del proveedor

```ts
const hasProviderProducts = computed(() => {
  return selectedProvider.value?.products?.length > 0;
});
```

### 4. Lógica de cambio de tipo

**Simple → Múltiple**:
- Mostrar productos con cantidad 0
- Mantener items por cuenta existentes

**Múltiple → Simple**:
- Collapsar a un solo item (primero de la lista)
- Limpiar productos

**Al seleccionar proveedor sin productos**:
- Si está en "Múltiple", forzar cambio a "Simple"

### 5. Modo Simple (simple section)

Reemplazar la sección de inicio (líneas 84-189) con condición `expenseType === 'simple'`:

```html
<template v-if="!isEntryMode && expenseType === 'simple'">
  <div class="ion-padding-start ion-padding-end">
    <ion-list class="transparent">
      <ion-card class="shadow1">
        <ion-item lines="full" class="transparent">
          <ion-input
            v-model="items[0].amount"
            label="Cantidad"
            label-placement="floating"
            type="number"
            placeholder="0"
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
            <p>{{ getAccountName(items[0].accountId) || 'Seleccionar cuenta' }}</p>
          </ion-label>
        </ion-item>
      </ion-card>
    </ion-list>
  </div>
</template>
```

### 6. Modo Múltiple (multiple section)

La sección de productos (líneas 192-251) se muestra cuando `expenseType === 'multiple'`:
- Productos con inputs de cantidad
- Warning de cobertura
- Items por cuenta para distribuir

### 7. Items por cuenta en Múltiple

La sección existente de "Cantidades por Cuenta" (líneas 84-189) ahora solo se muestra en modo Múltiple:
```html
<template v-if="!isEntryMode && expenseType === 'multiple'">
```

### 8. Validación del formulario

El `isFormValid` computed debe actualizarse para considerar ambos modos:
- **Simple**: Un item con cantidad > 0 y cuenta seleccionada
- **Múltiple**: Al menos un producto con cantidad > 0 Y items por cuenta válidos

### 9. Iconos necesarios

Agregar imports:
```ts
import { listOutline } from 'ionicons/icons';
```

## Comportamiento Esperado

| Escenario | Resultado |
|-----------|-----------|
| Nuevo proveedor sin productos | Solo opción Simple disponible |
| Nuevo proveedor con productos | Por defecto Simple, puede cambiar a Múltiple |
| Cambiar Simple → Múltiple | Mantiene items, muestra productos vacíos |
| Cambiar Múltiple → Simple | Collapsa a 1 item, limpia productos |
| Seleccionar proveedor sin productos en Múltiple | Auto-cambia a Simple |

## Archivos a modificar

- `front/src/views/budget/suppliers/ProviderEditPage.vue`

## Pendiente (fuera de scope)

- Cambios en el backend
- Modificaciones en otros componentes
- Tests automatizados (se agregarán en el plan)